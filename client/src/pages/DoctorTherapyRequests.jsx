// client/src/pages/DoctorTherapyRequests.jsx
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import api from "../api/axios";

export default function DoctorTherapyRequests() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const { data } = await api.get("/sessions/inbox");
      setRows(Array.isArray(data?.items) ? data.items : []);
    } catch (e) {
      alert(e?.response?.data?.message || e.message);
    } finally {
      setLoading(false);
    }
  }

  async function accept(id) {
    try {
      await api.patch(`/sessions/${id}/accept`);
      setRows(prev => prev.map(r => r.id === id ? { ...r, status: "accepted" } : r));
    } catch (e) {
      alert(e?.response?.data?.message || e.message);
    }
  }

  useEffect(() => { load(); }, []);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl md:text-2xl font-semibold text-white">Therapy Requests</h1>
        <button onClick={load} className="px-3 py-2 rounded-2xl border bg-white/80 hover:bg-white transition">Refresh</button>
      </div>

      <div className="rounded-3xl border border-white/30 bg-white/70 backdrop-blur p-4">
        {loading ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => <div key={i} className="rounded-2xl p-4 border animate-pulse bg-white/70 h-44" />)}
          </div>
        ) : rows.length === 0 ? (
          <div className="p-8 text-slate-600 text-center">No session requests.</div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {rows.map((r, idx) => (
              <motion.div key={r.id} initial={{ y: 8, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: idx * 0.03 }}
                className="group rounded-2xl border bg-white/80 hover:bg-white transition p-4 shadow-sm hover:shadow-md">
                <div className="flex gap-3">
                  {r.user?.avatar
                    ? <img src={r.user.avatar} className="w-12 h-12 rounded-xl object-cover border" />
                    : <div className="w-12 h-12 rounded-xl bg-slate-200" />}
                  <div className="flex-1">
                    <div className="font-semibold">{r.user?.name || "Patient"}</div>
                    <div className="text-xs text-slate-500">{r.user?.email || "—"}</div>
                    <div className="text-xs text-slate-600 mt-1">
                      {(r.user?.gender ? `${r.user.gender} · ` : "")}{r.user?.age ? `${r.user.age}y` : ""}
                    </div>
                    <div className="text-xs text-slate-500 mt-1">Requested: {r.createdAt ? new Date(r.createdAt).toLocaleString() : "—"}</div>
                  </div>
                </div>

                {r.feetPhotoUrl && (
                  <img src={r.feetPhotoUrl} className="mt-3 h-28 w-full object-cover rounded-xl border" />
                )}

                <div className="mt-3 flex gap-2">
                  {r.status === "pending" ? (
                    <button onClick={() => accept(r.id)} className="px-3 py-2 rounded-2xl border bg-emerald-600 text-white hover:bg-emerald-700">
                      Accept
                    </button>
                  ) : (
                    <span className="px-3 py-2 rounded-2xl border bg-emerald-100 text-emerald-700 text-sm">Accepted</span>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
