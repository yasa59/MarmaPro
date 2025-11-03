// client/src/pages/ProfileSettings.jsx
import { useEffect, useState } from "react";
import api from "../api/axios";
import fileUrl from "../utils/fileUrl";

const TITLES = ['','Mr','Ms','Mrs','Dr','Prof','Mx'];
const GENDERS = ['','male','female','other','prefer_not'];

export default function ProfileSettings(){
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [msg, setMsg]         = useState("");

  const [title, setTitle] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [gender, setGender] = useState('');
  const [avatar, setAvatar] = useState('');

  useEffect(()=>{
    (async ()=>{
      try{
        const { data } = await api.get('/profile/me');
        if(data){
          setTitle(data.title || '');
          setFullName(data.fullName || '');
          setPhone(data.phone || '');
          setGender(data.gender || '');
          setAvatar(data.avatar || '');
        }
      }catch{}
      setLoading(false);
    })();
  },[]);

  async function onSave(e){
    e.preventDefault();
    setMsg("");
    setSaving(true);
    try{
      const { data } = await api.put('/profile/me', { title, fullName, phone, gender });
      if(data?.ok) setMsg("Saved.");
      else setMsg("Failed to save.");
    }catch(e){
      setMsg(e.response?.data?.message || "Failed to save.");
    }finally{
      setSaving(false);
    }
  }

  async function onPickAvatar(e){
    const f = e.target.files?.[0];
    if(!f) return;
    const fd = new FormData();
    fd.append('avatar', f);
    try{
      const { data } = await api.post('/profile/avatar', fd, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      if(data?.avatar) setAvatar(data.avatar);
      setMsg("Avatar updated.");
    }catch(e){
      setMsg(e.response?.data?.message || "Avatar upload failed.");
    }
  }

  if(loading) return <div className="max-w-3xl mx-auto p-6 text-white">Loading…</div>;

  return (
    <div className="max-w-3xl mx-auto p-6 text-white space-y-6">
      <div className="glass rounded-2xl p-6 space-y-4">
        <h1 className="text-2xl font-bold">Personal details</h1>
        <p className="text-white/80 text-sm">Tell us how to address you, and add a profile photo.</p>

        <div className="flex items-center gap-4">
          <div className="w-20 h-20 rounded-full bg-white/10 overflow-hidden border border-white/20">
            {avatar ? (
              <img src={fileUrl(avatar)} alt="avatar" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full grid place-items-center text-xs text-white/60">No Photo</div>
            )}
          </div>
          <label className="btn btn-secondary cursor-pointer">
            Change Photo
            <input type="file" accept="image/*" className="hidden" onChange={onPickAvatar} />
          </label>
        </div>

        <form onSubmit={onSave} className="grid gap-3">
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-white/70">Title</label>
              <select value={title} onChange={e=>setTitle(e.target.value)} className="w-full bg-white/10 border border-white/20 rounded p-2">
                {TITLES.map(t => <option key={t} value={t}>{t || '—'}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-white/70">Gender</label>
              <select value={gender} onChange={e=>setGender(e.target.value)} className="w-full bg-white/10 border border-white/20 rounded p-2 capitalize">
                {GENDERS.map(g => <option key={g} value={g}>{g || '—'}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs text-white/70">Full name</label>
            <input value={fullName} onChange={e=>setFullName(e.target.value)} className="w-full bg-white/10 border border-white/20 rounded p-2" placeholder="e.g., Yasas Perera" />
          </div>

          <div>
            <label className="text-xs text-white/70">Phone</label>
            <input value={phone} onChange={e=>setPhone(e.target.value)} className="w-full bg-white/10 border border-white/20 rounded p-2" placeholder="+94 ..." />
          </div>

          <div className="flex items-center gap-3">
            <button className="btn btn-primary" disabled={saving}>{saving ? "Saving…" : "Save"}</button>
            {msg && <div className="text-white/80">{msg}</div>}
          </div>
        </form>
      </div>
    </div>
  );
}
