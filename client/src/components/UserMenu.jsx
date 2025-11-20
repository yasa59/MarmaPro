// client/src/components/UserMenu.jsx
import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import api from "../api/axios";
import fileUrl from "../utils/fileUrl";
import { useAuth } from "../context/AuthContext";

export default function UserMenu(){
  const { user, logoutUser } = useAuth();
  const [open, setOpen] = useState(false);
  const [profile, setProfile] = useState(null);
  const ref = useRef(null);
  const nav = useNavigate();

  useEffect(()=>{
    (async ()=>{
      try{
        const { data } = await api.get('/profile/me');
        setProfile(data || {});
      }catch{}
    })();
  },[]);

  useEffect(()=>{
    function onDoc(e){
      if(ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('click', onDoc);
    return ()=> document.removeEventListener('click', onDoc);
  },[]);

  const displayName = [profile?.title, profile?.fullName].filter(Boolean).join(' ').trim();

  return (
    <div className="relative" ref={ref}>
      <button
        className="w-10 h-10 rounded-full grid place-items-center bg-white/10 border border-white/20 hover:bg-white/15"
        onClick={()=> setOpen(v=>!v)}
        title="Menu"
      >
        ⋯
      </button>

      {open && (
        <motion.div
          initial={{ opacity: 0, y: -10, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          className="absolute right-0 mt-2 w-72 rounded-2xl bg-gradient-to-br from-slate-900/95 via-slate-800/95 to-slate-900/95 border border-white/20 backdrop-blur-xl shadow-2xl p-4 z-50"
        >
          {/* User Info Header */}
          <div className="flex items-center gap-3 pb-4 border-b border-white/10 mb-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500/20 to-indigo-500/20 border border-white/20 overflow-hidden ring-2 ring-white/10">
              {profile?.avatar || profile?.profilePhoto ? (
                <img
                  src={fileUrl(profile.avatar || profile.profilePhoto)}
                  alt="avatar"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full grid place-items-center text-white/70 text-lg">
                  👤
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-white truncate">
                {displayName || (user?.email || "User")}
              </div>
              {user?.role && (
                <div className="text-xs text-white/60 capitalize flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                  {user.role}
                </div>
              )}
            </div>
          </div>

          {/* Menu Items */}
          <div className="grid gap-1.5">
            <Link
              to="/settings/profile"
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-white/90 hover:text-white hover:bg-white/10 transition group"
            >
              <span className="text-lg">⚙️</span>
              <span className="flex-1">Profile Settings</span>
              <span className="text-white/40 group-hover:text-white/60">→</span>
            </Link>
            <Link
              to="/notifications"
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-white/90 hover:text-white hover:bg-white/10 transition group"
            >
              <span className="text-lg">🔔</span>
              <span className="flex-1">Notifications</span>
              <span className="text-white/40 group-hover:text-white/60">→</span>
            </Link>
            {user?.role === 'doctor' && (
              <Link
                to="/doctor/therapy"
                onClick={() => setOpen(false)}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-white/90 hover:text-white hover:bg-white/10 transition group"
              >
                <span className="text-lg">💆</span>
                <span className="flex-1">Therapy Controls</span>
                <span className="text-white/40 group-hover:text-white/60">→</span>
              </Link>
            )}
            {user?.role === 'user' && (
              <Link
                to="/user/sessions"
                onClick={() => setOpen(false)}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-white/90 hover:text-white hover:bg-white/10 transition group"
              >
                <span className="text-lg">📋</span>
                <span className="flex-1">My Sessions</span>
                <span className="text-white/40 group-hover:text-white/60">→</span>
              </Link>
            )}
            <div className="my-1.5 border-t border-white/10"></div>
            <button
              onClick={() => {
                logoutUser();
                nav('/');
                setOpen(false);
              }}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-red-300 hover:text-red-200 hover:bg-red-500/20 transition group w-full text-left"
            >
              <span className="text-lg">🚪</span>
              <span className="flex-1">Logout</span>
            </button>
          </div>
        </motion.div>
      )}
    </div>
  );
}
