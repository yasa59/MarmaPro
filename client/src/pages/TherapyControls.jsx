// client/src/pages/TherapyControls.jsx
import { useEffect, useState } from "react";
import api from "../api/axios";

/**
 * Quick therapy control panel:
 * - Enter Patient User ID (doctor must be connected to the patient in backend).
 * - 4 motors (M1..M4) mapped to main foot marma points.
 * - Per-motor adjustable countdown in seconds.
 * - Start/Stop (Stop All) + "Demo Mode" to run timers without hitting backend.
 */

const MARMA_POINTS = [
  { motor: 1, name: "Kshipra (M1)", info: "Between big toe & second toe web space. Stimulates circulation & pain relief." },
  { motor: 2, name: "Talahridaya (M2)", info: "Center of the sole. Balances energy, calms mind & improves vitality." },
  { motor: 3, name: "Kurcha (M3)", info: "Ball of the foot near metatarsals. Affects nervous system & flexibility." },
  { motor: 4, name: "Kurchashira (M4)", info: "Base of toes region. Helpful for toe/forefoot discomfort & alignment." },
];

export default function TherapyControls(){
  const [patientId, setPatientId] = useState(localStorage.getItem("lastPatientId") || "");
  const [demo, setDemo] = useState(false);

  // durations in seconds for each motor
  const [durations, setDurations] = useState({ 1: 60, 2: 60, 3: 60, 4: 60 });
  // remaining seconds per motor (0 = not running)
  const [remaining, setRemaining] = useState({ 1: 0, 2: 0, 3: 0, 4: 0 });
  // running state
  const [running, setRunning] = useState({ 1: false, 2: false, 3: false, 4: false });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(()=>{
    localStorage.setItem("lastPatientId", patientId || "");
  },[patientId]);

  // one interval ticking all active motors
  useEffect(()=>{
    const tick = setInterval(()=>{
      setRemaining(prev => {
        const next = { ...prev };
        let changed = false;
        (/** @type {(keyof typeof prev)[]} */([1,2,3,4])).forEach(k=>{
          if(next[k] > 0){
            next[k] = next[k] - 1;
            changed = true;
          }
        });
        if(!changed) return prev; // nothing to update
        return next;
      });
    },1000);
    return ()=> clearInterval(tick);
  },[]);

  // when a motor hits 0, mark it not running
  useEffect(()=>{
    const newRun = { ...running };
    let changed = false;
    (/** @type {(keyof typeof remaining)[]} */([1,2,3,4])).forEach(k=>{
      if(remaining[k] === 0 && running[k]){
        newRun[k] = false;
        changed = true;
      }
    });
    if(changed) setRunning(newRun);
  },[remaining]); // eslint-disable-line

  const format = (sec)=>{
    const m = Math.floor(sec/60);
    const s = sec%60;
    return `${m}:${String(s).padStart(2, "0")}`;
  };

  const startMotor = async (motor)=>{
    setMsg("");
    const durationSec = Math.max(5, Number(durations[motor]) || 60);

    if (!demo) {
      if(!patientId?.trim()){
        setMsg("Enter a valid Patient User ID (doctor ↔ patient must be connected in backend).");
        return;
      }
      try{
        setBusy(true);
        const { data } = await api.post("/therapy/start-motor", { userId: patientId.trim(), motor, durationSec });
        setMsg(data?.message || `Motor M${motor} started`);
      }catch(e){
        setMsg(e.response?.data?.message || e.message || "Failed to start motor");
        setBusy(false);
        return;
      }finally{
        setBusy(false);
      }
    }

    // start local countdown regardless (so UI always works)
    setRunning(r => ({ ...r, [motor]: true }));
    setRemaining(rem => ({ ...rem, [motor]: durationSec }));
  };

  const stopAll = async ()=>{
    setMsg("");
    if(!demo){
      if(!patientId?.trim()){
        setMsg("Enter a valid Patient User ID to stop motors via backend.");
      }else{
        try{
          setBusy(true);
          const { data } = await api.post("/therapy/stop-all", { userId: patientId.trim() });
          setMsg(data?.message || "Stopped all motors");
        }catch(e){
          setMsg(e.response?.data?.message || e.message || "Failed to stop");
        }finally{
          setBusy(false);
        }
      }
    }
    // local stop
    setRunning({1:false,2:false,3:false,4:false});
    setRemaining({1:0,2:0,3:0,4:0});
  };

  return (
    <div className="max-w-5xl mx-auto p-6 text-white">
      <div className="glass rounded-2xl p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-end gap-3">
          <div className="flex-1">
            <h1 className="text-2xl font-bold">Therapy Controls</h1>
            <p className="text-white/80 text-sm">Start/stop vibration motors mapped to main foot marma points.</p>
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" className="accent-emerald-400"
                   checked={demo} onChange={e=>setDemo(e.target.checked)} />
            Demo mode (don’t call backend)
          </label>
        </div>

        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <label className="text-sm text-white/80">Patient User ID</label>
            <input
              className="w-full border border-white/20 bg-white/10 text-white p-2 rounded"
              placeholder="e.g. 66c9... (Mongo ObjectId)"
              value={patientId}
              onChange={e=>setPatientId(e.target.value)}
            />
          </div>

          <div className="flex items-end">
            <button className="btn bg-red-500 hover:bg-red-600 text-white w-full" onClick={stopAll} disabled={busy}>
              Stop All
            </button>
          </div>
        </div>

        {msg && <div className="p-3 rounded bg-white/10 border border-white/20">{msg}</div>}

        <div className="grid md:grid-cols-2 gap-4">
          {MARMA_POINTS.map(({motor, name, info})=>(
            <div key={motor} className="card fade-in space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-semibold">{name}</div>
                  <div className="text-sm text-white/80">Motor M{motor}</div>
                </div>
                <span className={`text-xs px-2 py-1 rounded ${running[motor] ? "bg-emerald-500/20 text-emerald-200 border border-emerald-400/30" : "bg-white/10 text-white/70 border border-white/20"}`}>
                  {running[motor] ? "Running" : "Idle"}
                </span>
              </div>

              <p className="text-sm text-white/70">{info}</p>

              <div className="flex items-center gap-2">
                <label className="text-sm text-white/80">Duration (sec)</label>
                <input
                  type="number" min={5}
                  className="w-28 border border-white/20 bg-white/10 text-white p-2 rounded"
                  value={durations[motor]}
                  onChange={e=>setDurations(d => ({ ...d, [motor]: Math.max(5, Number(e.target.value)||60) }))}
                />
                <span className="text-sm text-white/60">({format(remaining[motor])})</span>
              </div>

              <div className="flex gap-2">
                <button
                  className={`btn ${running[motor] ? "glass" : "btn-primary"}`}
                  onClick={()=>startMotor(motor)}
                  disabled={busy}
                >
                  {running[motor] ? `Running… ${format(remaining[motor])}` : `Start ${name}`}
                </button>
              </div>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
}
