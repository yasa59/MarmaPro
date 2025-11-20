// server/server.js
require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const morgan = require('morgan');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const http = require('http');
const jwt = require('jsonwebtoken');
const { Server } = require('socket.io');

// ----- Allowed origins (used by CORS and Socket.IO) -----
const allowedOrigins = new Set([
  'http://localhost:5173',
  'http://127.0.0.1:5173',
]);

// ----- App -----
const app = express();

/* ---------- CORS gatekeeper (BEFORE everything else) ---------- */
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin && allowedOrigins.has(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

/* ---------- Standard middleware ---------- */
app.use(express.json({ limit: '10mb' }));
app.use(morgan('dev'));

// (optional) cors package (kept consistent with gatekeeper)
app.use(cors({
  origin: (origin, cb) => cb(null, !origin || allowedOrigins.has(origin)),
  credentials: true,
}));

/* ---------- Static uploads (IMPORTANT for showing images) ---------- */
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
app.use('/uploads', express.static(uploadsDir)); // serves /uploads/**

/* ---------- Health ---------- */
app.get('/api/health', (_req, res) => res.json({ ok: true }));

/* ---------- Routes: require BEFORE mounting ---------- */
const authRoutes         = require('./routes/auth');
const doctorRoutes       = require('./routes/doctors');
const photoRoutes        = require('./routes/photos');
const therapyRoutes      = require('./routes/therapy');
const roomRoutes         = require('./routes/rooms');
const assessmentRoutes   = require('./routes/assessments');
const patientsRoutes     = require('./routes/patients');
const sessionsRoutes     = require('./routes/sessions');
const notificationsRoutes = require('./routes/notifications');
const userRoutes         = require('./routes/user');
const profileRoutes      = require('./routes/profile');
const callRoutes         = require('./routes/call');
const iceRoutes          = require('./routes/ice');

/* ---------- Socket.IO setup (needed before routes) ---------- */
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: (origin, cb) => cb(null, !origin || allowedOrigins.has(origin)),
    credentials: true,
  },
});

// Make io available to routes
app.set('io', io);

/* ---------- Mount routes (AFTER middleware) ---------- */
app.use('/api/auth', authRoutes);
app.use('/api/doctors', doctorRoutes);
app.use('/api/photos', photoRoutes);
app.use('/api/therapy', therapyRoutes);
app.use('/api/rooms', roomRoutes);
app.use('/api/assessments', assessmentRoutes);
app.use('/api/patients', patientsRoutes);
app.use('/api/sessions', sessionsRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/user', userRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/call', callRoutes);
app.use('/api/ice', iceRoutes);

const adminRoutes = require('./routes/admin');
app.use('/api/admin', adminRoutes);

/* ---------- Socket.IO (chat + WebRTC signaling) ---------- */
// Models used by sockets
const Message = require('./models/Message');
const Room    = require('./models/Room');
const CallLog = require('./models/CallLog'); // call logs

// Socket auth using JWT from handshake
io.use((socket, next) => {
  try {
    const token =
      socket.handshake.auth?.token ||
      socket.handshake.headers?.authorization?.replace('Bearer ', '');
    if (!token) return next(new Error('no token'));

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.userId || decoded.id || decoded._id;
    if (!userId) return next(new Error('bad token payload'));

    socket.user = { userId, role: decoded.role };
    next();
  } catch (e) {
    next(e);
  }
});

io.on('connection', (socket) => {
  const me = socket.user.userId;

  // personal room (for notifications / ringing)
  socket.join(`user:${me}`);

  // --- join a chat/webrtc room ---
  socket.on('chat:join', ({ roomId }) => {
    if (roomId) socket.join(`room:${roomId}`);
  });

  // --- chat relay ---
  socket.on('chat:send', async ({ roomId, text }) => {
    try {
      if (!roomId || !text?.trim()) return;
      const room = await Room.findById(roomId);
      if (!room || !room.participants.map(String).includes(String(me))) return;

      const msg = await Message.create({ roomId, senderId: me, text });
      io.to(`room:${roomId}`).emit('chat:new', {
        _id: msg._id,
        roomId,
        senderId: me,
        text,
        createdAt: msg.createdAt,
      });
    } catch {
      /* ignore chat errors */
    }
  });

  // --- WebRTC signaling (offer/answer/candidate) ---
  socket.on('webrtc:signal', ({ roomId, data }) => {
    if (roomId && data) {
      socket.to(`room:${roomId}`).emit('webrtc:signal', { from: me, data });
    }
  });

  // -------------------------------
  // CALL UX: ring / accept / reject / end
  // -------------------------------

  // Let a specific user know they're being called
  socket.on('call:ring', ({ roomId, calleeUserId }) => {
    if (!roomId || !calleeUserId) return;
    io.to(`user:${calleeUserId}`).emit('call:incoming', { roomId, from: me });
  });

  // Callee accepts → notify caller; also ensure they join the room
  socket.on('call:accept', ({ roomId, callerUserId }) => {
    if (!roomId || !callerUserId) return;
    socket.join(`room:${roomId}`);
    io.to(`user:${callerUserId}`).emit('call:accepted', { roomId, by: me });
  });

  // Callee rejects
  socket.on('call:reject', ({ roomId, callerUserId }) => {
    if (!roomId || !callerUserId) return;
    io.to(`user:${callerUserId}`).emit('call:rejected', { roomId, by: me });
  });

  // Any side ends → broadcast + persist a log (best-effort)
  socket.on('call:end', async ({ roomId, otherUserId, startedAt, reason, meta }) => {
    if (!roomId || !otherUserId) return;

    io.to(`room:${roomId}`).emit('call:ended', { roomId, by: me, reason: reason || 'completed' });

    try {
      const endedAt = new Date();
      const dur = startedAt ? Math.max(0, Math.round((endedAt - new Date(startedAt)) / 1000)) : 0;

      await CallLog.create({
        roomId,
        callerId: me,  // choose semantics; you can also send role to decide
        calleeId: otherUserId,
        startedAt: startedAt ? new Date(startedAt) : new Date(Date.now() - dur * 1000),
        endedAt,
        durationSec: dur,
        reason: reason || 'completed',
        meta: meta || {}
      });
    } catch {
      // ignore log errors
    }
  });
});

/* ---------- Start ---------- */
(async function start() {
  const PORT = process.env.PORT || 5000;
  const uri = process.env.MONGO_URI || 'mongodb://localhost:27017/iMarmaTherapy';
  
  // Helper function to check MongoDB connection
  async function connectMongoDB() {
    try {
      console.log('🔄 Connecting to MongoDB...');
      const safeUri = uri.replace(/\/\/([^:]+):([^@]+)@/, '//$1:***@');
      console.log('   URI:', safeUri);
      
      await mongoose.connect(uri, {
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
      });
      console.log('✅ MongoDB connected successfully');
      return true;
    } catch (e) {
      console.error('\n❌ MongoDB connection failed:', e.message);
      return false;
    }
  }

  // Try to connect
  const connected = await connectMongoDB();
  
  if (!connected) {
    console.error('\n📋 MongoDB Setup Instructions:');
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.error('\n🔹 Option 1: Install MongoDB Locally (Windows)');
    console.error('   1. Download: https://www.mongodb.com/try/download/community');
    console.error('   2. Install MongoDB Community Server');
    console.error('   3. MongoDB should auto-start as a Windows service');
    console.error('   4. Restart this server: npm run dev');
    console.error('\n🔹 Option 2: Use MongoDB Atlas (Cloud - FREE)');
    console.error('   1. Go to: https://www.mongodb.com/cloud/atlas');
    console.error('   2. Sign up for free account');
    console.error('   3. Create a free cluster');
    console.error('   4. Click "Connect" → "Connect your application"');
    console.error('   5. Copy the connection string');
    console.error('   6. Create server/.env file with:');
    console.error('      MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/iMarmaTherapy');
    console.error('      PORT=5000');
    console.error('      JWT_SECRET=your-secret-key-here');
    console.error('   7. Restart server: npm run dev');
    console.error('\n🔹 Option 3: Use Docker (if installed)');
    console.error('   docker run -d -p 27017:27017 --name mongodb mongo:latest');
    console.error('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.error('\n⚠️  Server will start but API endpoints will fail without MongoDB.');
    console.error('   Fix MongoDB connection and restart the server.\n');
    
    // Still start the server but it won't work properly
    server.listen(PORT, () => {
      console.log(`🚀 API server started on http://localhost:${PORT}`);
      console.log('⚠️  WARNING: MongoDB not connected - API will not work!\n');
    });
    return;
  }

  // MongoDB connected successfully - start server normally
  server.listen(PORT, () => {
    console.log(`🚀 API server started on http://localhost:${PORT}`);
    console.log('✅ Ready to accept requests\n');
  });
})();
