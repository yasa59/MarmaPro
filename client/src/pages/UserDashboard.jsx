// client/src/pages/UserDashboard.jsx
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import api from "../api/axios";
import fileUrl from "../utils/fileUrl.js";
import CallButton from "../components/CallButton";

function Section({ title, children, right }) {
  return (
    <div className="rounded-3xl border border-white/30 bg-white/70 backdrop-blur p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg md:text-xl font-semibold text-slate-800">{title}</h2>
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

  const [loadingA, setLoadingA] = useState(true);
  const [loadingN, setLoadingN] = useState(true);
  const [loadingD, setLoadingD] = useState(true);

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
      console.error("loadAccepted:", e?.response || e);
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
      console.error("loadAlerts:", e?.response || e);
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
      console.error("loadDrafts:", e?.response || e);
      setDrafts([]);
    } finally {
      setLoadingD(false);
    }
  }

  useEffect(() => {
    loadGreetingAndLatestPhoto();
    loadTopDoctors();
    loadAccepted();
    loadAlerts();
    loadDrafts();
  }, []);

  return (
    <div className="max-w-5xl mx-auto p-6 text-white space-y-6">
      {/* Welcome + quick actions (kept) */}
      <div className="glass rounded-2xl p-6">
        <h1 className="text-2xl font-bold">
          {displayName ? `Welcome to iMarma Therapy, ${displayName}` : "User Dashboard"}
        </h1>
        <p className="text-sm text-white/80 mt-1">
          Upload your foot image, connect with a doctor, and follow instructions.
        </p>

        <div className="grid md:grid-cols-3 gap-3 mt-5">
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
            className="px-3 py-2 rounded-2xl border bg-white/80 hover:bg-white transition text-slate-800"
          >
            Refresh
          </button>
        }
      >
        {loadingA ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="rounded-2xl p-4 border animate-pulse bg-white/70 h-24" />
            ))}
          </div>
        ) : accepted.length === 0 ? (
          <div className="p-6 text-slate-600">
            No doctor has accepted yet. Go to <b>Find Doctors</b> and send a request.
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {accepted.map((d, idx) => (
              <motion.div
                key={d.id}
                initial={{ y: 8, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: idx * 0.03 }}
                className="group rounded-2xl border bg-white/80 hover:bg-white transition p-4 shadow-sm hover:shadow-md"
              >
                <div className="flex items-start gap-3">
                  {d.avatar ? (
                    <img src={d.avatar} className="w-12 h-12 rounded-xl object-cover border" />
                  ) : (
                    <div className="w-12 h-12 rounded-xl bg-slate-200" />
                  )}
                  <div className="flex-1">
                    <div className="font-semibold text-slate-900">{d.name}</div>
                    <div className="text-xs text-slate-600">{d.email}</div>
                    <div className="text-xs text-slate-700 mt-1">
                      {(d.gender ? `${d.gender} · ` : "")}{d.age ? `${d.age}y` : ""}
                    </div>
                    {(d.specialization || d.qualifications) && (
                      <div className="text-xs text-slate-700 mt-1">
                        {[d.specialization, d.qualifications].filter(Boolean).join(" · ")}
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  <CallButton partnerId={d.id} label="Connect now" variant="outline" />
                </div>
              </motion.div>
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
            className="px-3 py-2 rounded-2xl border bg-white/80 hover:bg-white transition text-slate-800"
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
          <div className="p-6 text-slate-600">No alerts yet.</div>
        ) : (
          <div className="divide-y">
            {alerts.map((n) => (
              <div key={n._id} className="py-2 text-sm">
                <div className="font-medium text-slate-900">
                  {n.type?.replace(/_/g, " ") || "notification"}
                </div>
                <div className="text-slate-700">{n.message}</div>
                {n.meta?.roomId && (
                  <div className="mt-1">
                    <CallButton
                      partnerId={n.meta?.doctorId || n.meta?.userId}
                      label="Join call"
                      variant="solid"
                    />
                  </div>
                )}
                <div className="text-xs text-slate-500">
                  {n.createdAt ? new Date(n.createdAt).toLocaleString() : ""}
                </div>
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* Saved Intake Drafts */}
      <Section
        title="Saved Intake Drafts"
        right={
          <button
            onClick={loadDrafts}
            className="px-3 py-2 rounded-2xl border bg-white/80 hover:bg-white transition text-slate-800"
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
          <div className="p-6 text-slate-600">No saved drafts. Fill out an intake form and click "Save Draft" to save it here.</div>
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
                  className="rounded-2xl border bg-white/80 hover:bg-white transition p-4 shadow-sm hover:shadow-md"
                >
                  <div className="flex items-start gap-3 mb-3">
                    {doctor.profilePhoto ? (
                      <img src={doctor.profilePhoto} className="w-12 h-12 rounded-xl object-cover border" />
                    ) : (
                      <div className="w-12 h-12 rounded-xl bg-slate-200" />
                    )}
                    <div className="flex-1">
                      <div className="font-semibold text-slate-900">{doctor.name || "Doctor"}</div>
                      <div className="text-xs text-slate-600">{doctor.email || ""}</div>
                      {doctor.specialization && (
                        <div className="text-xs text-slate-700 mt-1">{doctor.specialization}</div>
                      )}
                    </div>
                  </div>
                  <div className="text-xs text-slate-600 mb-2">
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
                            alert("Failed to delete draft");
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
      <div className="glass rounded-2xl p-6">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-semibold">Top Doctors</h2>
          <Link to="/user/doctors" className="text-sm underline">
            View all
          </Link>
        </div>

        {topDocs.length === 0 ? (
          <div className="text-white/70 text-sm">No doctors yet.</div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {topDocs.map((d) => (
              <div key={d._id} className="card fade-in">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-white/10 grid place-items-center text-xs border border-white/20">
                    {d.name?.[0]?.toUpperCase() || "D"}
                  </div>
                  <div>
                    <div className="font-medium">{d.name || "Doctor"}</div>
                    <div className="text-xs text-white/70">{d.email}</div>
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
      <div className="glass rounded-2xl p-6">
        <h2 className="text-lg font-semibold mb-3">Latest Photo</h2>
        {!photo ? (
          <div className="text-white/80">
            No photo yet. Please{" "}
            <Link className="underline" to="/user/foot-photo">
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
                className="w-full max-w-xl rounded border border-white/20"
              />
            ) : (
              <img
                src={fileUrl(photo.filepath)}
                alt="raw"
                className="w-full max-w-xl rounded border border-white/20"
              />
            )}
            <div className="text-sm text-white/80">
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
