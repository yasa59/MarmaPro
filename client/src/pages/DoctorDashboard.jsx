// client/src/pages/DoctorDashboard.jsx
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api/axios";

export default function DoctorDashboard(){
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(false);
  const pendingCount = alerts.length;

  useEffect(()=>{
    const load = async ()=>{
      setLoading(true);
      try{
        const { data } = await api.get("/doctors/alerts");
        setAlerts(Array.isArray(data?.items) ? data.items : []);
      } catch (e) {
        console.error("Failed to load alerts:", e);
        setAlerts([]);
      } finally {
        setLoading(false);
      }
    };
    load();
  },[]);

  return (
    <div className="max-w-5xl mx-auto p-6 text-white space-y-6">
      <div className="glass rounded-2xl p-6">
        <h1 className="text-2xl font-bold">Doctor Dashboard</h1>
        <p className="text-sm text-white/80 mt-1">Manage your connection requests and patients.</p>

        <div className="grid sm:grid-cols-3 gap-3 mt-5">
          {/* Alerts */}
          <Link to="/doctor/alerts" className="btn btn-primary text-center relative">
            Alerts (Requests)
            {pendingCount > 0 && (
              <span className="absolute -top-2 -right-2 min-w-6 h-6 grid place-items-center rounded-full bg-pink-500 text-white text-xs font-bold animate-bounce">
                {pendingCount}
              </span>
            )}
          </Link>

          {/* ✅ Patients list */}
          <Link className="btn btn-secondary text-center" to="/doctor/patients">
            Patients
          </Link>

          {/* Notifications */}
          <Link to="/notifications" className="btn glass text-center">
            Notifications
          </Link>
        </div>
      </div>

      {/* Quick preview of pending requests */}
      <div className="glass rounded-2xl p-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">Pending Requests</h2>
          <Link to="/doctor/alerts" className="text-sm underline hover:no-underline">
            View all
          </Link>
        </div>

        {loading && <div className="text-white/80">Loading…</div>}
        {!loading && alerts.length === 0 && (
          <div className="text-white/80">No pending requests.</div>
        )}

        <div className="grid md:grid-cols-2 gap-4">
          {alerts.slice(0, 4).map(it => (
            <div key={it.id} className="card fade-in flex gap-3">
              {it.photo?.annotated ? (
                <img
                  src={it.photo.annotated}
                  alt="annotated"
                  className="w-24 h-24 object-cover rounded border border-white/20"
                />
              ) : (
                <div className="w-24 h-24 rounded bg-white/5 border border-white/20 grid place-items-center text-xs text-white/70">
                  No photo
                </div>
              )}

              <div className="flex-1">
                <div className="font-medium">{it.user?.name || "Unknown patient"}</div>
                <div className="text-sm text-white/80">{it.user?.email}</div>
                <div className="text-xs text-white/60 mt-1">
                  Requested: {new Date(it.requestedAt).toLocaleString()}
                </div>

                <div className="mt-3 flex gap-2">
                  <Link className="btn btn-primary" to={`/doctor/patient/${it.user?.id || ""}`}>
                    Open
                  </Link>
                  <Link className="btn btn-ghost" to="/doctor/alerts">
                    Manage
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
}
