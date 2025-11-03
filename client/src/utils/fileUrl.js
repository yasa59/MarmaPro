// client/src/utils/fileUrl.js
export default function fileUrl(p) {
  if (!p) return "";
  const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000";
  return p.startsWith("/uploads") ? API_BASE + p : p;
}
