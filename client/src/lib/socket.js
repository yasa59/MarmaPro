// client/src/lib/socket.js
import { io } from "socket.io-client";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000";

let socket;

export function getSocket() {
  const token = localStorage.getItem("token");
  if (!token) return null;

  if (socket && socket.connected) return socket;

  // Disconnect existing socket if token changed
  if (socket) {
    socket.disconnect();
    socket = null;
  }

  socket = io(API_BASE, {
    autoConnect: false,
    transports: ["websocket"],
    auth: {
      // send JWT so server socket auth passes
      token: token
    },
  });

  // keep auth fresh if token changes later
  socket.on("connect_error", (err) => {
    // useful when auth fails, etc.
    console.warn("socket connect_error:", err?.message || err);
  });

  socket.on("connect", () => {
    console.log("✅ Socket connected");
  });

  socket.on("disconnect", () => {
    console.log("❌ Socket disconnected");
  });

  return socket;
}
