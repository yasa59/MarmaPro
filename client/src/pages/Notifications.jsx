// client/src/pages/Notifications.jsx
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import api from "../api/axios";

export default function NotificationsPage() {
  const [invites, setInvites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  async function load() {
    setLoading(true); setErr("");
    try {
      // Only showing doctor->user invites here (clean + simple)
      const { data } = await api.get("/doctors/invites");
      setInvites(Array.isArray(data?.items) ? data.items : []);
    } catch (e) {
      setErr(e?.response?.data?.message || e.message);
      setInvites([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function respond(connectionId, action) {
    try {
      await api.post("/doctors/invites/respond", { connectionId, action });
      setInvites(prev => prev.filter(x => x.id !== connectionId));
    } catch (e) {
      alert(e?.response?.data?.message || e.message);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl md:text-2xl font-semibold text-white">Alerts</h1>
        <button onClick={load} className="px-3 py-2 rounded-2xl border border-white/30 bg-white/10 text-white hover:bg-white/20 transition">
          Refresh
        </button>
      </div>

      <div className="rounded-3xl border border-white/25 bg-gradient-to-br from-slate-900/80 to-slate-800/70 backdrop-blur p-4">
        {err && <div className="mb-3 text-sm text-rose-400">{err}</div>}

        {loading ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="rounded-2xl p-4 border border-white/20 animate-pulse bg-white/5 h-40" />
            ))}
          </div>
        ) : invites.length === 0 ? (
          <div className="p-6 text-slate-300">No new invites.</div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {invites.map((it, idx) => (
              <motion.div
                key={it.id}
                initial={{ y: 8, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: idx * 0.03 }}
                className="rounded-2xl border border-white/20 bg-white/5 hover:bg-white/10 transition p-4 shadow-sm"
              >
                <div className="flex gap-3">
                  {it.doctor?.avatar ? (
                    <img
                      src={it.doctor.avatar}
                      alt=""
                      className="w-12 h-12 rounded-xl object-cover ring-2 ring-white/30"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-xl bg-white/10" />
                  )}
                  <div className="flex-1">
                    <div className="font-semibold text-white">{it.doctor?.name || "Doctor"}</div>
                    <div className="text-xs text-slate-300">{it.doctor?.email || ""}</div>
                    <div className="text-xs text-slate-400 mt-1">
                      Invited: {it.requestedAt ? new Date(it.requestedAt).toLocaleString() : "—"}
                    </div>
                    {it.doctor?.specialization && (
                      <div className="text-xs text-slate-300 mt-1">
                        {it.doctor.specialization}
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-4 flex gap-2">
                  <button
                    onClick={() => respond(it.id, "accept")}
                    className="px-3 py-2 rounded-2xl bg-emerald-600 text-white hover:bg-emerald-700 transition"
                  >
                    Accept
                  </button>
                  <button
                    onClick={() => respond(it.id, "reject")}
                    className="px-3 py-2 rounded-2xl border border-white/30 text-white hover:bg-white/10 transition"
                  >
                    Reject
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
