// client/src/pages/UserTherapyList.jsx
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import api from "../api/axios";

export default function UserTherapyList() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const { data } = await api.get("/sessions/mine");
      setRows(Array.isArray(data?.items) ? data.items : []);
    } catch (e) {
      alert(e?.response?.data?.message || e.message);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { load(); }, []);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl md:text-2xl font-semibold text-white">My Therapy Sessions</h1>
        <button
          onClick={load}
          className="btn btn-outline px-6 py-3"
        >
          <span className="relative z-10">Refresh</span>
        </button>
      </div>

      <div className="rounded-3xl border border-white/20 bg-white/5 backdrop-blur p-4">
        {loading ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="rounded-2xl p-4 border border-white/15 animate-pulse bg-white/10 h-32" />
            ))}
          </div>
        ) : rows.length === 0 ? (
          <div className="p-8 text-slate-300 text-center">
            No sessions yet. Open a doctor profile and press <b>Request Therapy</b>.
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {rows.map((r, idx) => {
              const d = r.doctor || {};
              const thumb = r.feetPhotoUrl || d.avatar || d.profilePhoto || null;
              const created = r.createdAt ? new Date(r.createdAt).toLocaleString() : "";
              const statusLabel = (r.status || "").replace(/_/g, " ");

              return (
                <motion.div
                  key={r.id}
                  initial={{ y: 8, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: idx * 0.03, duration: 0.2 }}
                  className="card rounded-2xl p-4"
                  whileHover={{ scale: 1.02, y: -4 }}
                >
                  <Link to={`/user/session/${r.id}`} className="flex gap-3">
                    {thumb ? (
                      <img
                        src={thumb}
                        alt=""
                        className="w-12 h-12 rounded-xl object-cover ring-2 ring-white/20"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-xl bg-white/10" />
                    )}

                    <div className="flex-1 text-white">
                      <div className="font-semibold">{d.name || "Doctor"}</div>
                      <div className="text-xs text-slate-300">{d.email || "—"}</div>
                      {d.specialization && (
                        <div className="text-xs text-slate-400 mt-1">{d.specialization}</div>
                      )}
                      <div className="mt-2 text-xs text-slate-300">
                        Status: <b className="text-white">{statusLabel || "—"}</b>
                        {created && <span className="text-slate-400"> · {created}</span>}
                      </div>
                    </div>
                  </Link>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
