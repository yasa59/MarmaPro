// client/src/pages/DoctorSessionDetail.jsx
import { useEffect, useState, useRef } from "react";
import { useParams } from "react-router-dom";
import { motion } from "framer-motion";
import api from "../api/axios";
import { getSocket } from "../lib/socket";
import toast from "../components/Toast";

export default function DoctorSessionDetail() {
  const { id } = useParams();
  const [row, setRow] = useState(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const socketRef = useRef(null);

  // editors
  const [text, setText] = useState("");
  const [meds, setMeds] = useState("");
  const [doctorPhonePublic, setPhone] = useState("");
  // keep your existing shape: { point, durationSec, notes }
  const [plan, setPlan] = useState([
    { point: "Marma 1", durationSec: 60, notes: "" },
    { point: "Marma 2", durationSec: 60, notes: "" },
    { point: "Marma 3", durationSec: 60, notes: "" },
    { point: "Marma 4", durationSec: 60, notes: "" },
  ]);

  const [working, setWorking] = useState(false);
  const [qr, setQr] = useState(null); // { img, link? }

  async function load() {
    setLoading(true);
    try {
      const { data } = await api.get(`/sessions/${id}`);
      setRow(data || null);

      if (data?.instructions) {
        setText(data.instructions.text || "");
        setMeds(data.instructions.meds || "");
        setPhone(data.instructions.doctorPhonePublic || "");
      }

      if (Array.isArray(data?.marmaPlan) && data.marmaPlan.length) {
        // accept either {point,...} or {name,...} and normalize to {point,...}
        const normalized = data.marmaPlan.map(p => ({
          point: p.point ?? p.name ?? "",
          durationSec: Number(p.durationSec || 60),
          notes: p.notes || ""
        }));
        setPlan(normalized);
      }
    } catch (e) {
      setRow(null);
      toast.error(e?.response?.data?.message || e.message);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [id]);

  // Socket.IO connection notification listener
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;

    const socket = getSocket();
    if (!socket.connected) {
      socket.connect();
    }
    socketRef.current = socket;

    const handleConnect = (data) => {
      if (data.sessionId === id) {
        // Update connection state
        setRow((prev) => ({
          ...prev,
          connectionState: {
            userReady: data.userReady,
            doctorReady: data.doctorReady,
            connectedAt: data.connected ? new Date() : null,
          },
        }));

        if (data.connected) {
          toast.success("🎉 Both parties are ready! You can now start the session.");
        } else if (data.userReady) {
          toast.info("✅ Patient is ready to connect!");
        }
      }
    };

    socket.on("session:connect", handleConnect);

    return () => {
      socket.off("session:connect", handleConnect);
    };
  }, [id]);

  // Connect button handler
  async function handleConnect() {
    setConnecting(true);
    try {
      const { data } = await api.post(`/sessions/${id}/connect`);
      await load(); // Reload to get updated connection state
      if (data.message) {
        toast.info(data.message);
      }
    } catch (e) {
      toast.error(e?.response?.data?.message || e.message);
    } finally {
      setConnecting(false);
    }
  }

  async function accept() {
    setWorking(true);
    try {
      await api.patch(`/sessions/${id}/accept`);
      await load();
    } catch (e) {
      toast.error(e?.response?.data?.message || e.message);
    } finally {
      setWorking(false);
    }
  }

  // Save instructions + plan in ONE call (your current backend)
  async function saveAll() {
    setWorking(true);
    try {
      await api.patch(`/sessions/${id}/instructions`, {
        text,
        meds,
        doctorPhonePublic,
        marmaPlan: plan,
      });
      await load();
      toast.success("✅ Instructions sent to patient! They will be notified.");
    } catch (e) {
      toast.error(e?.response?.data?.message || e.message);
    } finally {
      setWorking(false);
    }
  }

  async function genQR() {
    setWorking(true);
    try {
      const { data } = await api.post(`/sessions/${id}/emergency-qr`);
      // support either { pngDataUrl } or { dataUrl, link }
      const img = data?.pngDataUrl || data?.dataUrl || null;
      const link = data?.link || null;
      if (!img) throw new Error("Could not generate QR.");
      setQr({ img, link });
    } catch (e) {
      toast.error(e?.response?.data?.message || e.message);
    } finally {
      setWorking(false);
    }
  }

  function addRow() {
    setPlan(p => [...p, { point: "", durationSec: 60, notes: "" }]);
  }
  function setRowVal(i, key, val) {
    setPlan(p => p.map((r, idx) => (idx === i ? { ...r, [key]: val } : r)));
  }
  function delRow(i) { setPlan(p => p.filter((_, idx) => idx !== i)); }

  if (loading) return <div className="text-white">Loading…</div>;
  if (!row) return <div className="text-rose-400">Not found</div>;

  // Show connect button when session is accepted
  const canConnect = row.status === "accepted" || row.status === "intake_submitted" || row.status === "responded";
  const connectionState = row.connectionState || { userReady: false, doctorReady: false, connectedAt: null };
  const isConnected = connectionState.userReady && connectionState.doctorReady;

  return (
    <motion.div
      className="space-y-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      {/* header */}
      <motion.div
        className="glass-strong rounded-3xl p-6"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
      >
        <div className="flex items-center gap-4">
          {row.feetPhotoUrl
            ? <img src={row.feetPhotoUrl} alt="" className="w-16 h-16 rounded-xl object-cover ring-2 ring-white/20" />
            : <div className="w-16 h-16 rounded-xl bg-white/10" />
          }
          <div className="text-white">
            <div className="text-lg font-semibold">{row.user?.name || "Patient"}</div>
            <div className="text-sm text-slate-300">{row.user?.email || ""}</div>
            <div className="text-xs text-slate-400 mt-0.5">
              {row.user?.gender || ""}{row.user?.age ? ` · ${row.user.age}y` : ""}
            </div>
          </div>
          <div className="ml-auto text-right text-slate-300">
            <div className="text-sm">{row.doctor?.name}</div>
            <div className="text-xs">{row.doctor?.specialization}</div>
            {row.status === "pending" && (
              <button
                onClick={accept}
                disabled={working}
                className="ml-3 btn btn-secondary px-6 py-3"
              >
                <span className="relative z-10">{working ? "Working…" : "Accept"}</span>
              </button>
            )}
            {canConnect && (
              <button
                onClick={handleConnect}
                disabled={connecting}
                className={`ml-3 rounded-2xl px-6 py-3 font-semibold transition-all duration-300 transform hover:scale-105 active:scale-95 ${
                  connectionState.doctorReady
                    ? "bg-gradient-to-r from-emerald-600 to-teal-600 text-white hover:from-emerald-500 hover:to-teal-500 shadow-lg shadow-emerald-500/30"
                    : "bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-500 hover:to-indigo-500 shadow-lg shadow-blue-500/30"
                } ${connecting ? "opacity-50 cursor-not-allowed" : ""}`}
              >
                {connecting
                  ? "Connecting..."
                  : connectionState.doctorReady
                  ? "✓ Ready (Click to Cancel)"
                  : isConnected
                  ? "✓ Connected"
                  : "Connect"}
              </button>
            )}
          </div>
        </div>
        {/* Connection status indicator */}
        {canConnect && (
          <div className="mt-3 flex items-center gap-3 text-sm">
            <div className={`px-3 py-1.5 rounded-xl ${
              connectionState.userReady ? "bg-emerald-500/20 text-emerald-200" : "bg-slate-500/20 text-slate-300"
            }`}>
              Patient: {connectionState.userReady ? "Ready" : "Waiting..."}
            </div>
            <div className={`px-3 py-1.5 rounded-xl ${
              connectionState.doctorReady ? "bg-emerald-500/20 text-emerald-200" : "bg-slate-500/20 text-slate-300"
            }`}>
              You: {connectionState.doctorReady ? "Ready" : "Not Ready"}
            </div>
            {isConnected && (
              <div className="px-3 py-1.5 rounded-xl bg-emerald-600/30 text-emerald-100 font-semibold">
                🎉 Connected!
              </div>
            )}
          </div>
        )}
      </motion.div>

      {/* intake (read-only) */}
      {row.intake && (
        <motion.div
          initial={{opacity:0,y:8}}
          animate={{opacity:1,y:0}}
          className="glass rounded-3xl p-6"
        >
          <div className="text-white font-semibold mb-2">Patient Intake</div>
          <div className="grid md:grid-cols-2 gap-3 text-white/90">
            <Info k="Full name" v={row.intake.fullName} />
            <Info k="Age" v={row.intake.age} />
            <Info k="Gender" v={row.intake.gender} />
            <Info k="Problem type" v={row.intake.problemType} />
            <Info k="Pain area" v={row.intake.painArea} />
            <Info k="Phone" v={row.intake.phone} />
          </div>
          {row.intake.otherNotes && (
            <div className="text-white/80 mt-2">Notes: {row.intake.otherNotes}</div>
          )}
        </motion.div>
      )}

      {/* instructions editor */}
      <motion.div initial={{opacity:0,y:8}} animate={{opacity:1,y:0}}
        className="rounded-3xl border border-white/20 bg-white/5 p-4">
        <div className="text-white font-semibold mb-2">Instructions to patient</div>
        <textarea
          value={text}
          onChange={e=>setText(e.target.value)}
          className="w-full min-h-[120px] rounded-2xl bg-white/10 text-white p-3 border border-white/20"
          placeholder="Write step-by-step advice, cautions, etc."
        />
        <div className="grid md:grid-cols-3 gap-3 mt-3">
          <input
            value={meds}
            onChange={e=>setMeds(e.target.value)}
            className="rounded-2xl bg-white/10 text-white p-3 border border-white/20"
            placeholder="Medicines / oils (optional)"
          />
          <input
            value={doctorPhonePublic}
            onChange={e=>setPhone(e.target.value)}
            className="rounded-2xl bg-white/10 text-white p-3 border border-white/20"
            placeholder="Public WhatsApp phone (e.g. 9477xxxxxxx)"
          />
          <button
            onClick={saveAll}
            disabled={working}
            className="btn btn-secondary px-6 py-3"
          >
            <span className="relative z-10">{working ? "Saving…" : "Save instructions + plan"}</span>
          </button>
        </div>
      </motion.div>

      {/* marma plan editor */}
      <motion.div
        initial={{opacity:0,y:8}}
        animate={{opacity:1,y:0}}
        className="glass rounded-3xl p-6"
      >
        <div className="flex items-center justify-between">
          <div className="text-white font-semibold">Marma Plan (4 points)</div>
          <button onClick={addRow} className="px-3 py-2 rounded-2xl border border-white/30 text-white hover:bg-white/10">
            Add Point
          </button>
        </div>

        <div className="mt-3 space-y-2">
          {plan.map((r, i) => (
            <div key={i} className="grid md:grid-cols-[1fr,140px,1fr,80px] gap-2 items-center">
              <input
                value={r.point}
                onChange={(e)=>setRowVal(i,'point',e.target.value)}
                placeholder={`Point ${i+1} name`}
                className="rounded-2xl bg-white/10 text-white p-2.5 border border-white/20"
              />
              <input
                type="number"
                min="5"
                value={r.durationSec}
                onChange={(e)=>setRowVal(i,'durationSec',Number(e.target.value || 60))}
                className="rounded-2xl bg-white/10 text-white p-2.5 border border-white/20"
                placeholder="Seconds"
              />
              <input
                value={r.notes || ""}
                onChange={(e)=>setRowVal(i,'notes',e.target.value)}
                placeholder="Notes (optional)"
                className="rounded-2xl bg-white/10 text-white p-2.5 border border-white/20"
              />
              <button
                onClick={()=>delRow(i)}
                className="px-4 py-2 rounded-xl border-2 border-rose-400/50 text-rose-200 bg-rose-500/10 hover:bg-rose-500/20 hover:border-rose-400 transition-all duration-300 transform hover:scale-105 active:scale-95"
              >
                Del
              </button>
            </div>
          ))}
        </div>

        <div className="mt-3 flex gap-2">
          <button
            onClick={saveAll}
            disabled={working}
            className="btn btn-primary px-6 py-3"
          >
            <span className="relative z-10">{working ? "Saving…" : "Save plan"}</span>
          </button>
          <button
            onClick={genQR}
            disabled={!doctorPhonePublic}
            className="btn btn-outline px-6 py-3"
            title={doctorPhonePublic ? "" : "Add a public WhatsApp phone first"}
          >
            <span className="relative z-10">Generate Emergency QR</span>
          </button>
        </div>

        {qr && (
          <div className="mt-4">
            <div className="text-slate-300 text-sm mb-2">Scan to open WhatsApp with you:</div>
            <img src={qr.img} alt="Emergency QR" className="w-48 h-48 rounded-xl border border-white/20" />
            {qr.link && <div className="text-xs text-slate-400 mt-1 break-all">{qr.link}</div>}
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}

function Info({ k, v }) {
  return (
    <div className="text-sm">
      <span className="text-white/60">{k}:</span>{" "}
      <span className="text-white/90">{v ?? "—"}</span>
    </div>
  );
}
