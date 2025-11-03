// client/src/context/AuthContext.jsx
import { createContext, useContext, useEffect, useState } from "react";

export const AuthContext = createContext(null);

/** Read auth from localStorage (new + legacy support) */
function readFromStorage() {
  const token = localStorage.getItem("token") || null;

  // Preferred shape: token + user (single object with role)
  const storedUser = localStorage.getItem("user");
  if (token && storedUser) {
    try {
      const user = JSON.parse(storedUser);
      // Ensure role exists (some older payloads could miss it)
      if (!user.role) {
        const legacyRole = localStorage.getItem("role") || "";
        user.role = legacyRole;
      }
      return { token, user };
    } catch {
      // fall through to legacy keys
    }
  }

  // Legacy keys → build a user object
  const role = localStorage.getItem("role") || "";
  const name = localStorage.getItem("name") || "";
  const email = localStorage.getItem("email") || "";
  if (token && role) return { token, user: { role, name, email } };

  return { token: null, user: null };
}

export function AuthProvider({ children }) {
  const [{ token, user }, setState] = useState(readFromStorage);

  /** Preferred flow (after /api/auth/verify-otp):
   *  loginSuccess({ token, user })
   */
  function loginSuccess(payload) {
    const t = payload?.token;
    const u = payload?.user;
    if (!t || !u) return;

    // Ensure role is present (defensive)
    if (!u.role) {
      // try to infer from legacy or default to "user"
      const legacyRole = localStorage.getItem("role") || "user";
      u.role = legacyRole;
    }

    localStorage.setItem("token", t);
    localStorage.setItem("user", JSON.stringify(u));
    // Clean legacy keys
    localStorage.removeItem("role");
    localStorage.removeItem("name");
    localStorage.removeItem("email");
    setState({ token: t, user: u });
  }

  /** Legacy helper:
   *  loginUser({ token, role, name, email, id })
   */
  function loginUser({ token: t, role, name, email, id }) {
    if (!t || !role) return;
    const u = { role, name: name || "", email: email || "", id };
    localStorage.setItem("token", t);
    localStorage.setItem("user", JSON.stringify(u));
    // keep legacy keys for any older components still reading them
    localStorage.setItem("role", role);
    localStorage.setItem("name", u.name);
    localStorage.setItem("email", u.email);
    setState({ token: t, user: u });
  }

  function logoutUser() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    // also clear legacy keys
    localStorage.removeItem("role");
    localStorage.removeItem("name");
    localStorage.removeItem("email");
    setState({ token: null, user: null });
  }

  // Keep multiple tabs in sync
  useEffect(() => {
    const onStorage = () => setState(readFromStorage());
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, token, loginSuccess, loginUser, logoutUser }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
