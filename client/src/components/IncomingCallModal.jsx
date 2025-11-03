// client/src/components/IncomingCallModal.jsx
import { motion, AnimatePresence } from "framer-motion";

export default function IncomingCallModal({ open, info, onAccept, onDecline }) {
  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[1000] grid place-items-center bg-black/50 backdrop-blur">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="w-[92vw] max-w-sm rounded-2xl border border-white/20 bg-slate-900/90 text-white p-5 shadow-2xl"
          >
            <div className="text-sm text-white/70 mb-1">Incoming call</div>
            <div className="text-xl font-semibold">
              {info?.from?.name || "Unknown"} <span className="text-white/60 text-sm">({info?.from?.role})</span>
            </div>
            <div className="text-xs text-white/60 mt-1">
              {info?.at ? new Date(info.at).toLocaleTimeString() : ""}
            </div>

            <div className="mt-4 flex gap-2">
              <button
                onClick={onAccept}
                className="flex-1 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 transition font-semibold"
              >
                Accept
              </button>
              <button
                onClick={onDecline}
                className="px-3 py-2 rounded-xl border border-white/30 hover:bg-white/10 transition"
              >
                Decline
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
