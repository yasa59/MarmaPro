// client/src/context/SocketContext.jsx
import { createContext, useContext, useEffect, useMemo } from "react";
import { io } from "socket.io-client";
import { useAuth } from "./AuthContext";

const SocketCtx = createContext(null);
export const useSocket = () => useContext(SocketCtx);

export default function SocketProvider({ children }) {
  const { user } = useAuth();

  const socket = useMemo(() => {
    if (!user?.token) return null;
    return io("http://localhost:5000", {
      transports: ["websocket"],
      auth: { token: user.token },
    });
  }, [user?.token]);

  useEffect(() => {
    if (!socket) return;
    return () => { socket.disconnect(); };
  }, [socket]);

  return <SocketCtx.Provider value={socket}>{children}</SocketCtx.Provider>;
}
