// client/src/components/Navbar.jsx
import { useContext, useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import api from "../api/axios";
import NotificationsBell from "./NotificationsBell";
import UserMenu from "./UserMenu";
import routeByRole from "../utils/routeByRole";

export default function Navbar() {
  const { user } = useContext(AuthContext);
  const loc = useLocation();

  const [pendingCount, setPendingCount] = useState(0); // admin pending doctors
  const [unread, setUnread] = useState(0); // notifications unread badge
  const [displayName, setDisplayName] = useState("");

  const dashTo = routeByRole(user?.role);

  // --- Admin pending badge polling ---
  useEffect(() => {
    let timer;
    async function load() {
      try {
        if (user?.role === "admin") {
          const { data } = await api.get("/auth/doctors/pending-count");
          setPendingCount(Number(data?.count || 0));
        } else {
          setPendingCount(0);
        }
      } catch {
        /* ignore */
      }
    }
    load();
    if (user?.role === "admin") timer = setInterval(load, 20000);
    return () => timer && clearInterval(timer);
  }, [user, loc.pathname]);

  // --- Unread notifications (for Alerts chip) ---
  useEffect(() => {
    async function loadUnread() {
      try {
        const { data } = await api.get("/notifications/unread-count");
        setUnread(Number(data?.count || 0));
      } catch {
        setUnread(0);
      }
    }
    if (user) loadUnread();
  }, [user, loc.pathname]);

  // --- Greeting chip (title + name if present, else email) ---
  useEffect(() => {
    (async () => {
      if (!user) {
        setDisplayName("");
        return;
      }
      try {
        const { data } = await api.get("/profile/me");
        const dn = [data?.title, data?.fullName].filter(Boolean).join(" ").trim();
        setDisplayName(dn || user.email || "User");
      } catch {
        setDisplayName(user.email || "User");
      }
    })();
  }, [user]);

  return (
    <header className="sticky top-0 z-50">
      <div className="mx-auto max-w-7xl px-4 lg:px-6 py-3">
        {/* Glassy dark bar */}
        <div className="rounded-2xl border border-white/20 bg-gradient-to-r from-slate-900/80 via-slate-800/70 to-slate-900/70 backdrop-blur shadow-xl">
          <div className="px-4 py-2.5 flex items-center gap-3">
            {/* Brand */}
            <Link to="/" className="font-extrabold text-white tracking-tight text-lg md:text-xl">
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-cyan-300 via-sky-200 to-emerald-300">
                iMarma Therapy
              </span>
            </Link>

            {/* NAV (right side) */}
            <nav className="ml-auto hidden md:flex items-center gap-1">
              {/* Home only for signed-out users (optional) */}
              {!user && <NavLink to="/">Home</NavLink>}

              {/* Role-aware Dashboard */}
              {user && <NavLink to={dashTo}>Dashboard</NavLink>}

              {/* Admin quick link + badge */}
              {user?.role === "admin" && (
                <NavLink to="/admin">
                  Admin
                  {pendingCount > 0 && (
                    <Badge>{pendingCount}</Badge>
                  )}
                </NavLink>
              )}

              {/* Doctor quick links */}
              {user?.role === "doctor" && (
                <>
                  <NavLink to="/doctor/alerts">Alerts</NavLink>
                  <NavLink to="/doctor/patients">Patients</NavLink>
                  {/* Keep if you use it */}
                  <NavLink to="/doctor/therapy">Therapy</NavLink>
                </>
              )}

              {/* User quick links */}
              {user?.role === "user" && (
                <>
                  <NavLink to="/user/doctors">Find Doctors</NavLink>
                  <NavLink to="/user/photos">Photos</NavLink>
                  <NavLink to="/user/foot-photo">Upload & Detect</NavLink>
                  {/* If you added sessions pages */}
                  {/* <NavLink to="/user/sessions">Therapy</NavLink> */}
                </>
              )}

              {/* Alerts link with unread badge (and keep your bell icon too) */}
              {user && (
                <NavLink to="/notifications">
                  Alerts
                  {unread > 0 && <Badge>{unread}</Badge>}
                </NavLink>
              )}

              {/* Greeting chip */}
              {user && (
                <div className="px-3 py-1 rounded-full bg-white/10 border border-white/20 text-xs text-white/90">
                  {displayName}
                </div>
              )}

              {/* Notifications bell + user menu */}
              <div className="flex items-center gap-2">
                {user && <NotificationsBell />}
                <UserMenu />
              </div>
            </nav>
          </div>
        </div>
      </div>
    </header>
  );
}

function NavLink({ to, children }) {
  return (
    <Link
      to={to}
      className="px-3 py-1.5 rounded-xl text-white/90 hover:text-white hover:bg-white/10 transition"
    >
      {children}
    </Link>
  );
}

function Badge({ children }) {
  return (
    <span className="ml-1 px-1.5 py-[2px] rounded-full bg-rose-600 text-white text-[10px] align-middle">
      {children}
    </span>
  );
}
