// client/src/components/RequestTherapyButton.jsx
import { useNavigate } from "react-router-dom";

/**
 * RequestTherapyButton
 * Navigates to the request therapy form for a doctor.
 *
 * Props:
 *  - doctorId   (required) : string
 *  - label                 : string (default "Request Therapy")
 *  - variant               : "solid" | "outline" (default "solid")
 *  - onSuccess             : () => void  (optional, called after navigation)
 */
export default function RequestTherapyButton({
  doctorId,
  label = "Request Therapy",
  variant = "solid",
  onSuccess,
}) {
  const navigate = useNavigate();

  function handleClick() {
    if (!doctorId) return;
    navigate(`/patient-intake/${doctorId}`);
    onSuccess?.();
  }

  const base =
    "inline-flex items-center gap-2 rounded-2xl px-6 py-3 text-sm font-semibold transition-all duration-300 " +
    "focus:outline-none focus:ring-2 focus:ring-blue-400/60 disabled:opacity-60 disabled:cursor-not-allowed " +
    "relative overflow-hidden transform hover:scale-105 active:scale-95";
  const look =
    variant === "outline"
      ? "border-2 border-blue-400/50 text-blue-300 bg-blue-500/10 hover:bg-blue-500/20 hover:border-blue-400 backdrop-blur-sm shadow-lg shadow-blue-500/20"
      : "text-white bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:via-indigo-500 hover:to-purple-500 shadow-lg shadow-blue-500/30 hover:shadow-xl hover:shadow-blue-500/40";

  return (
    <button
      onClick={handleClick}
      disabled={!doctorId}
      className={`${base} ${look}`}
      title="Send therapy request to this doctor"
    >
      <span className="relative inline-flex">
        <span className="w-2 h-2 rounded-full bg-white/90" />
        <span className="absolute inline-flex w-full h-full rounded-full bg-white/60 animate-ping opacity-70" />
      </span>
      {label}
    </button>
  );
}
