// client/src/pages/DoctorAlerts.jsx
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import api from "../api/axios";
import CallButton from "../components/CallButton";

export default function DoctorAlerts() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  async function load() {
    setLoading(true);
    setErr("");
    try {
      const { data } = await api.get("/doctors/alerts");
      setItems(Array.isArray(data?.items) ? data.items : []);
    } catch (e) {
      const msg =
        e?.response?.data?.message ||
        `${e?.response?.status || ""} ${e?.response?.statusText || ""}`.trim() ||
        e.message;
      console.error("Load doctor alerts failed:", e?.response || e);
      setErr(msg);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function respond(connectionId, action) {
    try {
      await api.post("/doctors/alerts/respond", { connectionId, action }); // 'accept' | 'reject'
      await load();
    } catch (e) {
      const msg =
        e?.response?.data?.message ||
        `${e?.response?.status || ""} ${e?.response?.statusText || ""}`.trim() ||
        e.message;
      console.error("Respond error:", e?.response || e);
      alert(`Failed to ${action}: ${msg}`);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl md:text-2xl font-semibold text-white">Therapy Requests</h1>
        <button
          onClick={load}
          className="px-3 py-2 rounded-2xl border border-white/20 bg-white/10 text-white hover:bg-white/20 transition"
        >
          Refresh
        </button>
      </div>

      {/* Card container */}
      <div className="rounded-3xl border border-white/10 bg-gradient-to-b from-slate-900/70 to-slate-800/60 backdrop-blur p-4 text-white shadow-xl">
        {err && (
          <div className="mb-3 text-sm text-rose-300">
            {err}
          </div>
        )}

        {/* Loading skeletons */}
        {loading && (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="rounded-2xl p-4 border border-white/10 bg-slate-900/40 animate-pulse"
              >
                <div className="h-12 w-12 bg-slate-700/60 rounded-xl mb-3" />
                <div className="h-3 bg-slate-700/60 rounded w-1/2 mb-2" />
                <div className="h-3 bg-slate-700/60 rounded w-1/3 mb-4" />
                <div className="h-9 bg-slate-700/60 rounded w-full" />
              </div>
            ))}
          </div>
        )}

        {/* Empty state */}
        {!loading && items.length === 0 && (
          <div className="p-8 text-slate-300 text-center">No pending requests.</div>
        )}

        {/* Items */}
        <AnimatePresence mode="popLayout">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((it, idx) => {
              const u = it.user || {}; // { id, name, email, gender, age }
              const thumb = it.photo?.annotated || it.photo?.raw || null;
              const when = it.requestedAt ? new Date(it.requestedAt).toLocaleString() : "—";

              return (
                <motion.div
                  key={it.id}
                  layout
                  initial={{ y: 8, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: 8, opacity: 0 }}
                  transition={{ delay: idx * 0.03 }}
                  className="group rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 transition p-4 shadow-lg hover:shadow-2xl"
                >
                  <div className="flex items-start gap-3">
                    {thumb ? (
                      <img
                        src={thumb}
                        alt="foot"
                        className="w-14 h-14 rounded-xl object-cover ring-2 ring-white/30"
                      />
                    ) : (
                      <div className="w-14 h-14 rounded-xl bg-slate-700/60" />
                    )}
                    <div className="flex-1">
                      <div className="font-semibold text-white/95">{u.name || "Patient"}</div>
                      <div className="text-xs text-white/70">{u.email || ""}</div>
                      <div className="text-xs text-white/70 mt-1">
                        {(u.gender ? `${u.gender} · ` : "")}{u.age ? `${u.age}y` : ""}
                      </div>
                      <div className="text-xs text-white/50 mt-1">
                        Requested: {when}
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      onClick={() => respond(it.id, "accept")}
                      className="px-3 py-2 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white transition shadow-sm"
                    >
                      Accept
                    </button>
                    <button
                      onClick={() => respond(it.id, "reject")}
                      className="px-3 py-2 rounded-2xl border border-white/20 hover:bg-white/10 transition"
                    >
                      Reject
                    </button>

                    {/* Optional quick connect (useful right after accepting) */}
                    {u.id && (
                      <CallButton partnerId={u.id} label="Connect now" variant="outline" />
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </AnimatePresence>
      </div>
    </div>
  );
}
