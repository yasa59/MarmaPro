// client/src/pages/DoctorTherapyInbox.jsx
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api/axios";

export default function DoctorTherapyInbox() {
  const [items, setItems] = useState([]);
  const [loading, setBusy] = useState(true);

  async function load() {
    setBusy(true);
    try {
      const { data } = await api.get("/sessions/inbox");
      setItems(Array.isArray(data?.items) ? data.items : []);
    } catch (e) {
      setItems([]);
    } finally {
      setBusy(false);
    }
  }
  useEffect(() => { load(); }, []);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl md:text-2xl font-semibold text-white">Therapy Requests</h1>
        <button onClick={load} className="px-3 py-2 rounded-2xl border bg-white/80 hover:bg-white transition">Refresh</button>
      </div>

      <div className="rounded-3xl border border-white/30 bg-white/10 backdrop-blur p-4">
        {loading ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-24 rounded-2xl border bg-white/10 animate-pulse" />)}
          </div>
        ) : items.length === 0 ? (
          <div className="p-6 text-white/80">No requests right now.</div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((it) => (
              <Link key={it.id} to={`/doctor/session/${it.id}`} className="rounded-2xl border bg-white/10 hover:bg-white/20 transition p-4 block">
                <div className="flex items-start gap-3">
                  {it.user?.avatar ? <img src={it.user.avatar} className="w-12 h-12 rounded-xl object-cover border" /> : <div className="w-12 h-12 rounded-xl bg-white/20" />}
                  <div className="flex-1 text-white">
                    <div className="font-semibold">{it.user?.name || "Patient"}</div>
                    <div className="text-xs text-white/70">{it.user?.email}</div>
                    <div className="text-xs text-white/60 mt-1">Status: {it.status}</div>
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
