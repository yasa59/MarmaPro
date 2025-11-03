// client/src/components/HomeGate.jsx
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import routeByRole from "../utils/routeByRole";

export default function HomeGate({ landing }) {
  const { token, user } = useAuth();
  if (token && user?.role) {
    return <Navigate to={routeByRole(user.role)} replace />;
  }
  return landing; // your <Landing /> element
}
