// client/src/components/ProtectedRoute.jsx
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import routeByRole from "../utils/routeByRole";

export default function ProtectedRoute({ role, children }) {
  const { token, user } = useAuth();
  const loc = useLocation();

  // Not logged in → go to login (remember target so we can return after)
  if (!token || !user) {
    return <Navigate to="/login" replace state={{ from: loc.pathname }} />;
  }

  // If a role is required, enforce it strictly
  if (role) {
    const must = String(role).toLowerCase();
    const has  = String(user.role || "").toLowerCase();

    if (must !== has) {
      // Role mismatch → send them to *their* dashboard
      return <Navigate to={routeByRole(user.role)} replace />;
    }
  }

  return children;
}
