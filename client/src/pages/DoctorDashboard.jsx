// client/src/pages/DoctorDashboard.jsx
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api/axios";
import fileUrl from "../utils/fileUrl";

export default function DoctorDashboard(){
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [notificationCount, setNotificationCount] = useState(0);
  const [patients, setPatients] = useState([]);
  const [patientsLoading, setPatientsLoading] = useState(false);
  const pendingCount = alerts.length;

  useEffect(()=>{
    const load = async ()=>{
      setLoading(true);
      try{
        const { data } = await api.get("/doctors/alerts");
        setAlerts(Array.isArray(data?.items) ? data.items : []);
        if (import.meta.env.DEV) {
          console.log("📋 Doctor alerts loaded:", data?.items?.length || 0);
        }
      } catch (e) {
        if (import.meta.env.DEV) {
          console.error("Failed to load alerts:", e);
        }
        setAlerts([]);
      } finally {
        setLoading(false);
      }
    };
    
    const loadNotifications = async () => {
      try {
        const { data } = await api.get("/notifications/unread-count");
        const count = data?.count || 0;
        setNotificationCount(count);
        if (import.meta.env.DEV) {
          console.log("📬 Unread notifications:", count);
        }
      } catch (e) {
        if (import.meta.env.DEV) {
          console.error("Failed to load notification count:", e?.response?.data || e);
        }
      }
    };
    
    const loadPatients = async () => {
      setPatientsLoading(true);
      try {
        const { data } = await api.get("/doctors/patients");
        // Filter to show only accepted/approved patients
        const acceptedPatients = (Array.isArray(data?.patients) ? data.patients : [])
          .filter(p => p.status === 'accepted' || p.status === 'approved')
          .slice(0, 6); // Show max 6 on dashboard
        setPatients(acceptedPatients);
        if (import.meta.env.DEV) {
          console.log("👥 Connected patients loaded:", acceptedPatients.length);
          // Debug: Log patient photo data
          acceptedPatients.forEach((p, idx) => {
            console.log(`Patient ${idx + 1}:`, {
              name: p.user?.name,
              avatarUrl: p.user?.avatarUrl,
              profilePhoto: p.user?.profilePhoto,
              fullUser: p.user
            });
          });
        }
      } catch (e) {
        if (import.meta.env.DEV) {
          console.error("Failed to load patients:", e);
        }
        setPatients([]);
      } finally {
        setPatientsLoading(false);
      }
    };
    
    load();
    loadNotifications();
    loadPatients();
    
    // Refresh every 10 seconds
    const interval = setInterval(() => {
      load();
      loadNotifications();
      loadPatients();
    }, 10000);
    
    return () => clearInterval(interval);
  },[]);

  return (
    <div className="max-w-5xl mx-auto p-3 sm:p-4 md:p-6 text-slate-900 dark:text-white space-y-4 md:space-y-6">
      <div className="glass rounded-2xl p-4 sm:p-6 text-slate-900 dark:text-white">
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">Doctor Dashboard</h1>
        <p className="text-xs sm:text-sm text-slate-700 dark:text-white/80 mt-1">Manage your connection requests and patients.</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 sm:gap-3 mt-4 sm:mt-5">
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
          <Link to="/notifications" className="btn glass text-center relative">
            Notifications
            {notificationCount > 0 && (
              <span className="absolute -top-2 -right-2 min-w-6 h-6 grid place-items-center rounded-full bg-pink-500 text-white text-xs font-bold animate-bounce">
                {notificationCount}
              </span>
            )}
          </Link>
        </div>
      </div>

      {/* Quick preview of pending requests */}
      <div className="glass rounded-2xl p-4 sm:p-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base sm:text-lg font-semibold">Pending Requests</h2>
          <Link to="/doctor/alerts" className="text-sm underline hover:no-underline">
            View all
          </Link>
        </div>

        {loading && <div className="text-slate-700 dark:text-white/80">Loading…</div>}
        {!loading && alerts.length === 0 && (
          <div className="text-slate-700 dark:text-white/80">No pending requests.</div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
          {alerts.slice(0, 4).map(it => (
            <div key={it.id} className="card fade-in flex flex-col sm:flex-row gap-3 p-3 sm:p-4">
              {it.photo?.annotated ? (
                <img
                  src={it.photo.annotated}
                  alt="annotated"
                  className="w-24 h-24 object-cover rounded border border-slate-300 dark:border-white/20"
                />
              ) : (
                <div className="w-24 h-24 rounded bg-slate-200/50 dark:bg-white/5 border border-slate-300 dark:border-white/20 grid place-items-center text-xs text-slate-600 dark:text-white/70">
                  No photo
                </div>
              )}

              <div className="flex-1">
                <div className="font-medium text-slate-900 dark:text-white">{it.user?.name || "Unknown patient"}</div>
                <div className="text-sm text-slate-700 dark:text-white/80">{it.user?.email}</div>
                <div className="text-xs text-slate-600 dark:text-white/60 mt-1">
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

      {/* Connected Patients Section */}
      <div className="glass rounded-2xl p-4 sm:p-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base sm:text-lg font-semibold">Connected Patients</h2>
          <Link to="/doctor/patients" className="text-sm underline hover:no-underline">
            View all
          </Link>
        </div>

        {patientsLoading && <div className="text-slate-700 dark:text-white/80">Loading patients…</div>}
        {!patientsLoading && patients.length === 0 && (
          <div className="text-slate-700 dark:text-white/80">No connected patients yet.</div>
        )}

        {!patientsLoading && patients.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {patients.map(patient => {
              const u = patient.user || {};
              const intake = patient.latestIntake || {};
              
              return (
                <div key={patient._id} className="card fade-in">
                  <div className="flex items-start gap-3 mb-3">
                    {u.avatarUrl || u.profilePhoto ? (
                      <img
                        src={fileUrl(u.avatarUrl || u.profilePhoto)}
                        alt={u.name || "Patient"}
                        className="w-12 h-12 object-cover rounded-xl ring-2 ring-white/20"
                        onError={(e) => {
                          if (import.meta.env.DEV) {
                            console.error("Failed to load patient photo:", u.avatarUrl || u.profilePhoto);
                          }
                          e.target.style.display = 'none';
                          if (e.target.nextSibling) {
                            e.target.nextSibling.style.display = 'flex';
                          }
                        }}
                        onLoad={() => {
                          if (import.meta.env.DEV) {
                            console.log("✅ Patient photo loaded successfully:", fileUrl(u.avatarUrl || u.profilePhoto));
                          }
                        }}
                      />
                    ) : null}
                    {(!u.avatarUrl && !u.profilePhoto) && (
                      <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center text-white/50 text-xs">
                        No Photo
                      </div>
                    )}
                    <div className="flex-1">
                      <div className="font-medium">{u.name || "Patient"}</div>
                      <div className="text-xs text-white/70">{u.email}</div>
                      {u.age && (
                        <div className="text-xs text-white/60 mt-1">
                          {u.gender ? `${u.gender} · ` : ""}{u.age}y
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Pain Summary */}
                  {intake.painDescription && (
                    <div className="mb-3 p-2 rounded-lg bg-rose-500/10 border border-rose-500/20">
                      <div className="text-xs text-rose-300 mb-1">Pain: {intake.painLocation || "General"}</div>
                      <div className="text-xs text-white/70 line-clamp-2">
                        {intake.painDescription}
                      </div>
                    </div>
                  )}

                  {/* Therapy Sessions Count */}
                  {patient.therapySessions && patient.therapySessions.length > 0 && (
                    <div className="mb-3 text-xs text-blue-300">
                      📋 {patient.therapySessions.length} therapy session{patient.therapySessions.length !== 1 ? 's' : ''}
                    </div>
                  )}

                  <div className="flex gap-2 mt-3">
                    <Link
                      to={patient.latestSessionId ? `/doctor/session/${patient.latestSessionId}` : `/doctor/patient/${u._id || u.id}`}
                      className="btn btn-primary text-sm flex-1"
                    >
                      {patient.latestSessionId ? "Continue" : "View"}
                    </Link>
                    <Link
                      to={`/doctor/patient/${u._id || u.id}`}
                      className="btn btn-ghost text-sm"
                    >
                      Details
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
