// server/realtime.js
const http = require('http');
const { Server } = require('socket.io');

/**
 * Plug this into your existing Express app:
 *   const server = http.createServer(app);
 *   const io = setupRealtime(server);
 *   server.listen(PORT)
 *
 * Or run standalone with a basic HTTP server.
 */

function setupRealtime(server, opts = {}) {
  const io = new Server(server, {
    cors: {
      origin: opts.corsOrigin || '*',
      methods: ['GET', 'POST']
    }
  });

  // Room -> Set(socket.id)
  const roomMembers = new Map();

  io.on('connection', (socket) => {
    // Client says: I want to join a room
    socket.on('join-room', async ({ roomId, userId, role, token }) => {
      // TODO: Verify token & authorization here (doctor-user pair only).
      // If unauthorized: return socket.emit('error', 'unauthorized');

      socket.data = { roomId, userId, role };
      socket.join(roomId);

      if (!roomMembers.has(roomId)) roomMembers.set(roomId, new Set());
      roomMembers.get(roomId).add(socket.id);

      // Notify others someone joined
      socket.to(roomId).emit('peer-joined', { socketId: socket.id, userId, role });

      // Tell the joiner who is already in the room
      const others = [...roomMembers.get(roomId)].filter(id => id !== socket.id);
      socket.emit('room-peers', { peers: others });

      // Presence
      io.to(roomId).emit('presence', {
        members: [...roomMembers.get(roomId)]
      });
    });

    // WebRTC Signaling relay
    socket.on('webrtc-offer', ({ to, description }) => {
      io.to(to).emit('webrtc-offer', { from: socket.id, description });
    });

    socket.on('webrtc-answer', ({ to, description }) => {
      io.to(to).emit('webrtc-answer', { from: socket.id, description });
    });

    socket.on('webrtc-ice-candidate', ({ to, candidate }) => {
      io.to(to).emit('webrtc-ice-candidate', { from: socket.id, candidate });
    });

    // Chat
    socket.on('chat-message', ({ roomId, text, from }) => {
      io.to(roomId).emit('chat-message', {
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        text,
        from,
        at: Date.now()
      });
    });

    socket.on('typing', ({ roomId, from, isTyping }) => {
      socket.to(roomId).emit('typing', { from, isTyping });
    });

    // Media state (mute/cam off)
    socket.on('media-state', ({ roomId, kind, enabled }) => {
      socket.to(roomId).emit('media-state', {
        socketId: socket.id,
        kind,
        enabled
      });
    });

    // Leaving
    socket.on('disconnect', () => {
      const roomId = socket.data?.roomId;
      if (roomId && roomMembers.has(roomId)) {
        roomMembers.get(roomId).delete(socket.id);
        if (roomMembers.get(roomId).size === 0) {
          roomMembers.delete(roomId);
        } else {
          socket.to(roomId).emit('peer-left', { socketId: socket.id });
          io.to(roomId).emit('presence', {
            members: [...roomMembers.get(roomId)]
          });
        }
      }
    });
  });

  return io;
}

module.exports = { setupRealtime };