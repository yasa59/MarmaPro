// client/src/pages/UserDashboard.jsx
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import api from "../api/axios";
import fileUrl from "../utils/fileUrl.js";
import toast from "../components/Toast";

function Section({ title, children, right }) {
  return (
    <div className="rounded-3xl border border-slate-900/20 dark:border-white/30 bg-slate-50/90 dark:bg-white/70 backdrop-blur p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg md:text-xl font-semibold text-slate-900 dark:text-slate-800">{title}</h2>
        {right}
      </div>
      {children}
    </div>
  );
}

export default function UserDashboard() {
  // --- original states you had ---
  const [photo, setPhoto] = useState(null);
  const [msg, setMsg] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [topDocs, setTopDocs] = useState([]);

  // --- new sections ---
  const [accepted, setAccepted] = useState([]); // list of doctors who accepted me
  const [alerts, setAlerts] = useState([]);     // notifications
  const [drafts, setDrafts] = useState([]);      // saved intake drafts
  const [sessions, setSessions] = useState([]);  // therapy sessions

  const [loadingA, setLoadingA] = useState(true);
  const [loadingN, setLoadingN] = useState(true);
  const [loadingD, setLoadingD] = useState(true);
  const [loadingS, setLoadingS] = useState(true);

  // ---- Loaders ----
  async function loadGreetingAndLatestPhoto() {
    // Greeting/profile name
    try {
      const { data } = await api.get("/profile/me");
      const dn = [data?.title, data?.fullName].filter(Boolean).join(" ").trim();
      setDisplayName(dn || data?.name || "");
    } catch {
      // ignore
    }

    // Latest photo
    try {
      const { data } = await api.get("/photos/latest/mine");
      setPhoto(data);
    } catch {
      // ignore if none
    }
  }

  async function loadTopDoctors() {
    try {
      const { data } = await api.get("/doctors/public?limit=4");
      const items = Array.isArray(data?.items) ? data.items : (Array.isArray(data) ? data : []);
      setTopDocs(items);
    } catch {
      setTopDocs([]);
    }
  }

  // Primary method (if you add the backend route):
  async function tryLoadAcceptedDirect() {
    const { data } = await api.get("/doctors/my/accepted");
    // expect { items: [{ id, name, email, avatar, gender, age, specialization, qualifications }] }
    return Array.isArray(data?.items) ? data.items : [];
  }

  // Fallback method (no /doctors/my/accepted):
  // 1) notifications → filter connect_accepted → collect doctorIds
  // 2) GET /doctors (legacy: approved doctors) → filter by those ids
  async function tryLoadAcceptedFromNotifications() {
    const out = [];
    try {
      const { data: ndata } = await api.get("/notifications?limit=50");
      const items = Array.isArray(ndata?.items) ? ndata.items : [];
      const docIds = new Set(
        items
          .filter((n) => n?.type === "connect_accepted" && n?.meta?.doctorId)
          .map((n) => String(n.meta.doctorId))
      );
      if (docIds.size === 0) return out;

      // Legacy public doctors list
      const { data: ddata } = await api.get("/doctors");
      const doctors = Array.isArray(ddata) ? ddata : [];
      doctors.forEach((d) => {
        if (docIds.has(String(d._id))) {
          out.push({
            id: String(d._id),
            name: d.name,
            email: d.email,
            avatar: d.profilePhoto || null,
            // these fields may not exist in legacy /doctors, so leave undefined/null
            gender: d.gender ?? null,
            age: d.age ?? null,
            specialization: d.specialization ?? null,
            qualifications: d.qualifications ?? null,
          });
        }
      });
      return out;
    } catch {
      return out;
    }
  }

  async function loadAccepted() {
    setLoadingA(true);
    try {
      let items = [];
      try {
        items = await tryLoadAcceptedDirect();
      } catch (e) {
        // If direct endpoint missing (404), use fallback
        if (e?.response?.status === 404) {
          items = await tryLoadAcceptedFromNotifications();
        } else {
          throw e;
        }
      }
      setAccepted(Array.isArray(items) ? items : []);
    } catch (e) {
      if (import.meta.env.DEV) {
        console.error("loadAccepted:", e?.response || e);
      }
      setAccepted([]);
    } finally {
      setLoadingA(false);
    }
  }

  async function loadAlerts() {
    setLoadingN(true);
    try {
      const { data } = await api.get("/notifications?limit=20");
      setAlerts(Array.isArray(data?.items) ? data.items : []);
    } catch (e) {
      if (import.meta.env.DEV) {
        console.error("loadAlerts:", e?.response || e);
      }
      setAlerts([]);
    } finally {
      setLoadingN(false);
    }
  }

  async function loadDrafts() {
    setLoadingD(true);
    try {
      const { data } = await api.get("/user/intake-drafts");
      setDrafts(Array.isArray(data?.items) ? data.items : []);
    } catch (e) {
      if (import.meta.env.DEV) {
        console.error("loadDrafts:", e?.response || e);
      }
      setDrafts([]);
    } finally {
      setLoadingD(false);
    }
  }

  async function loadSessions() {
    setLoadingS(true);
    try {
      const { data } = await api.get("/sessions/mine");
      setSessions(Array.isArray(data?.items) ? data.items : []);
    } catch (e) {
      if (import.meta.env.DEV) {
        console.error("loadSessions:", e?.response || e);
      }
      setSessions([]);
    } finally {
      setLoadingS(false);
    }
  }

  useEffect(() => {
    loadGreetingAndLatestPhoto();
    loadTopDoctors();
    loadAccepted();
    loadAlerts();
    loadDrafts();
    loadSessions();
  }, []);

  return (
    <div className="max-w-5xl mx-auto p-3 sm:p-4 md:p-6 text-slate-900 dark:text-white space-y-4 md:space-y-6">
      {/* Welcome + quick actions (kept) */}
      <div className="glass rounded-2xl p-4 sm:p-6 text-slate-900 dark:text-white">
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
          {displayName ? `Welcome to iMarma Therapy, ${displayName}` : "User Dashboard"}
        </h1>
        <p className="text-xs sm:text-sm text-slate-700 dark:text-white/80 mt-1">
          Upload your foot image, connect with a doctor, and follow instructions.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 sm:gap-3 mt-4 sm:mt-5">
          <Link to="/user/doctors" className="btn btn-primary text-center">
            Find Doctors
          </Link>
          <Link to="/user/foot-photo" className="btn btn-secondary text-center">
            Upload Foot Photo &amp; Detect
          </Link>
          <Link to="/notifications" className="btn glass text-center">
            Notifications
          </Link>
        </div>
      </div>

      {/* My Doctor(s) — NEW */}
      <Section
        title="My Doctor"
        right={
          <button
            onClick={loadAccepted}
            className="px-3 py-2 rounded-2xl border bg-slate-50/90 dark:bg-white/80 hover:bg-slate-100 dark:hover:bg-white transition text-slate-800 dark:text-slate-800"
          >
            Refresh
          </button>
        }
      >
        {loadingA ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="rounded-2xl p-4 border animate-pulse bg-slate-200/70 dark:bg-white/70 h-24" />
            ))}
          </div>
        ) : accepted.length === 0 ? (
          <div className="p-6 text-slate-600">
            No doctor has accepted yet. Go to <b>Find Doctors</b> and send a request.
          </div>
        ) : (
          <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {accepted.map((d, idx) => (
              <Link
                key={d.id}
                to={`/user/doctor/${d.id}/profile`}
                className="block"
              >
                <motion.div
                  initial={{ y: 8, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: idx * 0.03 }}
                  className="group rounded-xl sm:rounded-2xl border bg-slate-50/90 dark:bg-white/80 hover:bg-slate-100 dark:hover:bg-white transition p-3 sm:p-4 shadow-sm hover:shadow-md cursor-pointer"
                >
                  <div className="flex items-start gap-3">
                    {d.avatar ? (
                      <img src={fileUrl(d.avatar)} className="w-12 h-12 rounded-xl object-cover border" />
                    ) : (
                      <div className="w-12 h-12 rounded-xl bg-slate-300 dark:bg-slate-200" />
                    )}
                    <div className="flex-1">
                      <div className="font-semibold text-slate-800 dark:text-slate-900 group-hover:text-blue-600 dark:group-hover:text-blue-600 transition">
                        {d.fullName || d.name}
                      </div>
                      <div className="text-xs text-slate-700 dark:text-slate-600">{d.email}</div>
                      <div className="text-xs text-slate-800 dark:text-slate-700 mt-1">
                        {(d.gender ? `${d.gender} · ` : "")}{d.age ? `${d.age}y` : ""}
                      </div>
                      {(d.specialization || d.qualifications) && (
                        <div className="text-xs text-slate-800 dark:text-slate-700 mt-1">
                          {[d.specialization, d.qualifications].filter(Boolean).join(" · ")}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="mt-3 flex items-center gap-2 text-xs text-blue-600 font-medium">
                    <span>View Profile</span>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </motion.div>
              </Link>
            ))}
          </div>
        )}
      </Section>

      {/* Alerts — NEW */}
      <Section
        title="Alerts"
        right={
          <button
            onClick={loadAlerts}
            className="px-3 py-2 rounded-2xl border bg-slate-50/90 dark:bg-white/80 hover:bg-slate-100 dark:hover:bg-white transition text-slate-800 dark:text-slate-800"
          >
            Refresh
          </button>
        }
      >
        {loadingN ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-10 rounded-xl border animate-pulse bg-white/70" />
            ))}
          </div>
        ) : alerts.length === 0 ? (
          <div className="p-6 text-slate-700 dark:text-slate-600">No alerts yet.</div>
        ) : (
          <div className="divide-y divide-slate-200 dark:divide-slate-700">
            {alerts.map((n) => (
              <div key={n._id} className="py-2 text-sm">
                <div className="font-medium text-slate-800 dark:text-slate-900">
                  {n.type?.replace(/_/g, " ") || "notification"}
                </div>
                <div className="text-slate-800 dark:text-slate-700">{n.message}</div>
                <div className="text-xs text-slate-600 dark:text-slate-500">
                  {n.createdAt ? new Date(n.createdAt).toLocaleString() : ""}
                </div>
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* Therapy Sessions */}
      <Section
        title="My Therapy Sessions"
        right={
          <div className="flex gap-2">
            <Link
              to="/user/sessions"
              className="px-3 py-2 rounded-2xl border bg-white/80 hover:bg-white transition text-slate-800 text-sm"
            >
              View All
            </Link>
            <button
              onClick={loadSessions}
              className="px-3 py-2 rounded-2xl border bg-slate-50/90 dark:bg-white/80 hover:bg-slate-100 dark:hover:bg-white transition text-slate-800 dark:text-slate-800"
            >
              Refresh
            </button>
          </div>
        }
      >
        {loadingS ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-16 rounded-xl border animate-pulse bg-white/70" />
            ))}
          </div>
        ) : sessions.length === 0 ? (
          <div className="p-6 text-slate-700 dark:text-slate-600">No therapy sessions yet. Request therapy from a doctor to get started.</div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {sessions.slice(0, 6).map((session) => {
              const doctor = session.doctor || {};
              const statusLabel = (session.status || "").replace(/_/g, " ");
              const statusColor = 
                session.status === "responded" ? "bg-indigo-500/20 text-indigo-800 dark:text-indigo-700 border-indigo-400/30" :
                session.status === "accepted" ? "bg-emerald-500/20 text-emerald-800 dark:text-emerald-700 border-emerald-400/30" :
                session.status === "pending" ? "bg-yellow-500/20 text-yellow-800 dark:text-yellow-700 border-yellow-400/30" :
                "bg-slate-500/20 text-slate-800 dark:text-slate-700 border-slate-400/30";
              
              return (
                <Link
                  key={session.id}
                  to={`/user/session/${session.id}`}
                  className="rounded-2xl border bg-slate-50/90 dark:bg-white/80 hover:bg-slate-100 dark:hover:bg-white transition p-4 shadow-sm hover:shadow-md"
                >
                  <div className="flex items-start gap-3 mb-2">
                    {doctor.avatar || doctor.profilePhoto ? (
                      <img 
                        src={doctor.avatar || doctor.profilePhoto} 
                        className="w-12 h-12 rounded-xl object-cover border" 
                        alt={doctor.name}
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-xl bg-slate-300 dark:bg-slate-200" />
                    )}
                    <div className="flex-1">
                      <div className="font-semibold text-slate-800 dark:text-slate-900">{doctor.name || "Doctor"}</div>
                      <div className="text-xs text-slate-700 dark:text-slate-600">{doctor.email || ""}</div>
                    </div>
                  </div>
                  <div className={`text-xs px-2 py-1 rounded-full border inline-block ${statusColor}`}>
                    {statusLabel}
                  </div>
                  {session.instructions && (session.instructions.text || session.instructions.meds) && (
                    <div className="mt-2 text-xs text-emerald-600 font-medium">
                      ✓ Instructions available
                    </div>
                  )}
                </Link>
              );
            })}
          </div>
        )}
      </Section>

      {/* Saved Intake Drafts */}
      <Section
        title="Saved Intake Drafts"
        right={
          <button
            onClick={loadDrafts}
            className="px-3 py-2 rounded-2xl border bg-slate-50/90 dark:bg-white/80 hover:bg-slate-100 dark:hover:bg-white transition text-slate-800 dark:text-slate-800"
          >
            Refresh
          </button>
        }
      >
        {loadingD ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-16 rounded-xl border animate-pulse bg-white/70" />
            ))}
          </div>
        ) : drafts.length === 0 ? (
          <div className="p-6 text-slate-700 dark:text-slate-600">No saved drafts. Fill out an intake form and click "Save Draft" to save it here.</div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {drafts.map((draft) => {
              // Handle both populated and non-populated doctorId
              const doctor = typeof draft.doctorId === 'object' && draft.doctorId !== null 
                ? draft.doctorId 
                : {};
              const doctorId = typeof draft.doctorId === 'object' && draft.doctorId !== null
                ? draft.doctorId._id || draft.doctorId
                : draft.doctorId;
              
              return (
                <motion.div
                  key={draft._id}
                  initial={{ y: 8, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  className="rounded-2xl border bg-slate-50/90 dark:bg-white/80 hover:bg-slate-100 dark:hover:bg-white transition p-4 shadow-sm hover:shadow-md"
                >
                  <div className="flex items-start gap-3 mb-3">
                    {doctor.profilePhoto ? (
                      <img src={doctor.profilePhoto} className="w-12 h-12 rounded-xl object-cover border" />
                    ) : (
                      <div className="w-12 h-12 rounded-xl bg-slate-300 dark:bg-slate-200" />
                    )}
                    <div className="flex-1">
                      <div className="font-semibold text-slate-800 dark:text-slate-900">{doctor.name || "Doctor"}</div>
                      <div className="text-xs text-slate-700 dark:text-slate-600">{doctor.email || ""}</div>
                      {doctor.specialization && (
                        <div className="text-xs text-slate-800 dark:text-slate-700 mt-1">{doctor.specialization}</div>
                      )}
                    </div>
                  </div>
                  <div className="text-xs text-slate-700 dark:text-slate-600 mb-2">
                    Saved: {draft.updatedAt ? new Date(draft.updatedAt).toLocaleString() : ""}
                  </div>
                  <div className="flex gap-2">
                    <Link
                      to={`/patient-intake/${doctorId}`}
                      className="flex-1 btn btn-primary text-center text-sm py-2"
                    >
                      Continue
                    </Link>
                    <button
                      onClick={async () => {
                        if (confirm("Delete this draft?")) {
                          try {
                            await api.delete(`/user/intake-drafts/${doctorId}`);
                            await loadDrafts();
                          } catch (e) {
                            toast.error("Failed to delete draft");
                          }
                        }
                      }}
                      className="px-3 py-2 rounded-xl bg-red-500 hover:bg-red-600 text-white text-sm"
                    >
                      Delete
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </Section>

      {/* Top doctors preview (kept) */}
      <div className="glass rounded-2xl p-6 text-slate-900 dark:text-white">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Top Doctors</h2>
          <Link to="/user/doctors" className="text-sm underline text-slate-700 dark:text-white/80">
            View all
          </Link>
        </div>

        {topDocs.length === 0 ? (
          <div className="text-slate-700 dark:text-white/70 text-sm">No doctors yet.</div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {topDocs.map((d) => (
              <div key={d._id} className="card fade-in text-slate-900 dark:text-white">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-slate-200 dark:bg-white/10 grid place-items-center text-xs border border-slate-300 dark:border-white/20 text-slate-800 dark:text-white">
                    {d.name?.[0]?.toUpperCase() || "D"}
                  </div>
                  <div>
                    <div className="font-medium text-slate-900 dark:text-white">{d.name || "Doctor"}</div>
                    <div className="text-xs text-slate-700 dark:text-white/70">{d.email}</div>
                  </div>
                </div>
                <Link
                  to="/user/doctors"
                  className="btn btn-primary mt-3 w-full text-center"
                  title="Go to doctors list"
                >
                  Connect
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Latest Photo (kept) */}
      <div className="glass rounded-2xl p-6 text-slate-900 dark:text-white">
        <h2 className="text-lg font-semibold mb-3 text-slate-900 dark:text-white">Latest Photo</h2>
        {!photo ? (
          <div className="text-slate-800 dark:text-white/80">
            No photo yet. Please{" "}
            <Link className="underline text-slate-700 dark:text-white/90" to="/user/foot-photo">
              upload one
            </Link>
            .
          </div>
        ) : (
          <div className="space-y-3">
            {photo.annotated ? (
              <img
                src={fileUrl(photo.annotated)}
                alt="annotated"
                className="w-full max-w-xl rounded border border-slate-300 dark:border-white/20"
              />
            ) : (
              <img
                src={fileUrl(photo.filepath)}
                alt="raw"
                className="w-full max-w-xl rounded border border-slate-300 dark:border-white/20"
              />
            )}
            <div className="text-sm text-slate-800 dark:text-white/80">
              Alignment: {photo.aligned ? "Green (OK)" : "Red (Not aligned)"}
            </div>
          </div>
        )}
        {msg && (
          <div className="mt-3 p-3 rounded bg-white/10 border border-white/20">
            {msg}
          </div>
        )}
      </div>
    </div>
  );
}
