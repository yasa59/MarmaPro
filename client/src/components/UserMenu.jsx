// client/src/components/UserMenu.jsx
import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
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
        <div className="absolute right-0 mt-2 w-64 rounded-xl bg-white/10 border border-white/20 backdrop-blur p-3 z-50">
          <div className="flex items-center gap-3 pb-3 border-b border-white/10">
            <div className="w-10 h-10 rounded-full bg-white/10 overflow-hidden">
              {profile?.avatar ? (
                <img src={fileUrl(profile.avatar)} alt="avatar" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full grid place-items-center text-white/60 text-xs">No<br/>Photo</div>
              )}
            </div>
            <div className="flex-1">
              <div className="font-semibold">{displayName || (user?.email || "User")}</div>
              {user?.role && <div className="text-xs text-white/70 capitalize">{user.role}</div>}
            </div>
          </div>

          <div className="mt-2 grid gap-2">
            <Link to="/settings/profile" className="btn btn-ghost w-full text-left">Personal details</Link>
            <Link to="/settings" className="btn btn-ghost w-full text-left">Settings</Link>
            <Link to="/contact" className="btn btn-ghost w-full text-left">Contact admin</Link>
            <button
              onClick={()=>{ logoutUser(); nav('/'); }}
              className="btn bg-red-500 text-white w-full"
            >
              Logout
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
