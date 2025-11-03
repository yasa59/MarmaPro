// client/src/components/RequestTherapyButton.jsx
import { useState } from "react";
import api from "../api/axios";

/**
 * RequestTherapyButton
 * Sends a connect / therapy request to a doctor.
 *
 * Props:
 *  - doctorId   (required) : string
 *  - label                 : string (default "Request Therapy")
 *  - variant               : "solid" | "outline" (default "solid")
 *  - onSuccess             : () => void  (optional)
 */
export default function RequestTherapyButton({
  doctorId,
  label = "Request Therapy",
  variant = "solid",
  onSuccess,
}) {
  const [busy, setBusy] = useState(false);

  async function handleClick() {
    if (!doctorId || busy) return;
    setBusy(true);
    try {
      await api.post("/doctors/request", { doctorId });
      alert("Request sent to the doctor.");
      onSuccess?.();
    } catch (e) {
      const msg =
        e?.response?.data?.message ||
        `${e?.response?.status || ""} ${e?.response?.statusText || ""}`.trim() ||
        e.message;
      console.error("RequestTherapyButton error:", e?.response || e);
      alert(msg);
    } finally {
      setBusy(false);
    }
  }

  const base =
    "inline-flex items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-semibold transition " +
    "focus:outline-none focus:ring-2 focus:ring-sky-300/60 disabled:opacity-60 disabled:cursor-not-allowed";
  const look =
    variant === "outline"
      ? "border border-white/20 text-white/95 hover:bg-white/10 bg-white/5 backdrop-blur"
      : "text-white bg-gradient-to-r from-sky-500 via-indigo-500 to-emerald-500 hover:opacity-90 shadow-lg shadow-sky-500/20";

  return (
    <button
      onClick={handleClick}
      disabled={!doctorId || busy}
      className={`${base} ${look}`}
      title="Send therapy request to this doctor"
    >
      <span className="relative inline-flex">
        <span className="w-2 h-2 rounded-full bg-white/90" />
        {!busy && (
          <span className="absolute inline-flex w-full h-full rounded-full bg-white/60 animate-ping opacity-70" />
        )}
      </span>
      {busy ? "Sending…" : label}
    </button>
  );
}
