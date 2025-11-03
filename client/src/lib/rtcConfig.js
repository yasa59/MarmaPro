// client/src/lib/rtcConfig.js
// Provides: fetchIceServers(), getSignalingURL(), getSignalingPath()

/**
 * Fetch short-lived STUN/TURN from your server (/api/ice),
 * which should proxy Twilio (or another managed TURN).
 * Falls back to STUN (and optional static TURN from env) if the API fails.
 */
export async function fetchIceServers() {
  const base = (import.meta.env.VITE_API_BASE || window.location.origin).replace(/\/$/, "");
  const token = localStorage.getItem("token");

  try {
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    const resp = await fetch(`${base}/api/ice`, {
      headers,
      credentials: "include",
    });
    if (resp.ok) {
      const data = await resp.json();
      if (data?.iceServers?.length) {
        return { iceServers: data.iceServers };
      }
    }
  } catch (e) {
    console.warn("ICE fetch failed; falling back to env/static ICE", e);
  }

  // Fallback: STUN (+ optional static TURN from Vite env if provided)
  const stun = import.meta.env.VITE_STUN_URL || "stun:stun.l.google.com:19302";
  const turn = import.meta.env.VITE_TURN_URL;
  const user = import.meta.env.VITE_TURN_USERNAME;
  const cred = import.meta.env.VITE_TURN_CREDENTIAL;

  const iceServers = [{ urls: stun }];
  if (turn && user && cred) {
    iceServers.push({ urls: turn, username: user, credential: cred });
  }
  return { iceServers };
}

/**
 * Where your Socket.IO signaling server lives.
 * Default: same origin as the page. Override with VITE_SIGNALING_URL.
 */
export function getSignalingURL() {
  return (import.meta.env.VITE_SIGNALING_URL || window.location.origin).replace(/\/$/, "");
}

/**
 * Socket.IO namespace/path for signaling.
 * Keep this in sync with your server (default "/call").
 * You can override via VITE_SIGNALING_PATH if needed.
 */
export function getSignalingPath() {
  return import.meta.env.VITE_SIGNALING_PATH || "/call";
}
