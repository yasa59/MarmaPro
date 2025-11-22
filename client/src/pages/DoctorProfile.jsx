// client/src/pages/DoctorProfile.jsx
import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import api from "../api/axios";
import fileUrl from "../utils/fileUrl";

export default function DoctorProfile() {
  const { id: doctorId } = useParams();
  const navigate = useNavigate();
  const [doctor, setDoctor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadDoctor();
  }, [doctorId]);

  async function loadDoctor() {
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.get(`/doctors/${doctorId}/profile/connected`);
      setDoctor(data);
    } catch (e) {
      if (import.meta.env.DEV) {
        console.error("Failed to load doctor:", e);
      }
      setError(e?.response?.data?.message || "Failed to load doctor profile");
      if (e?.response?.status === 403) {
        // Not connected - redirect after a moment
        setTimeout(() => navigate("/user"), 2000);
      }
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-6 text-slate-900 dark:text-white">
        <div className="rounded-3xl border border-slate-300 dark:border-white/10 bg-slate-50/90 dark:bg-white/5 backdrop-blur p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-10 bg-slate-200 dark:bg-white/10 rounded w-1/3" />
            <div className="h-28 bg-slate-200 dark:bg-white/10 rounded" />
            <div className="h-20 bg-slate-200 dark:bg-white/10 rounded" />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto p-6 text-white">
        <div className="rounded-3xl border border-red-500/30 bg-red-500/10 backdrop-blur p-6 text-center">
          <h2 className="text-xl font-semibold mb-2">Error</h2>
          <p className="text-white/80">{error}</p>
          <button
            onClick={() => navigate("/user")}
            className="mt-4 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (!doctor) {
    return (
      <div className="max-w-4xl mx-auto p-6 text-white">
        <div className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur p-6 text-center">
          <h2 className="text-xl font-semibold mb-2">Doctor Not Found</h2>
          <button
            onClick={() => navigate("/user")}
            className="mt-4 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-3 sm:p-4 md:p-6 text-slate-900 dark:text-white space-y-4 md:space-y-6">
      {/* Back button */}
      <Link
        to="/user"
        className="inline-flex items-center gap-2 text-slate-700 dark:text-white/80 hover:text-slate-900 dark:hover:text-white transition text-sm sm:text-base"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Back to Dashboard
      </Link>

      {/* Doctor Header Card */}
      <motion.div
        initial={{ y: 10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="rounded-2xl sm:rounded-3xl border border-white/10 bg-white/5 backdrop-blur p-4 sm:p-6 shadow-xl"
      >
        <div className="flex flex-col md:flex-row md:items-center gap-4 sm:gap-6">
          {/* Profile Photo */}
          <div className="flex-shrink-0 mx-auto md:mx-0">
            {doctor.profilePhoto || doctor.avatarUrl ? (
              <img
                src={fileUrl(doctor.profilePhoto || doctor.avatarUrl)}
                alt={doctor.name || "Doctor"}
                className="w-24 h-24 sm:w-32 sm:h-32 rounded-xl sm:rounded-2xl object-cover ring-4 ring-white/20 shadow-lg"
                onError={(e) => {
                  e.target.style.display = 'none';
                  if (e.target.nextSibling) {
                    e.target.nextSibling.style.display = 'flex';
                  }
                }}
              />
            ) : null}
            {(!doctor.profilePhoto && !doctor.avatarUrl) && (
              <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-xl sm:rounded-2xl bg-slate-200 dark:bg-white/10 flex items-center justify-center text-3xl sm:text-4xl font-bold text-slate-600 dark:text-white/50">
                {doctor.name?.[0]?.toUpperCase() || "D"}
              </div>
            )}
          </div>

          {/* Doctor Info */}
          <div className="flex-1">
            <div className="flex items-start justify-between gap-4">
              <div className="text-center md:text-left">
                <h1 className="text-2xl sm:text-3xl font-bold mb-2 text-slate-900 dark:text-white">{doctor.fullName || doctor.name}</h1>
                {doctor.title && (
                  <div className="text-sm text-slate-700 dark:text-white/70 mb-1">{doctor.title}</div>
                )}
                {doctor.fullName && doctor.name && doctor.fullName !== doctor.name && (
                  <div className="text-sm text-slate-600 dark:text-white/60 mb-1">({doctor.name})</div>
                )}
                <div className="text-slate-800 dark:text-white/80 mb-3">{doctor.email}</div>
                
                {/* Basic Info */}
                <div className="flex flex-wrap gap-4 text-sm text-slate-700 dark:text-white/70 mb-3">
                  {doctor.gender && <span>Gender: {doctor.gender}</span>}
                  {doctor.age && <span>Age: {doctor.age}y</span>}
                  {doctor.phone && <span>Phone: {doctor.phone}</span>}
                </div>

                {/* Specialization & Qualifications */}
                {(doctor.specialization || doctor.qualifications) && (
                  <div className="flex flex-wrap gap-2 mb-3">
                    {doctor.specialization && (
                      <span className="px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30 text-sm">
                        {doctor.specialization}
                      </span>
                    )}
                    {doctor.qualifications && (
                      <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-sm">
                        {doctor.qualifications}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Bio Section */}
      {doctor.bio && (
        <motion.div
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="rounded-2xl sm:rounded-3xl border border-slate-300 dark:border-white/10 bg-slate-50/90 dark:bg-white/5 backdrop-blur p-4 sm:p-6 shadow-xl"
        >
          <h2 className="text-lg sm:text-xl font-semibold mb-3 text-slate-900 dark:text-white">About</h2>
          <p className="text-slate-800 dark:text-white/80 leading-relaxed whitespace-pre-wrap">{doctor.bio}</p>
        </motion.div>
      )}

      {/* Connection Info */}
        <motion.div
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="rounded-2xl sm:rounded-3xl border border-slate-300 dark:border-white/10 bg-slate-50/90 dark:bg-white/5 backdrop-blur p-4 sm:p-6 shadow-xl"
        >
          <h2 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4 text-slate-900 dark:text-white">Connection Details</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
            <div>
              <div className="text-sm text-slate-600 dark:text-white/60 mb-1">Status</div>
              <div className="text-slate-800 dark:text-white/90 font-medium capitalize">
                {doctor.connectionStatus === 'accepted' ? 'Approved' : doctor.connectionStatus}
              </div>
            </div>
            {doctor.connectedAt && (
              <div>
                <div className="text-sm text-slate-600 dark:text-white/60 mb-1">Connected Since</div>
                <div className="text-slate-800 dark:text-white/90">
                {new Date(doctor.connectedAt).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </div>
            </div>
          )}
            {doctor.createdAt && (
              <div>
                <div className="text-sm text-slate-600 dark:text-white/60 mb-1">Member Since</div>
                <div className="text-slate-800 dark:text-white/90">
                {new Date(doctor.createdAt).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long'
                })}
              </div>
            </div>
          )}
        </div>
      </motion.div>

      {/* Document Section */}
      {doctor.documentPath && (
        <motion.div
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="rounded-2xl sm:rounded-3xl border border-slate-300 dark:border-white/10 bg-slate-50/90 dark:bg-white/5 backdrop-blur p-4 sm:p-6 shadow-xl"
        >
          <h2 className="text-lg sm:text-xl font-semibold mb-3 text-slate-900 dark:text-white">Credentials</h2>
          <a
            href={fileUrl(doctor.documentPath)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 border border-blue-500/30 transition"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            View Doctor's Document
          </a>
        </motion.div>
      )}

      {/* Action Buttons */}
      <motion.div
        initial={{ y: 10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="flex flex-col sm:flex-row flex-wrap gap-2 sm:gap-3"
      >
        <Link
          to={`/patient-intake/${doctorId}`}
          className="px-4 sm:px-6 py-2.5 sm:py-3 rounded-xl bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-medium transition shadow-lg text-center text-sm sm:text-base"
        >
          Request Therapy Session
        </Link>
        <Link
          to="/user/sessions"
          className="px-4 sm:px-6 py-2.5 sm:py-3 rounded-xl border border-white/20 bg-white/10 hover:bg-white/20 text-white font-medium transition text-center text-sm sm:text-base"
        >
          View My Sessions
        </Link>
      </motion.div>
    </div>
  );
}

