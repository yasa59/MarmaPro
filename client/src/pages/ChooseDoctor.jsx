// client/src/pages/ChooseDoctor.jsx
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import api from "../api/axios";

function Modal({ open, onClose, doctor }) {
  if (!open || !doctor) return null;
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm grid place-items-center z-50">
      <div className="w-full max-w-2xl bg-white rounded-3xl p-5 shadow-xl">
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-lg font-semibold">Doctor Profile</h3>
          <button onClick={onClose} className="px-3 py-1 rounded-full border">Close</button>
        </div>
        <div className="flex gap-5">
          <div className="w-40">
            {doctor.profilePhoto ? (
              <img src={doctor.profilePhoto} className="w-40 h-40 object-cover rounded-2xl border" />
            ) : (
              <div className="w-40 h-40 rounded-2xl bg-slate-200" />
            )}
          </div>

          <div className="flex-1 space-y-1">
            <div className="text-xl font-semibold">{doctor.name}</div>
            <div className="text-sm text-slate-600">{doctor.email}</div>
            <div className="text-sm text-slate-700">
              {(doctor.gender ? `${doctor.gender} · ` : "")}{doctor.age ? `${doctor.age}y` : ""}
            </div>
            {doctor.specialization && <div className="text-sm"><b>Specialization:</b> {doctor.specialization}</div>}
            {doctor.qualifications && <div className="text-sm"><b>Qualifications:</b> {doctor.qualifications}</div>}
            {doctor.bio && <div className="text-sm"><b>Bio:</b> {doctor.bio}</div>}
            {doctor.documentPath && (
              <div className="pt-2">
                <a href={doctor.documentPath} target="_blank" rel="noreferrer" className="underline text-blue-600">
                  View uploaded document
                </a>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ChooseDoctor() {
  const [q, setQ] = useState("");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState(null);

  async function load() {
    setLoading(true);
    try {
      const { data } = await api.get(`/doctors/public?q=${encodeURIComponent(q)}`);
      setRows(Array.isArray(data?.items) ? data.items : []);
    } catch (e) {
      alert(e?.response?.data?.message || e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  async function viewProfile(id) {
    try {
      const { data } = await api.get(`/doctors/${id}/profile`);
      setSelected(data);
      setOpen(true);
    } catch (e) {
      alert(e?.response?.data?.message || e.message);
    }
  }

  async function requestConnect(id) {
    try {
      await api.post("/doctors/request", { doctorId: id });
      alert("Request sent to the doctor.");
    } catch (e) {
      alert(e?.response?.data?.message || e.message);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search doctors by name, email or specialization…"
          className="flex-1 px-3 py-2 rounded-2xl border bg-white/90"
        />
        <button onClick={load} className="px-3 py-2 rounded-2xl border bg-white/80 hover:bg-white transition">
          Search
        </button>
      </div>

      <div className="rounded-3xl border border-white/30 bg-white/70 backdrop-blur p-4">
        {loading && (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="rounded-2xl p-4 border animate-pulse bg-white/70 h-44" />
            ))}
          </div>
        )}

        {!loading && rows.length === 0 && (
          <div className="p-8 text-slate-600 text-center">No doctors found.</div>
        )}

        <AnimatePresence mode="popLayout">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {rows.map((d, idx) => (
              <motion.div
                key={d._id}
                layout
                initial={{ y: 8, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 8, opacity: 0 }}
                transition={{ delay: idx * 0.03 }}
                className="group rounded-2xl border bg-white/80 hover:bg-white transition p-4 shadow-sm hover:shadow-md"
              >
                <div className="flex gap-3">
                  {d.profilePhoto ? (
                    <img src={d.profilePhoto} className="w-12 h-12 rounded-xl object-cover border" />
                  ) : (
                    <div className="w-12 h-12 rounded-xl bg-slate-200" />
                  )}
                  <div className="flex-1">
                    <div className="font-semibold">{d.name}</div>
                    <div className="text-xs text-slate-500">{d.email}</div>
                    <div className="text-xs text-slate-600 mt-1">
                      {(d.gender ? `${d.gender} · ` : "")}{d.age ? `${d.age}y` : ""}
                    </div>
                    <div className="text-xs text-slate-700 mt-1">{d.specialization || ""}</div>
                  </div>
                </div>

                <div className="mt-3 flex gap-2">
                  {/* NEW: link to full public profile page */}
                  <Link
                    to={`/doctor/${d._id || d.id}/profile`}
                    className="px-3 py-2 rounded-2xl border border-white/30 hover:bg-white/10 transition"
                    title="Open full profile"
                  >
                    View Profile
                  </Link>

                  {/* Keep your quick preview modal (optional) */}
                  <button onClick={() => viewProfile(d._id)} className="px-3 py-2 rounded-2xl border">
                    Quick Preview
                  </button>

                  <button
                    onClick={() => requestConnect(d._id)}
                    className="px-3 py-2 rounded-2xl border bg-emerald-600 text-white hover:bg-emerald-700"
                  >
                    Request connect
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        </AnimatePresence>
      </div>

      <Modal open={open} onClose={() => setOpen(false)} doctor={selected} />
    </div>
  );
}
