// client/src/utils/routeByRole.js
export default function routeByRole(role) {
  switch ((role || "").toLowerCase()) {
    case "admin":  return "/admin";
    case "doctor": return "/doctor";
    default:       return "/user"; // fallback = user
  }
}
