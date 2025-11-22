// client/src/pages/DoctorPatient.jsx
import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import api from "../api/axios";
import fileUrl from "../utils/fileUrl";
import toast from "../components/Toast";

export default function DoctorPatient() {
  const { id: userId } = useParams();
  const navigate = useNavigate();
  const [info, setInfo] = useState(null);
  const [photos, setPhotos] = useState([]);
  const [therapySessions, setTherapySessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedIntake, setExpandedIntake] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const [{ data: basic }, { data: ph }] = await Promise.all([
        api.get(`/patients/${userId}/basic`).catch(() => api.get(`/patients/${userId}`)),
        api.get(`/photos/user/${userId}?limit=8`).catch((e) => {
          if (import.meta.env.DEV) {
            console.error("Failed to load photos:", e?.response?.data || e.message);
          }
          // Try alternative endpoint
          return api.get(`/photos/by-user/${userId}?limit=8`).catch(() => ({ data: { photos: [], items: [] } }));
        })
      ]);
      
      setInfo(basic?.user ? basic : { user: basic?.user || {} });
      
      // Handle photos response - support multiple response formats
      const photoList = ph?.photos || ph?.items || [];
      if (import.meta.env.DEV) {
        if (photoList.length > 0) {
          console.log("📸 Loaded photos:", photoList.length, "First photo:", photoList[0]);
        } else {
          console.log("📸 No photos found for patient:", userId);
        }
      }
      setPhotos(photoList);
      
      // Fetch therapy sessions for this patient
      let sessionsCount = 0;
      try {
        const { data: sessionsData } = await api.get(`/sessions?userId=${userId}`);
        const patientSessions = (sessionsData?.items || sessionsData?.sessions || [])
          .map(s => ({
            ...s,
            _id: s._id || s.id,
            id: s.id || s._id,
          }))
          .sort((a, b) => new Date(b.createdAt || b.updatedAt || 0) - new Date(a.createdAt || a.updatedAt || 0));
        sessionsCount = patientSessions.length;
        setTherapySessions(patientSessions);
        if (import.meta.env.DEV) {
          console.log("📋 Therapy sessions loaded:", sessionsCount);
        }
      } catch (e) {
        if (import.meta.env.DEV) {
          console.error("Failed to load sessions:", e);
        }
        setTherapySessions([]);
        sessionsCount = 0;
      }
      
      if (import.meta.env.DEV) {
        console.log("📋 Patient loaded:", {
          user: basic?.user?.name,
          photosCount: ph?.photos?.length || ph?.items?.length || 0,
          sessionsCount: sessionsCount,
        });
      }
    } catch (e) {
      if (import.meta.env.DEV) {
        console.error("Failed to load patient:", e);
      }
      toast.error("Failed to load patient: " + (e?.response?.data?.message || e.message));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [userId]);

  if (loading) {
    return (
      <div className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur p-6 text-white">
        <div className="animate-pulse space-y-4">
          <div className="h-10 bg-white/10 rounded w-1/3" />
          <div className="h-28 bg-white/10 rounded" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {Array.from({ length: 8 }).map((_, i) => <div key={i} className="h-36 bg-white/10 rounded-xl" />)}
          </div>
        </div>
      </div>
    );
  }

  const user = info?.user || {};
  const intake = info?.latestIntake || {};

  return (
    <div className="p-3 sm:p-4 md:p-6 space-y-4 md:space-y-6 text-white">
      {/* Header / summary card */}
      <motion.div
        initial={{ y: 10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="rounded-2xl sm:rounded-3xl border border-white/10 bg-white/5 backdrop-blur p-4 sm:p-5 shadow-xl"
      >
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 sm:gap-4">
          <div className="flex items-center gap-4">
            {user.avatarUrl || user.profilePhoto ? (
              <img 
                src={fileUrl(user.avatarUrl || user.profilePhoto)} 
                alt={user.name || "Patient"} 
                className="w-16 h-16 rounded-2xl object-cover ring-2 ring-white/30" 
                onError={(e) => {
                  e.target.style.display = 'none';
                  if (e.target.nextSibling) {
                    e.target.nextSibling.style.display = 'flex';
                  }
                }}
              />
            ) : null}
            {(!user.avatarUrl && !user.profilePhoto) && (
              <div className="w-16 h-16 rounded-2xl bg-white/10 flex items-center justify-center text-white/50 text-xs">
                No Photo
              </div>
            )}
            <div>
              <div className="text-xl font-semibold text-white/95">{user.name || "Patient"}</div>
              <div className="text-sm text-white/70">{user.email || "—"}</div>
              {user.phone && <div className="text-sm text-white/70">📞 {user.phone}</div>}
              {user.age && <div className="text-sm text-white/70">{user.gender ? `${user.gender} · ` : ""}{user.age}y</div>}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              to={`/doctor/patient/${userId}/photos`}
              className="px-4 py-2.5 rounded-2xl border border-white/20 bg-white/10 hover:bg-white/20 text-white transition"
            >
              View all photos
            </Link>
          </div>
        </div>
      </motion.div>

      {/* Patient Details */}
      <motion.div
        initial={{ y: 10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.05 }}
        className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur p-4 shadow-xl"
      >
        <h2 className="font-semibold mb-3 text-white/95">Patient Details</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
          <Detail label="Name" value={user.name} />
          <Detail label="Email" value={user.email} />
          <Detail label="Phone" value={user.phone} />
          {user.gender && <Detail label="Gender" value={user.gender} />}
          {user.age && <Detail label="Age" value={`${user.age} years`} />}
          {user.address && <Detail label="Address" value={user.address} />}
        </div>
      </motion.div>

      {/* Pain/Intake Information */}
      {intake && (intake.painDescription || intake.fullName) && (
        <motion.div
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur p-4 shadow-xl"
        >
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-white/95">Pain & Health Information</h2>
            <button
              onClick={() => setExpandedIntake(!expandedIntake)}
              className="px-3 py-1 rounded-xl bg-white/10 hover:bg-white/20 text-white/80 text-sm transition"
            >
              {expandedIntake ? "Hide" : "Show Details"}
            </button>
          </div>
          
          {expandedIntake && (
            <div className="space-y-3 text-sm">
              {intake.fullName && (
                <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                  <div className="text-white/60 mb-1">Full Name</div>
                  <div className="text-white/90">{intake.fullName}</div>
                </div>
              )}
              <div className="grid md:grid-cols-2 gap-3">
                {intake.age && <Detail label="Age" value={intake.age} />}
                {intake.gender && <Detail label="Gender" value={intake.gender} />}
                {intake.livingArea && <Detail label="Location" value={intake.livingArea} />}
                {intake.bloodType && <Detail label="Blood Type" value={intake.bloodType} />}
                {intake.painLocation && <Detail label="Pain Location" value={intake.painLocation} />}
                {intake.painDuration && <Detail label="Duration" value={intake.painDuration} />}
                {intake.painSeverity && <Detail label="Severity" value={intake.painSeverity} />}
              </div>
              {intake.painDescription && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20">
                  <div className="text-rose-300 mb-2 font-medium">Pain Description</div>
                  <div className="text-white/90">{intake.painDescription}</div>
                </div>
              )}
              {intake.otherNotes && (
                <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20">
                  <div className="text-blue-300 mb-2 font-medium">Additional Notes</div>
                  <div className="text-white/90">{intake.otherNotes}</div>
                </div>
              )}
            </div>
          )}
        </motion.div>
      )}

      {/* Therapy History Section */}
      <motion.div
        initial={{ y: 10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.15 }}
        className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur p-4 shadow-xl"
      >
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-white/95">Therapy History</h2>
          {therapySessions.length > 0 && (
            <span className="text-sm text-white/70">{therapySessions.length} session{therapySessions.length !== 1 ? 's' : ''}</span>
          )}
        </div>

        {therapySessions.length === 0 ? (
          <div className="text-white/70 text-center py-8">
            <div className="mb-2">No therapy sessions yet.</div>
            <button
              onClick={async () => {
                try {
                  const { data } = await api.post("/sessions/start", { userId });
                  if (data?.id) {
                    navigate(`/doctor/session/${data.id}`);
                  } else {
                    toast.error("Failed to create session");
                  }
                } catch (e) {
                  toast.error(e?.response?.data?.message || e.message || "Failed to start therapy");
                }
              }}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white transition"
            >
              Start First Therapy Session
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {therapySessions.map((session, idx) => (
              <motion.div
                key={session._id || session.id || idx}
                initial={{ x: -10, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: idx * 0.05 }}
                className="p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`px-2 py-1 rounded-lg text-xs font-medium ${
                        session.status === 'completed' ? 'bg-emerald-500/20 text-emerald-300' :
                        session.status === 'active' ? 'bg-blue-500/20 text-blue-300' :
                        'bg-yellow-500/20 text-yellow-300'
                      }`}>
                        {session.status || 'pending'}
                      </span>
                      <span className="text-xs text-white/60">
                        {new Date(session.createdAt || session.updatedAt).toLocaleDateString()}
                      </span>
                    </div>
                    
                    {session.instructions?.text && (
                      <div className="text-sm text-white/80 mt-2 line-clamp-2">
                        {session.instructions.text}
                      </div>
                    )}
                    
                    {session.marmaPlan && session.marmaPlan.length > 0 && (
                      <div className="mt-2 text-xs text-white/70">
                        {session.marmaPlan.length} Marma point{session.marmaPlan.length !== 1 ? 's' : ''} defined
                      </div>
                    )}
                  </div>
                  
                  <button
                    onClick={() => navigate(`/doctor/session/${session._id || session.id}`)}
                    className="ml-4 px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white/80 text-sm transition"
                  >
                    View
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>

      {/* Recent Photos */}
      <motion.div
        initial={{ y: 10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur p-4 shadow-xl"
      >
        <h2 className="font-semibold mb-3 text-white/95">Recent Foot Photos</h2>
        {photos.length === 0 ? (
          <div className="text-white/70 text-center py-8">No photos yet.</div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {photos.map((p) => {
              const photoUrl = p.annotated || p.filepath || p.url || p.raw;
              return (
                <motion.div
                  key={p._id || p.id}
                  whileHover={{ scale: 1.02 }}
                  className="relative group rounded-2xl overflow-hidden border border-white/10 bg-white/5"
                  title={new Date(p.createdAt).toLocaleString()}
                >
                  {photoUrl ? (
                    <img 
                      src={fileUrl(photoUrl)} 
                      alt="Foot photo" 
                      className="w-full h-40 object-cover" 
                      onError={(e) => {
                        // Fallback if image fails to load
                        e.target.style.display = 'none';
                        if (e.target.nextSibling) {
                          e.target.nextSibling.style.display = 'flex';
                        }
                      }}
                    />
                  ) : null}
                  <div className="w-full h-40 flex items-center justify-center bg-slate-800/50" style={{ display: photoUrl ? 'none' : 'flex' }}>
                    <span className="text-white/60 text-sm">No Image</span>
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent opacity-0 group-hover:opacity-100 transition" />
                  <div className="absolute bottom-2 left-2 text-[11px] text-white/90 bg-black/40 px-2 py-0.5 rounded-full">
                    {new Date(p.createdAt || p.updatedAt || Date.now()).toLocaleDateString()}
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </motion.div>
    </div>
  );
}

function Detail({ label, value }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
      <div className="text-white/60 text-xs mb-1">{label}</div>
      <div className="font-medium text-white/90">{value || "—"}</div>
    </div>
  );
}
