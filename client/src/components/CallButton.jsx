// client/src/components/CallButton.jsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import api from "../api/axios";

export default function CallButton({
  partnerId,
  label = "Connect online",
  className = "",
  size = "md",        // "sm" | "md" | "lg"
  variant = "primary" // "primary" | "outline" | "soft"
}) {
  const nav = useNavigate();
  const [loading, setLoading] = useState(false);

  const pad =
    size === "sm" ? "px-3 py-1.5 text-sm"
    : size === "lg" ? "px-5 py-3 text-base"
    : "px-4 py-2.5";

  const base =
    "rounded-2xl font-medium inline-flex items-center gap-2 transition " +
    "focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-400";

  const look =
    variant === "outline"
      ? "border border-white/60 bg-white/30 hover:bg-white/70 backdrop-blur"
      : variant === "soft"
      ? "bg-sky-100/80 hover:bg-sky-100 text-sky-800 border border-sky-200"
      : // primary gradient
        "bg-gradient-to-r from-sky-500 via-indigo-500 to-emerald-500 " +
        "hover:from-sky-600 hover:via-indigo-600 hover:to-emerald-600 " +
        "text-white shadow-lg shadow-sky-500/20";

  async function start() {
    if (loading) return;
    if (!partnerId) {
      alert("Missing partner id.");
      return;
    }
    setLoading(true);
    try {
      // Ask the server to ensure the connection is approved, create/ensure room, and ring partner
      const { data } = await api.post("/call/room", { partnerId });
      const roomId = data?.roomId;
      if (!roomId) {
        // Fallback to param style if backend didn't return a roomId for some reason
        nav(`/call?partnerId=${partnerId}`);
        return;
      }
      // Go directly to the room
      nav(`/call/${roomId}`);
    } catch (e) {
      const msg = e?.response?.data?.message || e.message || "unknown_error";
      // Show precise reasons coming from server
      if (msg === "not_connected") {
        alert("Cannot call: you're not connected to this partner.");
      } else if (msg === "not_approved") {
        alert("Cannot call: connection exists but is not approved yet.");
      } else if (msg === "partner_required") {
        alert("Cannot call: partner missing.");
      } else if (msg === "partner_not_found") {
        alert("Cannot call: partner not found.");
      } else if (msg === "cannot_call_self") {
        alert("Cannot call yourself.");
      } else {
        alert(`Unable to start call: ${msg}`);
      }
      console.error("CallButton error:", e?.response?.data || e);
    } finally {
      setLoading(false);
    }
  }

  return (
    <motion.button
      type="button"
      onClick={start}
      disabled={!partnerId || loading}
      whileHover={{ y: -1, scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className={`${base} ${pad} ${look} disabled:opacity-60 ${className}`}
      title="Start live call"
    >
      <VideoIcon className="w-4 h-4 md:w-5 md:h-5" />
      {loading ? "Starting…" : label}
      <PulseDot active={!loading} />
    </motion.button>
  );
}

function VideoIcon({ className = "" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M15 10l6-4v12l-6-4v3a2 2 0 01-2 2H4a2 2 0 01-2-2V7a2 2 0 012-2h9a2 2 0 012 2v3z"
        stroke="currentColor"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function PulseDot({ active }) {
  return (
    <span className="relative inline-flex">
      <span className="w-2 h-2 rounded-full bg-white/90" />
      {active && (
        <span className="absolute inline-flex w-full h-full rounded-full bg-white/60 animate-ping opacity-75" />
      )}
    </span>
  );
}
