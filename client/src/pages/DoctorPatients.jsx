// client/src/pages/DoctorPatients.jsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import api from "../api/axios";
import CallButton from "../components/CallButton";

export default function DoctorPatients() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const nav = useNavigate();

  async function load() {
    setLoading(true);
    setErr("");
    try {
      const { data } = await api.get("/doctors/patients");
      setRows(Array.isArray(data?.patients) ? data.patients : []);
    } catch (e) {
      const msg = e?.response?.data?.message || e.message || "unknown_error";
      setErr(msg);
      alert("Failed to load patients");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function updateStatus(id, status) {
    try {
      const { data } = await api.patch(`/doctors/connections/${id}`, { status });
      // optimistic update
      setRows(prev => prev.map(r => r._id === id ? { ...r, status: data?.status || status } : r));
    } catch (e) {
      alert(e?.response?.data?.message || e.message);
    }
  }

  // 🔹 Start a therapy session for this patient
  async function startTherapy(userId) {
    try {
      if (!userId) throw new Error("Missing user id");
      const { data } = await api.post("/sessions/start", { userId });
      if (!data?.id) throw new Error("No session id");
      nav(`/doctor/session/${data.id}`);
    } catch (e) {
      alert(e?.response?.data?.message || e.message);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl md:text-2xl font-semibold text-white">My Patients</h1>
        <div className="flex gap-2">
          <button onClick={load} className="px-3 py-2 rounded-2xl border bg-white/80 hover:bg-white transition">
            Refresh
          </button>
        </div>
      </div>

      {err && (
        <div className="rounded-xl border border-rose-300/40 bg-rose-500/15 text-rose-100 px-3 py-2 text-sm">
          {err}
        </div>
      )}

      <div className="rounded-3xl border border-white/30 bg-white/70 backdrop-blur p-4">
        {loading && (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="rounded-2xl p-4 border animate-pulse bg-white/70">
                <div className="h-10 w-10 bg-slate-200 rounded-xl mb-3" />
                <div className="h-3 bg-slate-200 rounded w-1/2 mb-2" />
                <div className="h-3 bg-slate-200 rounded w-1/3 mb-4" />
                <div className="h-8 bg-slate-200 rounded w-full" />
              </div>
            ))}
          </div>
        )}

        {!loading && rows.length === 0 && (
          <div className="p-8 text-slate-600 text-center">No patients yet.</div>
        )}

        <AnimatePresence mode="popLayout">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {rows.map((r, idx) => {
              const u = r.user || {};
              return (
                <motion.div
                  key={r._id}
                  layout
                  initial={{ y: 8, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: 8, opacity: 0 }}
                  transition={{ delay: idx * 0.03 }}
                  className="group rounded-2xl border bg-white/80 hover:bg-white transition p-4 shadow-sm hover:shadow-md"
                >
                  <div className="flex items-start gap-3">
                    {u.avatarUrl ? (
                      <img src={u.avatarUrl} alt="" className="w-12 h-12 object-cover rounded-xl ring-2 ring-white/80" />
                    ) : (
                      <div className="w-12 h-12 rounded-xl bg-slate-200" />
                    )}
                    <div className="flex-1">
                      <div className="font-semibold">{u.name || "Patient"}</div>
                      <div className="text-xs text-slate-500">{u.email || "—"}</div>
                      <div className="text-xs text-slate-500 mt-1">
                        {u.gender ? `${u.gender} · ` : ""}{u.age ? `${u.age}y` : ""}
                      </div>
                      <div className="text-xs mt-1">
                        Status: <span className="font-medium">{r.status}</span>
                      </div>
                    </div>
                  </div>

                  {r.latestPhotoThumb && (
                    <img src={r.latestPhotoThumb} className="mt-3 w-full h-32 object-cover rounded-xl border" />
                  )}

                  <div className="mt-4 flex flex-wrap gap-2">
                    {r.status !== "approved" && (
                      <button
                        onClick={() => updateStatus(r._id, "approved")}
                        className="px-3 py-2 rounded-2xl border text-white bg-emerald-600 hover:bg-emerald-700 transition"
                      >
                        Approve
                      </button>
                    )}
                    {r.status !== "rejected" && (
                      <button
                        onClick={() => updateStatus(r._id, "rejected")}
                        className="px-3 py-2 rounded-2xl border text-white bg-rose-600 hover:bg-rose-700 transition"
                      >
                        Reject
                      </button>
                    )}

                    {/* 🔹 Start therapy (navigates to /doctor/session/:id) */}
                    <button
                      onClick={() => startTherapy(u._id || u.id)}
                      className="px-3 py-2 rounded-2xl bg-emerald-600 text-white hover:bg-emerald-700"
                    >
                      Start therapy
                    </button>

                    {/* Optional: your existing call button */}
                    {u._id && (
                      <CallButton partnerId={u._id} label="Connect" variant="outline" />
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
