// client/src/pages/Signup.jsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";

export default function Signup() {
  const nav = useNavigate();

  // role toggle: "user" or "doctor"
  const [role, setRole] = useState("user");

  // common fields
  const [name, setName]       = useState("");
  const [email, setEmail]     = useState("");
  const [password, setPass]   = useState("");

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
      <div className="w-full max-w-lg rounded-2xl border border-white/20 bg-white/10 backdrop-blur shadow-xl p-6 text-white">
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
            className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:opacity-90 transition font-semibold"
            disabled={busy}
          >
            {busy ? "Submitting…" : role === "doctor" ? "Submit for Review" : "Sign up"}
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
      </div>
    </div>
  );
}
