// server/socket/utils.js
const jwt = require("jsonwebtoken");

function verifySocketAuth(socket, next) {
  try {
    // token can come from socket.auth or query
    const { token } = socket.handshake.auth || socket.handshake.query || {};
    if (!token) return next(new Error("Auth token missing"));

    const payload = jwt.verify(token, process.env.JWT_SECRET);
    socket.user = { id: payload.id, role: payload.role || "user" };
    next();
  } catch (e) {
    next(new Error("Invalid auth"));
  }
}

module.exports = { verifySocketAuth };
