// client/src/components/StatusBadge.jsx
import { motion } from "framer-motion";

export default function StatusBadge({ status }) {
  const map = {
    pending: "bg-amber-100 text-amber-800 border-amber-200",
    approved: "bg-emerald-100 text-emerald-800 border-emerald-200",
    rejected: "bg-rose-100 text-rose-800 border-rose-200",
  };
  const cls = map[status] || "bg-slate-100 text-slate-800 border-slate-200";
  const label = status || "unknown";

  return (
    <motion.span
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className={`inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-xl border ${cls}`}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current/70" />
      {label}
    </motion.span>
  );
}
