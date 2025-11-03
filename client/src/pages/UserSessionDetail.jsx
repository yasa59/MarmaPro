// client/src/pages/UserSessionDetail.jsx
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import api from "../api/axios";

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

  // per-point runner (IoT start/stop)
  const [runner, setRunner] = useState({ idx: -1, left: 0, running: false });

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
      console.error(e);
      setRow(null);
    } finally {
      setBusy(false);
    }
  }
  useEffect(() => {
    load();
  }, [id]);

  async function submitIntake() {
    setSaving(true);
    try {
      const payload = { ...intake, age: Number(intake.age || 0) || null };
      await api.patch(`/sessions/${id}/intake`, payload);
      await load();
      alert("Submitted.");
    } catch (e) {
      alert(e?.response?.data?.message || e.message);
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
      alert(e?.response?.data?.message || e.message);
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
  const showInstructions =
    !!row.instructions &&
    (row.status === "responded" ||
      row.status === "intake_submitted" ||
      row.status === "accepted");

  const waLink = row.instructions?.doctorPhonePublic
    ? `https://wa.me/${encodeURIComponent(
        row.instructions.doctorPhonePublic
      )}?text=${encodeURIComponent("Emergency for session " + (row.id || id))}`
    : null;

  const current = runner.idx >= 0 ? row.marmaPlan?.[runner.idx] : null;

  return (
    <div className="space-y-6">
      {/* header */}
      <div className="rounded-3xl border border-white/25 bg-gradient-to-r from-slate-900/80 to-slate-800/70 p-4 backdrop-blur">
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
          </div>
        </div>
      </div>

      {/* intake form (only when accepted and not submitted yet) */}
      {showIntake && (
        <div className="rounded-3xl border border-white/20 bg-white/5 backdrop-blur p-4">
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
              className="px-4 py-2.5 rounded-2xl bg-emerald-600 text-white hover:bg-emerald-700 transition"
            >
              {saving ? "Submitting…" : "Submit"}
            </button>
          </div>
        </div>
      )}

      {/* doctor's instructions */}
      {showInstructions && (
        <div className="rounded-3xl border border-white/20 bg-white/5 p-4">
          <div className="text-white font-semibold mb-2">Doctor’s instructions</div>
          <div className="text-slate-200 whitespace-pre-wrap">
            {row.instructions?.text || "—"}
          </div>
          {row.instructions?.meds && (
            <div className="mt-2 text-slate-300 text-sm">
              <b>Medicines:</b> {row.instructions.meds}
            </div>
          )}
          {row.instructions?.doctorPhonePublic && (
            <div className="mt-2 text-slate-300 text-sm">
              <b>Doctor (WhatsApp):</b> {row.instructions.doctorPhonePublic}
            </div>
          )}
        </div>
      )}

      {/* marma plan with IoT start/stop per point */}
      <div className="rounded-3xl border border-white/20 bg-white/5 p-4">
        <div className="text-white font-semibold mb-3">Marma plan</div>

        {!row.marmaPlan?.length ? (
          <div className="text-slate-300">No plan yet.</div>
        ) : (
          <>
            <div className="grid gap-2">
              {row.marmaPlan.map((p, i) => (
                <div
                  key={i}
                  className={`grid md:grid-cols-[1fr,120px,1fr,auto] gap-2 items-center ${
                    runner.idx === i && runner.running
                      ? "bg-white/10 rounded-2xl p-2"
                      : ""
                  }`}
                >
                  <div className="text-white">{p.name || p.point || `Point ${i + 1}`}</div>
                  <div className="text-slate-300">{(p.durationSec ?? 60)}s</div>
                  <div className="text-slate-400">{p.notes || ""}</div>

                  {runner.idx === i && runner.running ? (
                    <button
                      onClick={() => stopPoint(i)}
                      className="rounded-2xl bg-rose-600 text-white hover:bg-rose-700 px-3 py-1.5"
                    >
                      Stop
                    </button>
                  ) : (
                    <button
                      onClick={() => startPoint(i)}
                      className="rounded-2xl bg-emerald-600 text-white hover:bg-emerald-700 px-3 py-1.5"
                    >
                      Start
                    </button>
                  )}
                </div>
              ))}
            </div>

            {runner.running && current && (
              <div className="mt-3 px-3 py-2 rounded-2xl bg-white/10 text-white">
                Running: <b>{current.name || current.point || `Point ${runner.idx + 1}`}</b>{" "}
                — {runner.left}s left
              </div>
            )}
          </>
        )}
      </div>
    </div>
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
