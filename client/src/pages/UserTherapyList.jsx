// client/src/pages/UserTherapyList.jsx
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import api from "../api/axios";
import fileUrl from "../utils/fileUrl";
import toast from "../components/Toast";

export default function UserTherapyList() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const { data } = await api.get("/sessions/mine");
      setRows(Array.isArray(data?.items) ? data.items : []);
    } catch (e) {
      toast.error(e?.response?.data?.message || e.message);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { load(); }, []);

  return (
    <div className="p-3 sm:p-4 md:p-6 space-y-4 md:space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl md:text-2xl font-semibold text-slate-900 dark:text-white">My Therapy Sessions</h1>
        <button
          onClick={load}
          className="btn btn-outline px-6 py-3"
        >
          <span className="relative z-10">Refresh</span>
        </button>
      </div>

      <div className="rounded-3xl border border-slate-300 dark:border-white/20 bg-slate-50/90 dark:bg-white/5 backdrop-blur p-4">
        {loading ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="rounded-2xl p-4 border border-white/15 animate-pulse bg-white/10 h-32" />
            ))}
          </div>
        ) : rows.length === 0 ? (
          <div className="p-8 text-slate-700 dark:text-slate-300 text-center">
            No sessions yet. Open a doctor profile and press <b>Request Therapy</b>.
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {rows.map((r, idx) => {
              const d = r.doctor || {};
              // Check for profile photo from multiple sources
              const profilePhoto = d.avatar || d.avatarUrl || d.profilePhoto || null;
              const thumb = profilePhoto ? fileUrl(profilePhoto) : (r.feetPhotoUrl ? fileUrl(r.feetPhotoUrl) : null);
              const created = r.createdAt ? new Date(r.createdAt).toLocaleString() : "";
              const statusLabel = (r.status || "").replace(/_/g, " ");

              return (
                <motion.div
                  key={r.id}
                  initial={{ y: 8, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: idx * 0.03, duration: 0.2 }}
                  className="card rounded-2xl p-4 text-slate-900 dark:text-white"
                  whileHover={{ scale: 1.02, y: -4 }}
                >
                  <Link to={`/user/session/${r.id}`} className="flex gap-3">
                    {thumb ? (
                      <img
                        src={thumb}
                        alt={d.name || "Doctor"}
                        className="w-12 h-12 rounded-xl object-cover ring-2 ring-slate-300 dark:ring-white/20"
                        onError={(e) => {
                          e.target.style.display = 'none';
                          if (e.target.nextSibling) {
                            e.target.nextSibling.style.display = 'flex';
                          }
                        }}
                      />
                    ) : null}
                    {!thumb && (
                      <div className="w-12 h-12 rounded-xl bg-slate-200 dark:bg-white/10 flex items-center justify-center text-slate-600 dark:text-white/50 text-xs">
                        {d.name?.[0]?.toUpperCase() || "D"}
                      </div>
                    )}

                    <div className="flex-1 text-slate-900 dark:text-white">
                      <div className="font-semibold">{d.name || "Doctor"}</div>
                      <div className="text-xs text-slate-700 dark:text-slate-300">{d.email || "—"}</div>
                      {d.specialization && (
                        <div className="text-xs text-slate-600 dark:text-slate-400 mt-1">{d.specialization}</div>
                      )}
                      <div className="mt-2 text-xs text-slate-700 dark:text-slate-300">
                        Status: <b className="text-slate-900 dark:text-white">{statusLabel || "—"}</b>
                        {created && <span className="text-slate-600 dark:text-slate-400"> · {created}</span>}
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
