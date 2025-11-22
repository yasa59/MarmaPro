// client/src/pages/Notifications.jsx
import { useEffect, useState, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import api from "../api/axios";
import { getSocket } from "../lib/socket";
import toast from "../components/Toast";

export default function NotificationsPage() {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const socketRef = useRef(null);
  const role = localStorage.getItem("role") || "user";

  async function load() {
    setLoading(true); setErr("");
    try {
      // Get all notifications
      const { data } = await api.get("/notifications?limit=50");
      const notifications = Array.isArray(data?.items) ? data.items : [];
      setNotifications(notifications);
      
      if (import.meta.env.DEV) {
        console.log("📬 Notifications loaded:", {
          role,
          count: notifications.length,
          items: notifications,
          fullResponse: data,
        });
        
        // Log notification types for debugging
        if (notifications.length > 0) {
          console.log("📋 Notification types found:", {
            connect_request: notifications.filter(n => n.type === 'connect_request').length,
            instructions_sent: notifications.filter(n => n.type === 'instructions_sent').length,
            allTypes: [...new Set(notifications.map(n => n.type))],
          });
        } else {
          console.warn("⚠️ No notifications found for current user");
        }
      }
    } catch (e) {
      if (import.meta.env.DEV) {
        console.error("❌ Failed to load notifications:", {
          error: e?.response || e,
          status: e?.response?.status,
          message: e?.response?.data?.message || e.message,
        });
      }
      setErr(e?.response?.data?.message || e.message);
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { 
    load();
    // Poll for new notifications every 10 seconds
    const interval = setInterval(load, 10000);
    
    // Setup Socket.IO for real-time updates
    const token = localStorage.getItem("token");
    if (token) {
      const socket = getSocket();
      if (!socket.connected) {
        socket.connect();
      }
      socketRef.current = socket;

      // Listen for new notifications
      const handleNewNotification = () => {
        // Reload notifications when new ones arrive
        load();
      };

      // Listen for instruction notifications
      socket.on("session:instructions", handleNewNotification);
      socket.on("session:connect", handleNewNotification);
      socket.on("connect_request", handleNewNotification);

      return () => {
        clearInterval(interval);
        socket.off("session:instructions", handleNewNotification);
        socket.off("session:connect", handleNewNotification);
        socket.off("connect_request", handleNewNotification);
      };
    }
    
    return () => clearInterval(interval);
  }, []);

  async function markAsRead(notificationId) {
    try {
      await api.post("/notifications/mark-read", { ids: [notificationId] });
      setNotifications(prev => prev.map(n => 
        n._id === notificationId ? { ...n, read: true } : n
      ));
    } catch (e) {
      if (import.meta.env.DEV) {
        console.error("Failed to mark as read:", e);
      }
    }
  }

  async function markAllAsRead() {
    try {
      await api.post("/notifications/mark-read", {});
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    } catch (e) {
      toast.error(e?.response?.data?.message || e.message);
    }
  }

  function getNotificationLink(notification) {
    if (notification.meta?.sessionId) {
      // Determine if user or doctor based on notification type
      if (notification.type === 'instructions_sent' || notification.type === 'connect_accepted') {
        return `/user/session/${notification.meta.sessionId}`;
      } else if (notification.type === 'connect_request') {
        return `/doctor/session/${notification.meta.sessionId}`;
      }
    }
    if (notification.meta?.connectionId) {
      return `/doctor/alerts`;
    }
    return null;
  }

  function handleStartTherapy(notification) {
    if (notification.meta?.sessionId) {
      navigate(`/doctor/session/${notification.meta.sessionId}`);
    } else if (notification.meta?.connectionId) {
      navigate(`/doctor/alerts`);
    }
  }

  function getNotificationIcon(type) {
    switch (type) {
      case 'instructions_sent':
        return '📋';
      case 'connect_request':
        return '🔔';
      case 'connect_accepted':
        return '✅';
      case 'user_connect':
      case 'doctor_connect':
        return '🔗';
      default:
        return '📬';
    }
  }

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl md:text-2xl font-semibold text-white">Notifications</h1>
          {unreadCount > 0 && (
            <div className="text-sm text-slate-300 mt-1">
              {unreadCount} unread notification{unreadCount !== 1 ? 's' : ''}
            </div>
          )}
        </div>
        <div className="flex gap-2">
          {unreadCount > 0 && (
            <button 
              onClick={markAllAsRead} 
              className="btn btn-ghost px-6 py-3 text-sm"
            >
              <span className="relative z-10">Mark all read</span>
            </button>
          )}
          <button onClick={load} className="btn btn-outline px-6 py-3">
            <span className="relative z-10">Refresh</span>
          </button>
        </div>
      </div>

      <div className="rounded-3xl border border-white/25 bg-gradient-to-br from-slate-900/80 to-slate-800/70 backdrop-blur p-4">
        {err && <div className="mb-3 text-sm text-rose-400">{err}</div>}

        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="rounded-2xl p-4 border border-white/20 animate-pulse bg-white/5 h-20" />
            ))}
          </div>
        ) : notifications.length === 0 ? (
          <div className="p-6 text-slate-300 text-center">No notifications yet.</div>
        ) : (
          <div className="space-y-3">
            {notifications.map((notif, idx) => {
              const link = getNotificationLink(notif);
              const NotificationContent = (
                <motion.div
                  key={notif._id}
                  initial={{ y: 8, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: idx * 0.03 }}
                  className={`rounded-2xl border p-4 transition ${
                    notif.read 
                      ? 'border-white/10 bg-white/5' 
                      : 'border-emerald-500/30 bg-emerald-900/20 shadow-lg'
                  } hover:bg-white/10`}
                  onClick={() => !notif.read && markAsRead(notif._id)}
                >
                  <div className="flex gap-3">
                    <div className="text-2xl">{getNotificationIcon(notif.type)}</div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <div className={`font-semibold ${notif.read ? 'text-white/80' : 'text-white'}`}>
                          {notif.message}
                        </div>
                        {!notif.read && (
                          <div className="w-2 h-2 rounded-full bg-emerald-400" />
                        )}
                      </div>
                      <div className="text-xs text-slate-400 mt-1">
                        {notif.createdAt ? new Date(notif.createdAt).toLocaleString() : "—"}
                      </div>
                      {notif.type === 'instructions_sent' && notif.meta?.sessionId && (
                        <div className="mt-2">
                          <div className="text-xs text-emerald-300 bg-emerald-500/20 px-2 py-1 rounded-full inline-block">
                            Click to view instructions
                          </div>
                        </div>
                      )}
                      {/* Show "Start Therapy" button for doctors when they receive connect_request */}
                      {role === 'doctor' && notif.type === 'connect_request' && notif.meta?.sessionId && (
                        <div className="mt-3">
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              handleStartTherapy(notif);
                            }}
                            className="px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold text-sm transition shadow-sm"
                          >
                            Start Therapy Session
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              );

              return link ? (
                <Link key={notif._id} to={link} className="block">
                  {NotificationContent}
                </Link>
              ) : (
                NotificationContent
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
