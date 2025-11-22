// client/src/pages/UserSessionDetail.jsx
import { useEffect, useState, useRef } from "react";
import { useParams } from "react-router-dom";
import { motion } from "framer-motion";
import api from "../api/axios";
import { getSocket } from "../lib/socket";
import toast from "../components/Toast";

export default function UserSessionDetail() {
  const { id } = useParams();
  const [row, setRow] = useState(null);
  const [loading, setBusy] = useState(true);

  // intake form local state
  const [intake, setIntake] = useState({
    fullName: "",
    age: "",
    gender: "male",
    painArea: "",
    problemType: "physical",
    phone: "",
    otherNotes: "",
  });
  const [saving, setSaving] = useState(false);
  const [connecting, setConnecting] = useState(false);

  // per-point runner (IoT start/stop)
  const [runner, setRunner] = useState({ idx: -1, left: 0, running: false });
  const socketRef = useRef(null);

  async function load() {
    setBusy(true);
    try {
      const { data } = await api.get(`/sessions/${id}`);
      setRow(data || null);
      if (data?.intake) {
        setIntake((prev) => ({
          ...prev,
          ...data.intake,
          age: data.intake.age ?? "",
        }));
      }
    } catch (e) {
      if (import.meta.env.DEV) {
        console.error(e);
      }
      setRow(null);
    } finally {
      setBusy(false);
    }
  }
  useEffect(() => {
    load();
  }, [id]);

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
        } else if (data.doctorReady) {
          toast.info("✅ Doctor is ready to connect!");
        }
      }
    };

    const handleInstructions = (data) => {
      if (data.sessionId === id) {
        // Reload session data to get updated instructions
        load();
        toast.success(`📋 ${data.doctorName} has sent you therapy instructions!`);
      }
    };

    socket.on("session:connect", handleConnect);
    socket.on("session:instructions", handleInstructions);

    return () => {
      socket.off("session:connect", handleConnect);
      socket.off("session:instructions", handleInstructions);
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

  async function submitIntake() {
    setSaving(true);
    try {
      const payload = { ...intake, age: Number(intake.age || 0) || null };
      await api.patch(`/sessions/${id}/intake`, payload);
      await load();
      toast.success("Submitted.");
    } catch (e) {
      toast.error(e?.response?.data?.message || e.message);
    } finally {
      setSaving(false);
    }
  }

  // ===== Countdown for the currently running point =====
  useEffect(() => {
    if (!runner.running) return;
    if (runner.left <= 0) {
      // time up → auto stop this point (no alert)
      stopPoint(runner.idx, false);
      return;
    }
    const t = setTimeout(
      () => setRunner((v) => ({ ...v, left: Math.max(0, v.left - 1) })),
      1000
    );
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runner]);

  // ===== IoT: start/stop a specific marma point =====
  async function startPoint(i) {
    if (!row?.marmaPlan?.[i]) return;
    try {
      // if something else is running, stop it first
      if (runner.running && runner.idx !== i) {
        try {
          await api.post(`/sessions/${id}/control`, {
            pointIndex: runner.idx,
            action: "stop",
          });
        } catch {}
      }
      await api.post(`/sessions/${id}/control`, { pointIndex: i, action: "start" });
      const secs = Number(row.marmaPlan[i].durationSec || 60);
      setRunner({ idx: i, left: secs, running: true });
    } catch (e) {
      toast.error(e?.response?.data?.message || e.message);
    }
  }

  async function stopPoint(i, reset = true) {
    if (i < 0) {
      if (reset) setRunner({ idx: -1, left: 0, running: false });
      return;
    }
    try {
      await api.post(`/sessions/${id}/control`, { pointIndex: i, action: "stop" });
    } catch {}
    if (reset) setRunner({ idx: -1, left: 0, running: false });
    else setRunner({ idx: -1, left: 0, running: false });
  }

  if (loading) return <div className="p-6 text-white/80">Loading…</div>;
  if (!row) return <div className="p-6 text-red-200">Not found.</div>;

  const showIntake = row.status === "accepted" && !row.intake;
  // Show instructions if they exist, regardless of status (they can be sent at any time after acceptance)
  const showInstructions = !!row.instructions && (
    row.status === "responded" ||
    row.status === "intake_submitted" ||
    row.status === "accepted"
  ) && (row.instructions.text || row.instructions.meds || row.instructions.doctorPhonePublic);

  // Show connect button when session is accepted (after intake or instructions)
  const canConnect = row.status === "accepted" || row.status === "intake_submitted" || row.status === "responded";
  const connectionState = row.connectionState || { userReady: false, doctorReady: false, connectedAt: null };
  const isConnected = connectionState.userReady && connectionState.doctorReady;

  const waLink = row.instructions?.doctorPhonePublic
    ? `https://wa.me/${encodeURIComponent(
        row.instructions.doctorPhonePublic
      )}?text=${encodeURIComponent("Emergency for session " + (row.id || id))}`
    : null;

  const current = runner.idx >= 0 ? row.marmaPlan?.[runner.idx] : null;

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
          {row.feetPhotoUrl ? (
            <img
              src={row.feetPhotoUrl}
              alt=""
              className="w-16 h-16 rounded-xl object-cover ring-2 ring-white/20"
            />
          ) : (
            <div className="w-16 h-16 rounded-xl bg-white/10" />
          )}
          <div className="text-white">
            <div className="text-lg font-semibold">{row.doctor?.name || "Doctor"}</div>
            <div className="text-sm text-slate-300">{row.doctor?.email || ""}</div>
            {row.doctor?.specialization && (
              <div className="text-xs text-slate-400 mt-0.5">
                {row.doctor.specialization}
              </div>
            )}
          </div>
          <div className="ml-auto flex items-center gap-2">
            <div className="text-xs text-slate-300 bg-white/10 border border-white/20 rounded-2xl px-2 py-1">
              Status:{" "}
              <span className="text-white font-medium">
                {(row.status || "").replace(/_/g, " ")}
              </span>
            </div>
            {waLink && (
              <a
                href={waLink}
                target="_blank"
                rel="noreferrer"
                className="rounded-2xl border border-white/30 text-white hover:bg-white/10 px-3 py-1.5"
              >
                Emergency WhatsApp
              </a>
            )}
            {canConnect && (
              <button
                onClick={handleConnect}
                disabled={connecting}
                className={`rounded-2xl px-6 py-3 font-semibold transition-all duration-300 transform hover:scale-105 active:scale-95 ${
                  connectionState.userReady
                    ? "bg-gradient-to-r from-emerald-600 to-teal-600 text-white hover:from-emerald-500 hover:to-teal-500 shadow-lg shadow-emerald-500/30"
                    : "bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-500 hover:to-indigo-500 shadow-lg shadow-blue-500/30"
                } ${connecting ? "opacity-50 cursor-not-allowed" : ""}`}
              >
                {connecting
                  ? "Connecting..."
                  : connectionState.userReady
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
              You: {connectionState.userReady ? "Ready" : "Not Ready"}
            </div>
            <div className={`px-3 py-1.5 rounded-xl ${
              connectionState.doctorReady ? "bg-emerald-500/20 text-emerald-200" : "bg-slate-500/20 text-slate-300"
            }`}>
              Doctor: {connectionState.doctorReady ? "Ready" : "Waiting..."}
            </div>
            {isConnected && (
              <div className="px-3 py-1.5 rounded-xl bg-emerald-600/30 text-emerald-100 font-semibold">
                🎉 Connected!
              </div>
            )}
          </div>
        )}
      </motion.div>

      {/* intake form (only when accepted and not submitted yet) */}
      {showIntake && (
        <motion.div
          className="glass rounded-3xl p-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <div className="text-white font-semibold mb-3">Intake Form</div>
          <div className="grid md:grid-cols-2 gap-3">
            <Input
              label="Full name"
              value={intake.fullName}
              onChange={(e) => setIntake((v) => ({ ...v, fullName: e.target.value }))}
            />
            <Input
              label="Age"
              type="number"
              value={intake.age}
              onChange={(e) => setIntake((v) => ({ ...v, age: e.target.value }))}
            />
            <Select
              label="Gender"
              value={intake.gender}
              onChange={(e) => setIntake((v) => ({ ...v, gender: e.target.value }))}
              options={[
                ["male", "Male"],
                ["female", "Female"],
                ["other", "Other"],
              ]}
            />
            <Select
              label="Problem type"
              value={intake.problemType}
              onChange={(e) =>
                setIntake((v) => ({ ...v, problemType: e.target.value }))
              }
              options={[
                ["physical", "Physical"],
                ["mental", "Mental"],
                ["both", "Both"],
              ]}
            />
            <Input
              label="Pain area"
              value={intake.painArea}
              onChange={(e) => setIntake((v) => ({ ...v, painArea: e.target.value }))}
            />
            <Input
              label="Phone number"
              value={intake.phone}
              onChange={(e) => setIntake((v) => ({ ...v, phone: e.target.value }))}
            />
          </div>
          <div className="mt-3">
            <Textarea
              label="Other notes"
              value={intake.otherNotes}
              onChange={(e) => setIntake((v) => ({ ...v, otherNotes: e.target.value }))}
            />
          </div>
          <div className="mt-3">
            <button
              onClick={submitIntake}
              disabled={saving}
              className="btn btn-secondary px-6 py-3"
            >
              <span className="relative z-10">{saving ? "Submitting…" : "Submit"}</span>
            </button>
          </div>
        </motion.div>
      )}

      {/* doctor's instructions */}
      {showInstructions && (
        <motion.div
          className="rounded-3xl border border-emerald-500/30 bg-gradient-to-br from-emerald-900/20 to-slate-800/50 p-6 shadow-lg"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          whileHover={{ scale: 1.02 }}
        >
          <div className="flex items-center gap-2 mb-3">
            <div className="text-emerald-300 font-semibold text-lg">📋 Doctor's Instructions</div>
            <div className="ml-auto text-xs text-emerald-300/70 bg-emerald-500/20 px-2 py-1 rounded-full">
              New
            </div>
          </div>
          <div className="text-slate-100 whitespace-pre-wrap bg-white/5 p-3 rounded-xl border border-white/10">
            {row.instructions?.text || "—"}
          </div>
          {row.instructions?.meds && (
            <div className="mt-3 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
              <div className="text-amber-200 text-sm font-semibold mb-1">💊 Medicines:</div>
              <div className="text-amber-100">{row.instructions.meds}</div>
            </div>
          )}
          {row.instructions?.doctorPhonePublic && (
            <div className="mt-3 p-3 rounded-xl bg-blue-500/10 border border-blue-500/20">
              <div className="text-blue-200 text-sm font-semibold mb-1">📱 Doctor Contact:</div>
              <div className="text-blue-100">{row.instructions.doctorPhonePublic}</div>
            </div>
          )}
        </motion.div>
      )}

      {/* marma plan with IoT start/stop per point */}
      <motion.div
        className="glass rounded-3xl p-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
      >
        <div className="text-white font-semibold mb-3">Marma plan</div>

        {!row.marmaPlan?.length ? (
          <div className="text-slate-300">No plan yet.</div>
        ) : (
          <>
            <div className="grid gap-3">
              {row.marmaPlan.map((p, i) => (
                <motion.div
                  key={i}
                  className={`grid md:grid-cols-[1fr,120px,1fr,auto] gap-3 items-center rounded-2xl p-3 transition-all duration-300 ${
                    runner.idx === i && runner.running
                      ? "bg-gradient-to-r from-emerald-500/20 to-teal-500/20 border-2 border-emerald-400/50 shadow-lg shadow-emerald-500/20"
                      : "hover:bg-white/5"
                  }`}
                  whileHover={{ scale: 1.01 }}
                  transition={{ duration: 0.2 }}
                >
                  <div className="text-white font-medium">{p.name || p.point || `Point ${i + 1}`}</div>
                  <div className="text-slate-300 text-sm">{(p.durationSec ?? 60)}s</div>
                  <div className="text-slate-400 text-sm">{p.notes || ""}</div>

                  {runner.idx === i && runner.running ? (
                    <button
                      onClick={() => stopPoint(i)}
                      className="rounded-2xl bg-gradient-to-r from-rose-600 to-pink-600 text-white hover:from-rose-500 hover:to-pink-500 px-4 py-2 font-semibold transition-all duration-300 transform hover:scale-105 active:scale-95 shadow-lg shadow-rose-500/30"
                    >
                      Stop
                    </button>
                  ) : (
                    <button
                      onClick={() => startPoint(i)}
                      className="rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white hover:from-emerald-500 hover:to-teal-500 px-4 py-2 font-semibold transition-all duration-300 transform hover:scale-105 active:scale-95 shadow-lg shadow-emerald-500/30"
                    >
                      Start
                    </button>
                  )}
                </motion.div>
              ))}
            </div>

            {runner.running && current && (
              <motion.div
                className="mt-4 px-4 py-3 rounded-2xl bg-gradient-to-r from-emerald-600/30 to-teal-600/30 border-2 border-emerald-400/50 text-white shadow-lg"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3 }}
              >
                <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 mr-2 animate-pulse" />
                Running: <b>{current.name || current.point || `Point ${runner.idx + 1}`}</b>{" "}
                — {runner.left}s left
              </motion.div>
            )}
          </>
        )}
      </motion.div>
    </motion.div>
  );
}

function Input({ label, ...rest }) {
  return (
    <label className="block text-sm text-white">
      {label}
      <input
        {...rest}
        className="mt-1 w-full p-2.5 rounded-xl bg-white/10 border border-white/20 outline-none text-white"
      />
    </label>
  );
}
function Select({ label, options = [], ...rest }) {
  return (
    <label className="block text-sm text-white">
      {label}
      <select
        {...rest}
        className="mt-1 w-full p-2.5 rounded-xl bg-white/10 border border-white/20 outline-none text-white"
      >
        {options.map(([v, l]) => (
          <option key={v} value={v}>
            {l}
          </option>
        ))}
      </select>
    </label>
  );
}
function Textarea({ label, ...rest }) {
  return (
    <label className="block text-sm text-white">
      {label}
      <textarea
        {...rest}
        rows={4}
        className="mt-1 w-full p-2.5 rounded-xl bg-white/10 border border-white/20 outline-none text-white"
      />
    </label>
  );
}
