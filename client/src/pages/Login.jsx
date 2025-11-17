// client/src/pages/Login.jsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import axios from "axios";            // one-off absolute call to prove connectivity
import api from "../api/axios";
import { useAuth } from "../context/AuthContext";
import routeByRole from "../utils/routeByRole";

export default function Login() {
  const [stage, setStage]   = useState("form");   // "form" -> "otp"
  const [email, setEmail]   = useState("");
  const [password, setPass] = useState("");
  const [code, setCode]     = useState("");
  const [loading, setBusy]  = useState(false);
  const [err, setErr]       = useState("");

  const nav = useNavigate();
  const { loginSuccess } = useAuth(); // save { token, user } (with role)

  async function onLogin() {
    setBusy(true); setErr("");
    try {
      // Build absolute URL explicitly to avoid any baseURL mishaps
      const base =
        (window.__API_BASE ||
          import.meta.env.VITE_API_BASE ||
          import.meta.env.VITE_API_URL ||
          window.location.origin)
          .replace(/\/$/, "")
          .replace(/\/api$/i, "");

      const url = `${base}/api/auth/login`;
      console.log("Login → POST", url);

      // One-off absolute call (bypasses axios instance baseURL)
      await axios.post(url, { email, password }, { withCredentials: false });

      setStage("otp");
    } catch (e) {
      const status = e?.response?.status;
      const reqUrl = e?.request?.responseURL || "(no responseURL)";
      console.error("Login error:", { status, url: reqUrl, data: e?.response?.data, e });
      if (status === 404) {
        setErr(`Login endpoint not found (404).\nRequest URL: ${reqUrl}\nCheck VITE_API_BASE and that the server mounts /api/auth.`);
      } else {
        setErr(e?.response?.data?.message || e.message);
      }
    } finally {
      setBusy(false);
    }
  }

  async function onVerify() {
    setBusy(true); setErr("");
    try {
      const { data } = await api.post("/auth/verify-otp", { email, code });
      loginSuccess({ token: data.token, user: data.user });
      nav(routeByRole(data.user?.role), { replace: true });
    } catch (e) {
      const status = e?.response?.status;
      const reqUrl = e?.request?.responseURL || "(no responseURL)";
      console.error("Verify OTP error:", { status, url: reqUrl, data: e?.response?.data });
      setErr(e?.response?.data?.message || e.message);
    } finally {
      setBusy(false);
    }
  }

  async function onResend() {
    setBusy(true); setErr("");
    try {
      await api.post("/auth/resend-otp", { email });
      alert("OTP resent to your email.");
    } catch (e) {
      const status = e?.response?.status;
      const reqUrl = e?.request?.responseURL || "(no responseURL)";
      console.error("Resend OTP error:", { status, url: reqUrl, data: e?.response?.data });
      setErr(e?.response?.data?.message || e.message);
    } finally {
      setBusy(false);
    }
  }

  async function debugPing() {
    try {
      const { data } = await api.get("/auth/health");
      alert(`Health OK: ${JSON.stringify(data)}`);
    } catch (e) {
      alert(`Health FAIL: ${e?.response?.status} ${e?.request?.responseURL || ""}`);
    }
  }

  return (
    <div className="min-h-[80vh] grid place-items-center px-4">
      <motion.div
        className="w-full max-w-md glass-strong rounded-3xl p-8 text-white"
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5 }}
      >
        <div className="mb-5 text-center">
          <h1 className="text-3xl font-extrabold tracking-tight">iMarma Therapy</h1>
          <p className="text-white/80 mt-1"></p>
          <div className="text-xs text-white/60 mt-2">
            
            
          </div>
        </div>

        {err && (
          <div className="mb-4 rounded-lg border border-red-300/30 bg-red-500/10 px-3 py-2 text-sm text-red-200 whitespace-pre-wrap">
            {err}
          </div>
        )}

        {stage === "form" ? (
          <>
            <label className="block text-sm mb-1">Email</label>
            <input
              className="w-full p-3 rounded-lg bg-white/15 border border-white/20 outline-none mb-3"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              autoComplete="username"
            />

            <label className="block text-sm mb-1">Password</label>
            <input
              type="password"
              className="w-full p-3 rounded-lg bg-white/15 border border-white/20 outline-none mb-5"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPass(e.target.value)}
              autoComplete="current-password"
            />

            <button
              onClick={onLogin}
              className="btn btn-primary w-full py-4"
              disabled={loading}
            >
              <span className="relative z-10">{loading ? "Sending OTP…" : "Login"}</span>
            </button>

            <p className="text-xs text-white/60 mt-3">
              Tip: Check your inbox (and spam) for the 6-digit code after pressing Login.
            </p>
          </>
        ) : (
          <>
            <label className="block text-sm mb-1">Enter 6-digit OTP</label>
            <input
              className="w-full p-3 rounded-lg bg-white/15 border border-white/20 outline-none mb-4 tracking-widest text-center"
              placeholder="123456"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              inputMode="numeric"
              maxLength={6}
            />

            <div className="flex gap-3">
              <button
                onClick={onVerify}
                className="btn btn-secondary flex-1 py-4"
                disabled={loading}
              >
                <span className="relative z-10">{loading ? "Verifying…" : "Verify OTP"}</span>
              </button>
              <button
                onClick={onResend}
                className="btn btn-outline px-6 py-4"
                disabled={loading}
              >
                <span className="relative z-10">Resend</span>
              </button>
            </div>

            <p className="text-xs text-white/60 mt-3">
              Didn’t get it? Click <span className="underline">Resend</span> and try again.
            </p>
          </>
        )}
      </motion.div>
    </div>
  );
}
