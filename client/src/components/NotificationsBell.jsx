// client/src/components/NotificationsBell.jsx
import { useEffect, useState, useRef } from "react";
import { Link, useLocation } from "react-router-dom";
import api from "../api/axios";
import { getSocket } from "../lib/socket";

export default function NotificationsBell(){
  const [count, setCount] = useState(0);
  const loc = useLocation();
  const socketRef = useRef(null);

  async function load(){
    try{
      const { data } = await api.get("/notifications/unread-count");
      setCount(data.count || 0);
    }catch{
      // ignore (likely not logged in)
    }
  }

  useEffect(()=>{
    load();                // initial
    const id = setInterval(load, 20000); // poll every 20s
    
    // Setup Socket.IO for real-time updates
    const token = localStorage.getItem("token");
    if (token) {
      const socket = getSocket();
      if (!socket.connected) {
        socket.connect();
      }
      socketRef.current = socket;

      // Listen for new notifications and reload count
      const handleNewNotification = () => {
        load();
      };

      socket.on("session:instructions", handleNewNotification);
      socket.on("session:connect", handleNewNotification);

      return () => {
        clearInterval(id);
        socket.off("session:instructions", handleNewNotification);
        socket.off("session:connect", handleNewNotification);
      };
    }
    
    return () => clearInterval(id);
  }, [loc.pathname]); // reload after navigating

  return (
    <Link to="/notifications" className="relative inline-flex items-center justify-center p-2 rounded-full hover:bg-white/10 transition focus:outline-none focus:ring-2 focus:ring-white/40">
      {/* bell icon (SVG) */}
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" className="text-white">
        <path d="M14 20a2 2 0 1 1-4 0" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
        <path d="M6 10a6 6 0 1 1 12 0v3.2c0 .7.28 1.37.78 1.86l.6.6c.63.63.18 1.74-.7 1.74H5.32c-.88 0-1.33-1.1-.7-1.74l.6-.6c.5-.5.78-1.17.78-1.86V10z" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
      </svg>
      {count > 0 && (
        <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1 rounded-full bg-pink-500 text-white text-xs font-bold grid place-items-center animate-bounce">
          {count}
        </span>
      )}
    </Link>
  );
}
