// client/src/pages/TherapySelf.jsx
import { useEffect, useState, useContext } from "react";
import api from "../api/axios";
import { AuthContext } from "../context/AuthContext";

const NAMES = ["Kshipra (M1)","Talahridaya (M2)","Kurcha (M3)","Kurchashira (M4)"];

export default function TherapySelf(){
  const { user } = useContext(AuthContext);
  const [minutes, setMinutes] = useState(2);
  const [status, setStatus] = useState(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  const loadStatus = async ()=>{
    try {
      const { data } = await api.get('/therapy/status');
      setStatus(data);
    } catch (e) {
      setMsg(e.response?.data?.message || e.message);
    }
  };

  useEffect(()=>{ loadStatus(); },[]);

  const start = async (n)=>{
    setBusy(true); setMsg("");
    try{
      await api.post('/therapy/start-motor', { motor: n, durationSec: Math.max(10, minutes*60|0) });
      await loadStatus();
    }catch(e){
      setMsg(e.response?.data?.message || e.message);
    }finally{ setBusy(false); }
  };

  const stop = async (n)=>{
    setBusy(true); setMsg("");
    try{
      await api.post('/therapy/stop-motor', { motor: n });
      await loadStatus();
    }catch(e){
      setMsg(e.response?.data?.message || e.message);
    }finally{ setBusy(false); }
  };

  const stopAll = async ()=>{
    setBusy(true); setMsg("");
    try{
      await api.post('/therapy/stop-all', {});
      await loadStatus();
    }catch(e){
      setMsg(e.response?.data?.message || e.message);
    }finally{ setBusy(false); }
  };

  return (
    <div className="max-w-3xl mx-auto p-6 glass rounded-2xl text-white space-y-4">
      <h1 className="text-2xl font-bold">My Therapy</h1>
      <p className="text-sm text-white/80">
        Start vibration therapy for each Marma point. This talks to your ESP32 directly through the server.
      </p>

      <div className="flex items-center gap-2">
        <label>Duration:</label>
        <input type="number" min="1"
          className="border border-white/20 bg-white/10 text-white p-2 rounded w-24"
          value={minutes} onChange={e=>setMinutes(+e.target.value || 1)} />
        <span className="text-white/80 text-sm">minutes</span>
      </div>

      {msg && <div className="p-3 rounded bg-red-500/20 border border-red-400/30">{msg}</div>}

      <div className="grid sm:grid-cols-2 gap-3">
        {[1,2,3,4].map((n)=>(
          <div key={n} className="card fade-in">
            <div className="font-semibold mb-2">{NAMES[n-1]}</div>
            <div className="flex items-center gap-2">
              <button disabled={busy} className="btn btn-primary" onClick={()=>start(n)}>Start M{n}</button>
              <button disabled={busy} className="btn glass" onClick={()=>stop(n)}>Stop M{n}</button>
            </div>
          </div>
        ))}
      </div>

      <div className="flex gap-2 pt-2">
        <button disabled={busy} className="btn bg-red-500 text-white" onClick={stopAll}>Stop All</button>
        <button className="btn glass" onClick={loadStatus}>Refresh Status</button>
      </div>

      {status && (
        <div className="text-sm text-white/80">
          <div className="mt-3 font-semibold">Device status</div>
          <pre className="bg-white/10 p-3 rounded border border-white/20 overflow-auto">
            {JSON.stringify(status, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
