// client/src/api/axios.js
import axios from "axios";

// Prefer VITE_API_BASE; fallback to VITE_API_URL; then infer sane default for dev.
let rawBase = import.meta.env.VITE_API_BASE || import.meta.env.VITE_API_URL;

if (!rawBase) {
  const origin = window.location.origin;
  const isViteDev =
    origin.includes("localhost:5173") ||
    origin.includes("127.0.0.1:5173") ||
    origin.includes("localhost:4173") ||
    origin.includes("127.0.0.1:4173");

  rawBase = isViteDev ? "http://localhost:5000" : origin;
}

// Normalize: trim trailing / and strip a trailing /api if someone put it in env
rawBase = String(rawBase).replace(/\/$/, "").replace(/\/api$/i, "");

// Log once so you can see it in DevTools
if (!window.__API_BASE_LOGGED) {
  window.__API_BASE_LOGGED = true;
  console.info("[axios] API_BASE =", rawBase, "(final baseURL:", `${rawBase}/api`, ")");
}
window.__API_BASE = rawBase;

const api = axios.create({
  baseURL: `${rawBase}/api`,
  timeout: 15000,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    const status = err?.response?.status;
    if (status === 401) {
      // Only redirect if not already on login page to prevent infinite loops
      if (window.location.pathname !== "/login" && window.location.pathname !== "/signup") {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        localStorage.removeItem("role");
        localStorage.removeItem("name");
        localStorage.removeItem("email");
        // Use replace to avoid adding to history stack
        window.location.replace("/login");
      }
    }
    return Promise.reject(err);
  }
);

export default api;
