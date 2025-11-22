// client/src/pages/AdminDashboard.jsx
import { useEffect, useState } from 'react';
import api from '../api/axios';
import fileUrl from '../utils/fileUrl'; // if you want to show doc links
import toast from '../components/Toast';

function buildApprovalCopy(name){
  return `Subject: Your Doctor Account is Approved – iMarma Therapy

Hello ${name},

Great news! Your iMarma Therapy doctor account has been approved.

You can now log in and start using the platform:
http://localhost:5173/login

Thanks for joining the network.
— iMarma Therapy Team`;
}

export default function AdminDashboard(){
  const [tab, setTab] = useState('pending'); // 'pending' | 'doctors' | 'users'
  const [loading, setLoading] = useState(false);

  const [pending, setPending] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [users, setUsers] = useState([]);

  async function loadPending(){
    try{
      const { data } = await api.get('/auth/doctors/pending');
      setPending(Array.isArray(data) ? data : []);
    }catch(e){
      if (import.meta.env.DEV) {
        console.error('Failed to load pending doctors:', e);
      }
      setPending([]);
    }
  }
  async function loadDoctors(){
    try{
      const { data } = await api.get('/admin/users?role=doctor');
      setDoctors(Array.isArray(data?.items) ? data.items : []);
    }catch(e){
      if (import.meta.env.DEV) {
        console.error('Failed to load doctors:', e);
      }
      setDoctors([]);
    }
  }
  async function loadUsers(){
    try{
      const { data } = await api.get('/admin/users?role=user');
      setUsers(Array.isArray(data?.items) ? data.items : []);
    }catch(e){
      if (import.meta.env.DEV) {
        console.error('Failed to load users:', e);
      }
      setUsers([]);
    }
  }

  async function refresh(current = tab){
    setLoading(true);
    try{
      if (current === 'pending') await loadPending();
      if (current === 'doctors') await loadDoctors();
      if (current === 'users') await loadUsers();
    } finally {
      setLoading(false);
    }
  }

  useEffect(()=>{ refresh('pending'); },[]);

  async function approve(email){
    if(!confirm(`Approve ${email}?`)) return;
    await api.post('/auth/approve-doctor', { email });
    await refresh('pending');
    toast.success('Doctor approved and notified (email sent if configured).');
  }

  async function copyEmail(name){
    const text = buildApprovalCopy(name || 'Doctor');
    await navigator.clipboard.writeText(text);
    toast.success('Approval email template copied.');
  }

  async function deleteUser(id, label){
    if(!id) return;
    if(!confirm(`Permanently delete ${label}? This cannot be undone.`)) return;
    await api.delete(`/admin/users/${id}`);
    await refresh(tab);
  }

  return (
    <div className="max-w-6xl mx-auto p-6 text-white space-y-6">
      <div className="glass rounded-2xl p-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Admin Dashboard</h1>
          <button
            onClick={() => refresh(tab)}
            className="btn btn-primary"
          >
            {loading ? 'Refreshing…' : 'Refresh'}
          </button>
        </div>

        {/* Tabs */}
        <div className="mt-4 flex gap-2">
          <button
            className={`btn ${tab==='pending' ? 'btn-secondary' : 'btn-ghost'}`}
            onClick={() => { setTab('pending'); refresh('pending'); }}
          >Pending Doctors</button>
          <button
            className={`btn ${tab==='doctors' ? 'btn-secondary' : 'btn-ghost'}`}
            onClick={() => { setTab('doctors'); refresh('doctors'); }}
          >All Doctors</button>
          <button
            className={`btn ${tab==='users' ? 'btn-secondary' : 'btn-ghost'}`}
            onClick={() => { setTab('users'); refresh('users'); }}
          >All Users</button>
        </div>
      </div>

      {/* Pending Doctors */}
      {tab === 'pending' && (
        <div className="glass rounded-2xl p-6">
          <h2 className="text-lg font-semibold mb-3">Pending Doctors</h2>
          {pending.length === 0 ? (
            <div className="text-white/80">No pending doctors.</div>
          ) : (
            <div className="grid md:grid-cols-2 gap-4">
              {pending.map(d=>(
                <div key={d._id} className="card fade-in flex gap-3 items-center">
                  <div className="flex-1">
                    <div className="font-medium">{d.name || '(no name)'}</div>
                    <div className="text-sm text-white/80">{d.email}</div>
                    {d.documentPath && (
                      <a
                        className="text-emerald-300 underline text-sm"
                        href={fileUrl(d.documentPath)}
                        target="_blank"
                        rel="noreferrer"
                      >
                        View document
                      </a>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button className="btn bg-emerald-500 text-white" onClick={()=>approve(d.email)}>Approve</button>
                    <button className="btn glass" onClick={()=>copyEmail(d.name)}>Copy Email</button>
                    <button className="btn bg-red-500 text-white" onClick={()=>deleteUser(d._id, d.email)}>Delete</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* All Doctors */}
      {tab === 'doctors' && (
        <div className="glass rounded-2xl p-6">
          <h2 className="text-lg font-semibold mb-3">All Doctors</h2>
          {doctors.length === 0 ? (
            <div className="text-white/80">No doctors.</div>
          ) : (
            <div className="grid md:grid-cols-2 gap-4">
              {doctors.map(u=>(
                <div key={u._id} className="card fade-in flex items-center justify-between">
                  <div className="pr-3">
                    <div className="font-medium">{u.name || '(no name)'}</div>
                    <div className="text-sm text-white/80">{u.email}</div>
                    <div className="text-xs text-white/60">Joined: {new Date(u.createdAt).toLocaleString()}</div>
                  </div>
                  <button className="btn bg-red-500 text-white" onClick={()=>deleteUser(u._id, u.email)}>Delete</button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* All Users */}
      {tab === 'users' && (
        <div className="glass rounded-2xl p-6">
          <h2 className="text-lg font-semibold mb-3">All Users</h2>
          {users.length === 0 ? (
            <div className="text-white/80">No users.</div>
          ) : (
            <div className="grid md:grid-cols-2 gap-4">
              {users.map(u=>(
                <div key={u._id} className="card fade-in flex items-center justify-between">
                  <div className="pr-3">
                    <div className="font-medium">{u.name || '(no name)'}</div>
                    <div className="text-sm text-white/80">{u.email}</div>
                    <div className="text-xs text-white/60">Joined: {new Date(u.createdAt).toLocaleString()}</div>
                  </div>
                  <button className="btn bg-red-500 text-white" onClick={()=>deleteUser(u._id, u.email)}>Delete</button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
