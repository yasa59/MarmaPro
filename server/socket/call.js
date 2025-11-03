// server/socket/call.js
const jwt = require("jsonwebtoken");
const { verifySocketAuth } = require("./utils");

/**
 * Socket.IO "/call" namespace
 * - Auth via verifySocketAuth (your existing middleware)
 * - Also decodes JWT (fallback) to ensure socket.user is set
 * - On connect: joins a personal room == userId  (critical so REST can do io.of('/call').to(userId))
 * - Keeps your existing join/signal/chat/presence/leave handlers
 */
function registerCallNamespace(io) {
  const NS_PATH = process.env.SIGNALING_PATH || "/call";
  const nsp = io.of(NS_PATH);

  // Your existing middleware
  nsp.use(verifySocketAuth);

  nsp.use((socket, next) => {
    // Ensure socket.user is present (some verifySocketAuth variants only "allow" but don't attach)
    if (socket.user?.id) return next();

    try {
      const token = socket.handshake?.auth?.token;
      if (!token) return next(new Error("unauthorized"));
      const payload = jwt.verify(token, process.env.JWT_SECRET);
      socket.user = {
        id: String(payload.userId),
        role: payload.role,
        name: payload.name,
        email: payload.email,
      };
      return next();
    } catch (e) {
      return next(new Error("unauthorized"));
    }
  });

  nsp.on("connection", (socket) => {
    // 👇 Join personal room so REST can target this user: io.of('/call').to(userId).emit(...)
    const userId = socket.user?.id && String(socket.user.id);
    if (userId) socket.join(userId);

    // --- Your existing room & signaling logic ---
    socket.on("join", ({ roomId }) => {
      if (!roomId) return;
      socket.join(roomId);

      const peers = [...(nsp.adapter.rooms.get(roomId) || [])];
      socket.emit("peers", { peers: peers.filter((id) => id !== socket.id) });
      socket.to(roomId).emit("peer-joined", { id: socket.id });
    });

    socket.on("signal", ({ roomId, to, data }) => {
      if (!roomId || !to) return;
      nsp.to(to).emit("signal", { from: socket.id, data });
    });

    socket.on("chat", ({ roomId, text }) => {
      if (!roomId || !text?.trim()) return;
      nsp.to(roomId).emit("chat", { id: socket.id, text: text.trim(), ts: Date.now() });
    });

    socket.on("presence", ({ roomId, state }) => {
      if (!roomId) return;
      socket.to(roomId).emit("presence", { id: socket.id, state });
    });

    socket.on("leave", ({ roomId }) => {
      if (roomId) socket.leave(roomId);
      socket.emit("left", { roomId });
    });

    socket.on("disconnect", () => {
      for (const roomId of socket.rooms) {
        if (roomId !== socket.id) {
          socket.to(roomId).emit("peer-left", { id: socket.id });
        }
      }
    });
  });
}

module.exports = { registerCallNamespace };
