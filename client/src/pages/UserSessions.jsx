// client/src/pages/UserSessions.jsx
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api/axios";

const chip = (s) => {
  const base = "px-2 py-0.5 rounded-full text-xs font-medium";
  if (s === "pending") return <span className={`${base} bg-yellow-500/20 text-yellow-200 border border-yellow-400/30`}>Pending</span>;
  if (s === "accepted") return <span className={`${base} bg-emerald-500/20 text-emerald-200 border border-emerald-400/30`}>Accepted</span>;
  if (s === "intake_submitted") return <span className={`${base} bg-blue-500/20 text-blue-200 border border-blue-400/30`}>Waiting Doctor</span>;
  if (s === "responded") return <span className={`${base} bg-indigo-500/20 text-indigo-200 border border-indigo-400/30`}>Ready</span>;
  return <span className={`${base} bg-slate-500/20 text-slate-200 border border-slate-400/30`}>{s}</span>;
};

export default function UserSessions() {
  const [items, setItems] = useState([]);
  const [loading, setBusy] = useState(true);

  async function load() {
    setBusy(true);
    try {
      const { data } = await api.get("/sessions/mine");
      setItems(Array.isArray(data?.items) ? data.items : []);
    } catch (e) {
      console.error(e);
      setItems([]);
    } finally {
      setBusy(false);
    }
  }
  useEffect(() => { load(); }, []);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl md:text-2xl font-semibold text-white">My Therapy Sessions</h1>
        <button onClick={load} className="px-3 py-2 rounded-2xl border bg-white/80 hover:bg-white transition">Refresh</button>
      </div>

      <div className="rounded-3xl border border-white/30 bg-white/10 backdrop-blur p-4">
        {loading ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-24 rounded-2xl border bg-white/10 animate-pulse" />)}
          </div>
        ) : items.length === 0 ? (
          <div className="p-6 text-white/80">No sessions yet. Go to <b>Find Doctors</b> and request therapy.</div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((it) => (
              <Link key={it.id} to={`/user/session/${it.id}`} className="rounded-2xl border bg-white/10 hover:bg-white/20 transition p-4 block">
                <div className="flex items-start gap-3">
                  {it.doctor?.avatar
                    ? <img src={it.doctor.avatar} className="w-12 h-12 rounded-xl object-cover border" />
                    : <div className="w-12 h-12 rounded-xl bg-white/20" />}
                  <div className="flex-1">
                    <div className="font-semibold text-white">{it.doctor?.name || "Doctor"}</div>
                    <div className="text-xs text-white/70">{it.doctor?.email}</div>
                    <div className="mt-1">{chip(it.status)}</div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
