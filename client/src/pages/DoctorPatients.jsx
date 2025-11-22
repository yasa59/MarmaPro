// client/src/pages/DoctorPatients.jsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import api from "../api/axios";
import fileUrl from "../utils/fileUrl";
import toast from "../components/Toast";

export default function DoctorPatients() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [expandedItems, setExpandedItems] = useState(new Set());
  const nav = useNavigate();

  async function load() {
    setLoading(true);
    setErr("");
    try {
      const { data } = await api.get("/doctors/patients");
      setRows(Array.isArray(data?.patients) ? data.patients : []);
      if (import.meta.env.DEV) {
        console.log("📋 Patients loaded:", data?.patients?.length || 0);
      }
    } catch (e) {
      const msg = e?.response?.data?.message || e.message || "unknown_error";
      setErr(msg);
      if (import.meta.env.DEV) {
        console.error("Failed to load patients:", e);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function updateStatus(id, status) {
    try {
      const { data } = await api.patch(`/doctors/connections/${id}`, { status });
      setRows(prev => prev.map(r => r._id === id ? { ...r, status: data?.status || status } : r));
      await load(); // Reload to get updated data
    } catch (e) {
      toast.error(e?.response?.data?.message || e.message);
    }
  }

  // Start therapy session - navigate to session detail page
  async function startTherapy(patient) {
    try {
      const userId = patient?.user?._id || patient?.user?.id;
      if (!userId) {
        toast.error("Patient ID not found");
        return;
      }

      // If there's a latest session, navigate to it, otherwise create new
      if (patient.latestSessionId) {
        nav(`/doctor/session/${patient.latestSessionId}`);
      } else {
        // Create new session
        try {
          const { data } = await api.post("/sessions/start", { userId });
          if (data?.id) {
            nav(`/doctor/session/${data.id}`);
          } else {
            toast.error("Failed to create session");
          }
        } catch (e) {
          toast.error(e?.response?.data?.message || e.message || "Failed to start therapy");
        }
      }
    } catch (e) {
      toast.error(e?.response?.data?.message || e.message);
    }
  }

  function toggleExpand(id) {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedItems(newExpanded);
  }

  return (
    <div className="p-3 sm:p-4 md:p-6 space-y-4 md:space-y-5">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <h1 className="text-lg sm:text-xl md:text-2xl font-semibold text-slate-900 dark:text-white">My Patients</h1>
        <button 
          onClick={load} 
          className="px-3 py-2 rounded-2xl border border-slate-300 dark:border-white/20 bg-slate-200 dark:bg-white/10 hover:bg-slate-300 dark:hover:bg-white/20 text-slate-900 dark:text-white transition"
        >
          Refresh
        </button>
      </div>

      {err && (
        <div className="rounded-xl border border-rose-300/40 bg-rose-500/15 text-rose-900 dark:text-rose-100 px-3 py-2 text-sm">
          {err}
        </div>
      )}

      <div className="rounded-2xl sm:rounded-3xl border border-slate-300 dark:border-white/10 bg-slate-50/90 dark:bg-white/5 backdrop-blur p-3 sm:p-4 text-slate-900 dark:text-white shadow-xl">
        {loading && (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="rounded-2xl p-4 border border-white/10 bg-white/5 animate-pulse">
                <div className="h-10 w-10 bg-white/10 rounded-xl mb-3" />
                <div className="h-3 bg-white/10 rounded w-1/2 mb-2" />
                <div className="h-3 bg-white/10 rounded w-1/3 mb-4" />
                <div className="h-8 bg-white/10 rounded w-full" />
              </div>
            ))}
          </div>
        )}

        {!loading && rows.length === 0 && (
          <div className="p-8 text-slate-700 dark:text-white/80 text-center">
            <div className="text-lg mb-2">No patients yet.</div>
            <div className="text-sm text-slate-600 dark:text-white/60">When patients connect with you, they will appear here.</div>
          </div>
        )}

        <AnimatePresence mode="popLayout">
          <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {rows.map((r, idx) => {
              const u = r.user || {};
              const intake = r.latestIntake || {};
              const isExpanded = expandedItems.has(r._id);

              return (
                <motion.div
                  key={r._id}
                  layout
                  initial={{ y: 8, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: 8, opacity: 0 }}
                  transition={{ delay: idx * 0.03 }}
                  className="group rounded-xl sm:rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 transition p-3 sm:p-4 shadow-lg hover:shadow-2xl"
                >
                  {/* Patient Profile Section */}
                  <div className="flex items-start gap-3 mb-3">
                    {u.avatarUrl || u.profilePhoto ? (
                      <img 
                        src={fileUrl(u.avatarUrl || u.profilePhoto)} 
                        alt={u.name || "Patient"} 
                        className="w-14 h-14 object-cover rounded-xl ring-2 ring-white/30" 
                        onError={(e) => {
                          e.target.style.display = 'none';
                          if (e.target.nextSibling) {
                            e.target.nextSibling.style.display = 'flex';
                          }
                        }}
                      />
                    ) : null}
                    {(!u.avatarUrl && !u.profilePhoto) && (
                      <div className="w-14 h-14 rounded-xl bg-slate-200 dark:bg-white/10 flex items-center justify-center text-slate-600 dark:text-white/50 text-xs">
                        No Photo
                      </div>
                    )}
                    <div className="flex-1">
                      <div className="font-semibold text-slate-900 dark:text-white/95">{u.name || "Patient"}</div>
                      <div className="text-xs text-slate-700 dark:text-white/70">{u.email || "—"}</div>
                      <div className="text-xs text-slate-700 dark:text-white/70 mt-1">
                        {u.gender ? `${u.gender} · ` : ""}{u.age ? `${u.age}y` : ""}
                      </div>
                      {u.phone && (
                        <div className="text-xs text-white/60 mt-1">📞 {u.phone}</div>
                      )}
                      <div className="text-xs mt-1">
                        Status: <span className={`font-medium ${
                          r.status === 'accepted' || r.status === 'approved' 
                            ? 'text-emerald-400' 
                            : r.status === 'pending' 
                            ? 'text-yellow-400' 
                            : 'text-rose-400'
                        }`}>
                          {r.status}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Latest Photo */}
                  {r.latestPhotoThumb && (
                    <div className="mb-3">
                      <img 
                        src={fileUrl(r.latestPhotoThumb)} 
                        alt="Foot photo" 
                        className="w-full h-32 object-cover rounded-xl border border-white/10" 
                      />
                    </div>
                  )}

                  {/* Pain/Intake Information */}
                  {intake && (intake.painDescription || intake.fullName) && (
                    <div className="mb-3">
                      <button
                        onClick={() => toggleExpand(r._id)}
                        className="w-full text-left px-3 py-2 rounded-xl bg-slate-200 dark:bg-white/5 hover:bg-slate-300 dark:hover:bg-white/10 border border-slate-300 dark:border-white/10 text-sm text-slate-800 dark:text-white/80 flex items-center justify-between"
                      >
                        <span>View Patient Details & Pain Information</span>
                        <span>{isExpanded ? "▼" : "▶"}</span>
                      </button>
                      
                      {isExpanded && (
                        <div className="mt-2 p-3 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-300 dark:border-white/10 space-y-2 text-sm">
                          {intake.fullName && (
                            <div><span className="text-slate-600 dark:text-white/60">Name:</span> <span className="text-slate-900 dark:text-white/90">{intake.fullName}</span></div>
                          )}
                          {intake.age && (
                            <div><span className="text-slate-600 dark:text-white/60">Age:</span> <span className="text-slate-900 dark:text-white/90">{intake.age}</span></div>
                          )}
                          {intake.gender && (
                            <div><span className="text-slate-600 dark:text-white/60">Gender:</span> <span className="text-slate-900 dark:text-white/90">{intake.gender}</span></div>
                          )}
                          {intake.livingArea && (
                            <div><span className="text-slate-600 dark:text-white/60">Location:</span> <span className="text-slate-900 dark:text-white/90">{intake.livingArea}</span></div>
                          )}
                          {intake.bloodType && (
                            <div><span className="text-slate-600 dark:text-white/60">Blood Type:</span> <span className="text-slate-900 dark:text-white/90">{intake.bloodType}</span></div>
                          )}
                          {intake.phone && (
                            <div><span className="text-slate-600 dark:text-white/60">Phone:</span> <span className="text-slate-900 dark:text-white/90">{intake.phone}</span></div>
                          )}
                          {intake.painDescription && (
                            <div className="pt-2 border-t border-slate-300 dark:border-white/10">
                              <div className="text-slate-600 dark:text-white/60 mb-1">Pain Description:</div>
                              <div className="text-slate-900 dark:text-white/90">{intake.painDescription}</div>
                            </div>
                          )}
                          {intake.painLocation && (
                            <div><span className="text-slate-600 dark:text-white/60">Pain Location:</span> <span className="text-slate-900 dark:text-white/90">{intake.painLocation}</span></div>
                          )}
                          {intake.painDuration && (
                            <div><span className="text-slate-600 dark:text-white/60">Duration:</span> <span className="text-slate-900 dark:text-white/90">{intake.painDuration}</span></div>
                          )}
                          {intake.painSeverity && (
                            <div><span className="text-slate-600 dark:text-white/60">Severity:</span> <span className="text-slate-900 dark:text-white/90">{intake.painSeverity}</span></div>
                          )}
                          {intake.otherNotes && (
                            <div className="pt-2 border-t border-slate-300 dark:border-white/10">
                              <div className="text-slate-600 dark:text-white/60 mb-1">Additional Notes:</div>
                              <div className="text-slate-900 dark:text-white/90">{intake.otherNotes}</div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Therapy Sessions */}
                  {r.therapySessions && r.therapySessions.length > 0 && (
                    <div className="mb-3 p-2 rounded-xl bg-blue-500/10 border border-blue-500/20">
                      <div className="text-xs text-blue-300 mb-1">
                        Therapy Sessions: {r.therapySessions.length}
                      </div>
                      <div className="text-xs text-white/70">
                        Latest: {new Date(r.therapySessions[0].createdAt).toLocaleDateString()}
                      </div>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="mt-4 flex flex-wrap gap-2">
                    {/* Start Therapy Button */}
                    <button
                      onClick={() => startTherapy(r)}
                      className="px-3 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white transition shadow-sm font-semibold text-sm"
                    >
                      {r.latestSessionId ? "Continue Therapy" : "Start Therapy"}
                    </button>

                    {/* Status Management Buttons */}
                    {r.status !== "accepted" && r.status !== "approved" && (
                      <button
                        onClick={() => updateStatus(r._id, "accepted")}
                        className="px-3 py-2 rounded-xl border border-emerald-500/50 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 transition text-sm"
                      >
                        Accept
                      </button>
                    )}
                    {r.status !== "rejected" && (
                      <button
                        onClick={() => updateStatus(r._id, "rejected")}
                        className="px-3 py-2 rounded-xl border border-rose-500/50 bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 transition text-sm"
                      >
                        Reject
                      </button>
                    )}

                    {/* View Patient Details */}
                    {u._id && (
                      <button
                        onClick={() => nav(`/doctor/patient/${u._id}`)}
                        className="px-3 py-2 rounded-xl border border-white/20 bg-white/5 hover:bg-white/10 text-white/80 transition text-sm"
                      >
                        View Details
                      </button>
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
