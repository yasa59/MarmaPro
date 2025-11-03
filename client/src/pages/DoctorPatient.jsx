// client/src/pages/DoctorPatient.jsx
import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import api from "../api/axios";
import CallButton from "../components/CallButton";

export default function DoctorPatient() {
  const { id: userId } = useParams();
  const [info, setInfo] = useState(null);
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const [{ data: basic }, { data: ph }] = await Promise.all([
        api.get(`/patients/${userId}/basic`),
        api.get(`/photos/user/${userId}?limit=8`)
      ]);
      setInfo(basic?.user ? basic : { user: basic?.user || {} });
      setPhotos(ph?.photos || []);
    } catch (e) {
      console.error(e);
      alert("Failed to load patient");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [userId]);

  if (loading) {
    return (
      <div className="rounded-3xl border border-white/30 bg-white/70 backdrop-blur p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-10 bg-slate-200 rounded w-1/3" />
          <div className="h-28 bg-slate-200 rounded" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {Array.from({ length: 8 }).map((_, i) => <div key={i} className="h-36 bg-slate-200 rounded-xl" />)}
          </div>
        </div>
      </div>
    );
  }

  const user = info?.user || {};

  return (
    <div className="space-y-6">
      {/* Header / summary card */}
      <motion.div
        initial={{ y: 10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="rounded-3xl border border-white/30 bg-gradient-to-r from-white/80 to-white/60 backdrop-blur p-5 shadow-sm"
      >
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-4">
            {user.avatarUrl ? (
              <img src={user.avatarUrl} alt="" className="w-16 h-16 rounded-2xl object-cover ring-2 ring-white/80" />
            ) : (
              <div className="w-16 h-16 rounded-2xl bg-slate-200 ring-2 ring-white/80" />
            )}
            <div>
              <div className="text-xl font-semibold">{user.name || "Patient"}</div>
              <div className="text-sm text-slate-600">{user.email || "—"}</div>
              {user.phone && <div className="text-sm text-slate-600">{user.phone}</div>}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <CallButton partnerId={userId} label="Connect online" size="lg" />
            <Link
              to={`/doctor/patient/${userId}/photos`}
              className="px-4 py-2.5 rounded-2xl border bg-white/80 hover:bg-white transition"
            >
              View all photos
            </Link>
          </div>
        </div>
      </motion.div>

      {/* Stats / details */}
      <motion.div
        initial={{ y: 10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.05 }}
        className="rounded-3xl border border-white/30 bg-white/70 backdrop-blur p-4"
      >
        <h2 className="font-semibold mb-3">Patient details</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
          <Detail label="Name" value={user.name} />
          <Detail label="Email" value={user.email} />
          <Detail label="Phone" value={user.phone} />
        </div>
      </motion.div>

      {/* Recent photos */}
      <motion.div
        initial={{ y: 10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="rounded-3xl border border-white/30 bg-white/70 backdrop-blur p-4"
      >
        <h2 className="font-semibold mb-3">Recent foot photos</h2>
        {photos.length === 0 ? (
          <div className="text-slate-600">No photos yet.</div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {photos.map((p) => (
              <motion.div
                key={p._id}
                whileHover={{ scale: 1.02 }}
                className="relative group rounded-2xl overflow-hidden border"
                title={new Date(p.createdAt).toLocaleString()}
              >
                <img src={p.url} alt="" className="w-full h-40 object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent opacity-0 group-hover:opacity-100 transition" />
                <div className="absolute bottom-2 left-2 text-[11px] text-white/90 bg-black/40 px-2 py-0.5 rounded-full">
                  {new Date(p.createdAt).toLocaleDateString()}
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
}

function Detail({ label, value }) {
  return (
    <div className="rounded-2xl border bg-white/80 p-3">
      <div className="text-slate-500 text-xs">{label}</div>
      <div className="font-medium">{value || "—"}</div>
    </div>
  );
}
