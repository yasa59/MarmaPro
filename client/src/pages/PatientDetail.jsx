// client/src/pages/PatientDetail.jsx
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import api from "../api/axios";

export default function PatientDetail(){
  const { id: userId } = useParams();

  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const [patient, setPatient] = useState(null);   // { user, photo, assessment }
  const [age, setAge] = useState("");
  const [job, setJob] = useState("");
  const [condition, setCondition] = useState("");
  const [notes, setNotes] = useState("");

  const [duration, setDuration] = useState(60); // seconds

  const load = async ()=>{
    setLoading(true); setMsg("");
    try{
      const { data } = await api.get(`/patients/${userId}`);
      setPatient(data);
      setAge(data.assessment?.age || "");
      setJob(data.assessment?.job || "");
      setCondition(data.assessment?.condition || "");
      setNotes(data.assessment?.notes || "");
    }catch(e){
      setMsg(e.response?.data?.message || e.message);
    }finally{ setLoading(false); }
  };

  const saveAssessment = async ()=>{
    try{
      const { data } = await api.post('/assessments/save', {
        userId, age: Number(age)||undefined, job, condition, notes
      });
      setMsg(data.message || "Saved");
    }catch(e){
      setMsg(e.response?.data?.message || e.message);
    }
  };

  const startMotor = async (motor)=>{
    try{
      const { data } = await api.post('/therapy/start-motor', { userId, motor, durationSec: Number(duration)||60 });
      setMsg(data.message);
    }catch(e){
      setMsg(e.response?.data?.message || e.message);
    }
  };

  const stopAll = async ()=>{
    try{
      const { data } = await api.post('/therapy/stop-all', { userId });
      setMsg(data.message);
    }catch(e){
      setMsg(e.response?.data?.message || e.message);
    }
  };

  const markAligned = async (flag)=>{
    try{
      const photoId = patient?.photo?.photoId;
      if(!photoId) return setMsg("No photo to mark");
      const { data } = await api.post(`/therapy/align/${photoId}/mark`, { aligned: flag });
      setMsg(`Aligned: ${data.aligned}`);
      setPatient(prev => prev ? { ...prev, photo: { ...prev.photo, aligned: data.aligned } } : prev);
    }catch(e){
      setMsg(e.response?.data?.message || e.message);
    }
  };

  useEffect(()=>{ load(); /* eslint-disable-next-line */ },[userId]);

  return (
    <div className="max-w-6xl mx-auto p-6 text-white space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Patient Detail</h1>
        {loading ? <div className="text-white/80">Loading…</div> : null}
      </div>

      {msg && <div className="p-3 rounded bg-white/10 border border-white/20">{msg}</div>}

      {!patient ? (
        <div className="text-white/80">No data.</div>
      ) : (
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Left: Image + alignment */}
          <div className="card">
            <h2 className="font-semibold mb-3">Latest Annotated Image</h2>
            {patient.photo?.annotated ? (
              <img src={patient.photo.annotated} alt="annotated" className="w-full rounded border border-white/20" />
            ) : (
              <div className="w-full h-56 rounded bg-white/5 border border-white/20 grid place-items-center text-white/70">
                No photo uploaded yet
              </div>
            )}

            <div className="mt-3 flex items-center gap-2">
              <span className={`inline-block px-2 py-1 rounded text-xs ${patient.photo?.aligned ? 'bg-emerald-500 text-emerald-950' : 'bg-pink-500 text-white'}`}>
                Alignment: {patient.photo?.aligned ? 'Green (OK)' : 'Red (Not aligned)'}
              </span>
              <button className="btn btn-ghost" onClick={()=>markAligned(false)}>Mark Red</button>
              <button className="btn btn-primary" onClick={()=>markAligned(true)}>Mark Green</button>
            </div>
          </div>

          {/* Right: Assessment + Therapy */}
          <div className="card space-y-5">
            <section>
              <h2 className="font-semibold mb-3">Assessment</h2>
              <div className="grid sm:grid-cols-2 gap-3">
                <input className="border border-white/20 bg-white/10 rounded px-3 py-2 text-white placeholder-white/60"
                       placeholder="Age" value={age} onChange={e=>setAge(e.target.value)} />
                <input className="border border-white/20 bg-white/10 rounded px-3 py-2 text-white placeholder-white/60"
                       placeholder="Job" value={job} onChange={e=>setJob(e.target.value)} />
              </div>
              <input className="mt-3 w-full border border-white/20 bg-white/10 rounded px-3 py-2 text-white placeholder-white/60"
                     placeholder="Patient suffers from what (condition)" value={condition} onChange={e=>setCondition(e.target.value)} />
              <textarea className="mt-3 w-full border border-white/20 bg-white/10 rounded px-3 py-2 text-white placeholder-white/60"
                        rows={4} placeholder="Notes / instructions"
                        value={notes} onChange={e=>setNotes(e.target.value)} />
              <div className="mt-3">
                <button className="btn btn-primary" onClick={saveAssessment}>Save Assessment</button>
              </div>
            </section>

            <section>
              <h2 className="font-semibold mb-3">Therapy Controls</h2>
              <div className="flex items-center gap-3 mb-3">
                <label className="text-sm text-white/80">Duration (seconds)</label>
                <input type="number" min="10" className="w-28 border border-white/20 bg-white/10 rounded px-3 py-2 text-white"
                       value={duration} onChange={e=>setDuration(e.target.value)} />
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <button className="btn btn-primary" onClick={()=>startMotor(1)}>M1 • Kshipra</button>
                <button className="btn btn-primary" onClick={()=>startMotor(2)}>M2 • Talahridaya</button>
                <button className="btn btn-primary" onClick={()=>startMotor(3)}>M3 • Kurcha</button>
                <button className="btn btn-primary" onClick={()=>startMotor(4)}>M4 • Gulpha</button>
              </div>
              <div className="mt-3">
                <button className="btn bg-red-500 text-white" onClick={stopAll}>Stop All</button>
              </div>
            </section>
          </div>
        </div>
      )}
    </div>
  );
}
