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

// Log once so you can see it in DevTools (only in development)
if (import.meta.env.DEV && !window.__API_BASE_LOGGED) {
  window.__API_BASE_LOGGED = true;
  console.info("[axios] API_BASE =", rawBase, "(final baseURL:", `${rawBase}/api`, ")");
}
window.__API_BASE = rawBase;

const api = axios.create({
  baseURL: `${rawBase}/api`,
  timeout: 15000,
});

// Retry configuration
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const shouldRetry = (error) => {
  if (!error.response) {
    // Network error - retry
    return true;
  }
  const status = error.response.status;
  // Retry on 5xx errors and 429 (rate limit)
  return status >= 500 || status === 429;
};

// Request interceptor
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Combined response interceptor: handles retry logic AND error handling
api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const config = err.config;
    const status = err?.response?.status;

    // Handle 401 unauthorized - redirect to login (don't retry)
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
      return Promise.reject(err);
    }

    // Retry logic for network errors and 5xx/429 errors
    if (config && shouldRetry(err)) {
      // Set retry count
      config.__retryCount = config.__retryCount || 0;

      // Check if we should retry
      if (config.__retryCount >= MAX_RETRIES) {
        return Promise.reject(err);
      }

      // Increment retry count
      config.__retryCount += 1;

      // Wait before retrying (exponential backoff)
      const delay = RETRY_DELAY * Math.pow(2, config.__retryCount - 1);
      await sleep(delay);

      // Retry the request
      return api(config);
    }

    // For all other errors, reject immediately
    return Promise.reject(err);
  }
);

export default api;
