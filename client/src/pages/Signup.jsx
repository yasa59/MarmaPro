// client/src/pages/Signup.jsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import api from "../api/axios";

export default function Signup() {
  const nav = useNavigate();

  // role toggle: "user" or "doctor"
  const [role, setRole] = useState("user");

  // common fields
  const [name, setName]       = useState("");
  const [email, setEmail]     = useState("");
  const [password, setPass]   = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // doctor-only fields
  const [profilePhoto, setProfilePhoto] = useState(null);
  const [documentFile, setDocumentFile] = useState(null);

  const [busy, setBusy] = useState(false);
  const [msg, setMsg]   = useState("");
  const [err, setErr]   = useState("");

  async function onSubmit(e) {
    e.preventDefault();
    setMsg("");
    setErr("");

    // Validate passwords match
    if (password !== confirmPassword) {
      setErr("Passwords do not match. Please try again.");
      return;
    }

    // Validate password length
    if (password.length < 6) {
      setErr("Password must be at least 6 characters long.");
      return;
    }

    setBusy(true);

    try {
      if (role === "user") {
        // Simple JSON payload for patients
        const { data } = await api.post("/auth/signup", { name, email, password, role: "user" });
        setMsg(data?.message || "Account created. Please log in.");
        nav("/login", { replace: true });
      } else {
        // Doctor: use FormData for file uploads
        const fd = new FormData();
        fd.append("name", name);
        fd.append("email", email);
        fd.append("password", password);
        fd.append("role", "doctor");
        if (profilePhoto) fd.append("profilePhoto", profilePhoto);
        if (documentFile) fd.append("document", documentFile);

        const { data } = await api.post("/auth/signup", fd);
        // Expected server message: “Doctor signup submitted. Admin will review and approve.”
        setMsg(data?.message || "Submitted for review. You’ll get an email when approved.");
        nav("/login", { replace: true });
      }
    } catch (e) {
      setErr(e?.response?.data?.message || e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-[80vh] grid place-items-center px-4">
      <motion.div
        className="w-full max-w-lg glass-strong rounded-3xl p-8 text-white"
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5 }}
      >
        <div className="mb-6 text-center">
          <h1 className="text-3xl font-extrabold tracking-tight">Create Account</h1>
          <p className="text-white/80 mt-1">Join iMarma Therapy</p>
        </div>

        {/* role switch */}
        <div className="grid grid-cols-2 rounded-xl overflow-hidden border border-white/20 mb-5">
          <button
            type="button"
            className={`py-2 font-semibold transition ${role === "user" ? "bg-emerald-500 text-blue-900" : "bg-white/10 text-white/80 hover:bg-white/15"}`}
            onClick={() => setRole("user")}
          >
            I’m a Patient
          </button>
          <button
            type="button"
            className={`py-2 font-semibold transition ${role === "doctor" ? "bg-emerald-500 text-blue-900" : "bg-white/10 text-white/80 hover:bg-white/15"}`}
            onClick={() => setRole("doctor")}
          >
            I’m a Doctor
          </button>
        </div>

        {err && (
          <div className="mb-4 rounded-lg border border-red-300/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
            {err}
          </div>
        )}
        {msg && (
          <div className="mb-4 rounded-lg border border-emerald-300/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200">
            {msg}
          </div>
        )}

        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="block text-sm mb-1">Full name</label>
            <input
              className="w-full p-3 rounded-lg bg-white/15 border border-white/20 outline-none"
              placeholder="Jane Doe"
              value={name}
              onChange={(e) => setName(e.target.value)}
              type="text"
              required
            />
          </div>

          <div>
            <label className="block text-sm mb-1">Email</label>
            <input
              className="w-full p-3 rounded-lg bg-white/15 border border-white/20 outline-none"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              autoComplete="username"
              required
            />
          </div>

          <div>
            <label className="block text-sm mb-1">Password</label>
            <input
              className="w-full p-3 rounded-lg bg-white/15 border border-white/20 outline-none"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPass(e.target.value)}
              type="password"
              autoComplete="new-password"
              required
              minLength={6}
            />
            <p className="text-xs text-white/60 mt-1">Must be at least 6 characters</p>
          </div>

          <div>
            <label className="block text-sm mb-1">Confirm Password</label>
            <input
              className="w-full p-3 rounded-lg bg-white/15 border border-white/20 outline-none"
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              type="password"
              autoComplete="new-password"
              required
              minLength={6}
            />
            {confirmPassword && password !== confirmPassword && (
              <p className="text-xs text-red-300 mt-1">⚠️ Passwords do not match</p>
            )}
            {confirmPassword && password === confirmPassword && password.length >= 6 && (
              <p className="text-xs text-emerald-300 mt-1">✅ Passwords match</p>
            )}
          </div>

          {role === "doctor" && (
            <div className="rounded-xl border border-white/20 p-4 bg-white/5 space-y-3">
              <p className="text-sm font-semibold">Doctor Verification</p>

              <label className="block text-sm">
                Profile Photo (optional)
                <input
                  type="file"
                  accept="image/*"
                  className="mt-1 block w-full text-white/90"
                  onChange={(e) => setProfilePhoto(e.target.files?.[0] || null)}
                />
              </label>

              <label className="block text-sm">
                Certificate / Registration (PDF or image)
                <input
                  type="file"
                  accept=".pdf,image/*"
                  className="mt-1 block w-full text-white/90"
                  onChange={(e) => setDocumentFile(e.target.files?.[0] || null)}
                />
              </label>

              <p className="text-xs text-white/70">
                After submitting, an admin will review your documents. You’ll receive an email when approved.
              </p>
            </div>
          )}

          <button
            className="btn btn-primary w-full py-4"
            disabled={busy}
          >
            <span className="relative z-10">{busy ? "Submitting…" : role === "doctor" ? "Submit for Review" : "Sign up"}</span>
          </button>

          {role === "doctor" ? (
            <p className="text-xs text-white/60">
              You’ll be able to log in after approval.
            </p>
          ) : (
            <p className="text-xs text-white/60">
              After creating your account, log in with email + OTP.
            </p>
          )}
        </form>
      </motion.div>
    </div>
  );
}
