// client/src/lib/callHub.js
import { io } from "socket.io-client";

// Minimal base; same as axios base WITHOUT "/api"
function getBase() {
  const raw =
    import.meta.env.VITE_SIGNALING_URL ||
    import.meta.env.VITE_API_BASE ||
    window.location.origin;
  return String(raw).replace(/\/$/, "");
}

const SIGNALING_PATH = import.meta.env.VITE_SIGNALING_PATH || "/call";

/**
 * Create a global socket connection to the call namespace and listen for incoming calls.
 * @param {{ onIncoming: (payload) => void }} opts
 * @returns {Socket} socket
 */
export function initCallHub(opts = {}) {
  const token = localStorage.getItem("token");
  if (!token) return null;

  const base = getBase();
  const socket = io(base + SIGNALING_PATH, {
    transports: ["websocket"],
    auth: { token },
  });

  socket.on("connect", () => {
    // connected to /call namespace; server joins personal room by userId
  });

  socket.on("incoming-call", (payload) => {
    // payload: { roomId, from:{id,name,role}, at }
    opts.onIncoming?.(payload);
  });

  return socket;
}
