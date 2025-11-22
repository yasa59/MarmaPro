// api/index.js - Vercel Serverless Function Entry Point
// This file adapts your Express app for Vercel's serverless functions

require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const morgan = require('morgan');
const path = require('path');
const fs = require('fs');
const cors = require('cors');

// ----- Allowed origins (used by CORS) -----
const allowedOrigins = new Set([
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  process.env.FRONTEND_URL,
  process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null,
].filter(Boolean));

// ----- App -----
const app = express();

// Connect to MongoDB (cached connection for serverless)
let cachedDb = null;

async function connectToDatabase() {
  if (cachedDb && mongoose.connection.readyState === 1) {
    return cachedDb;
  }

  const uri = process.env.MONGO_URI || 'mongodb://localhost:27017/iMarmaTherapy';
  
  try {
    const opts = {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    };
    
    await mongoose.connect(uri, opts);
    cachedDb = mongoose.connection;
    console.log('✅ MongoDB connected (serverless)');
    return cachedDb;
  } catch (e) {
    console.error('❌ MongoDB connection failed:', e.message);
    throw e;
  }
}

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
if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'));
}

app.use(cors({
  origin: (origin, cb) => cb(null, !origin || allowedOrigins.has(origin)),
  credentials: true,
}));

/* ---------- Static uploads (for Vercel, use /tmp or external storage) ---------- */
// Note: Vercel serverless functions have limited file system access
// Consider using Vercel Blob Storage or AWS S3 for production
const uploadsDir = path.join('/tmp', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  try {
    fs.mkdirSync(uploadsDir, { recursive: true });
  } catch (e) {
    console.warn('Could not create uploads directory:', e.message);
  }
}
app.use('/uploads', express.static(uploadsDir));

/* ---------- Health check with DB connection ---------- */
app.get('/api/health', async (_req, res) => {
  try {
    await connectToDatabase();
    res.json({ ok: true, db: 'connected' });
  } catch (e) {
    res.status(503).json({ ok: false, db: 'disconnected', error: e.message });
  }
});

/* ---------- Routes: require BEFORE mounting ---------- */
// Use absolute path resolution for routes
const routesPath = path.resolve(__dirname, '..', 'server', 'routes');

const authRoutes = require(path.resolve(routesPath, 'auth.js'));
const doctorRoutes = require(path.resolve(routesPath, 'doctors.js'));
const photoRoutes = require(path.resolve(routesPath, 'photos.js'));
const therapyRoutes = require(path.resolve(routesPath, 'therapy.js'));
const roomRoutes = require(path.resolve(routesPath, 'rooms.js'));
const assessmentRoutes = require(path.resolve(routesPath, 'assessments.js'));
const patientsRoutes = require(path.resolve(routesPath, 'patients.js'));
const sessionsRoutes = require(path.resolve(routesPath, 'sessions.js'));
const notificationsRoutes = require(path.resolve(routesPath, 'notifications.js'));
const userRoutes = require(path.resolve(routesPath, 'user.js'));
const profileRoutes = require(path.resolve(routesPath, 'profile.js'));
const callRoutes = require(path.resolve(routesPath, 'call.js'));
const iceRoutes = require(path.resolve(routesPath, 'ice.js'));
const adminRoutes = require(path.resolve(routesPath, 'admin.js'));

// Middleware to ensure DB connection before routes
app.use(async (req, res, next) => {
  try {
    await connectToDatabase();
    next();
  } catch (e) {
    res.status(503).json({ error: 'Database connection failed', message: e.message });
  }
});

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
app.use('/api/admin', adminRoutes);

// Note: Socket.IO is NOT supported in Vercel serverless functions
// Real-time features will need a separate service (e.g., Pusher, Ably, or a separate server)

// Export for Vercel
module.exports = app;

