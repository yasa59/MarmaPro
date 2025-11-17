// client/src/pages/RequestTherapyForm.jsx
import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import api from "../api/axios";

export default function RequestTherapyForm() {
  const { doctorId } = useParams();
  const navigate = useNavigate();
  const [doctor, setDoctor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Intake form state
  const [intake, setIntake] = useState({
    fullName: "",
    age: "",
    gender: "male",
    painArea: "",
    problemType: "physical",
    phone: "",
    otherNotes: "",
  });

  // Load doctor info
  useEffect(() => {
    async function loadDoctor() {
      if (!doctorId) {
        alert("Doctor ID is required");
        navigate("/user/doctors");
        return;
      }
      setLoading(true);
      try {
        const { data } = await api.get(`/doctors/${doctorId}/profile`);
        setDoctor(data);
      } catch (e) {
        alert(e?.response?.data?.message || e.message || "Failed to load doctor");
        navigate("/user/doctors");
      } finally {
        setLoading(false);
      }
    }
    loadDoctor();
  }, [doctorId, navigate]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!doctorId) return;

    // Basic validation
    if (!intake.fullName.trim()) {
      alert("Please enter your full name");
      return;
    }
    if (!intake.age || Number(intake.age) <= 0) {
      alert("Please enter a valid age");
      return;
    }
    if (!intake.phone.trim()) {
      alert("Please enter your phone number");
      return;
    }

    setSubmitting(true);
    try {
      // Send request with intake data
      const { data } = await api.post("/doctors/request", {
        doctorId,
        intake: {
          fullName: intake.fullName.trim(),
          age: Number(intake.age),
          gender: intake.gender,
          painArea: intake.painArea.trim(),
          problemType: intake.problemType,
          phone: intake.phone.trim(),
          otherNotes: intake.otherNotes.trim(),
        },
      });

      alert("✅ Request sent successfully! The doctor will review your information.");
      navigate("/user/sessions");
    } catch (e) {
      const msg = e?.response?.data?.message || e.message || "Failed to send request";
      alert(msg);
      console.error("RequestTherapyForm error:", e?.response || e);
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-white text-lg">Loading doctor information...</div>
      </div>
    );
  }

  if (!doctor) {
    return (
      <div className="text-white text-center p-6">
        <div className="text-rose-400">Doctor not found</div>
        <button
          onClick={() => navigate("/user/doctors")}
          className="mt-4 btn btn-primary"
        >
          Go back to doctors list
        </button>
      </div>
    );
  }

  return (
    <motion.div
      className="max-w-3xl mx-auto space-y-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      {/* Header with doctor info */}
      <motion.div
        className="glass-strong rounded-3xl p-6"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
      >
        <div className="flex items-center gap-4 mb-4">
          {doctor.profilePhoto ? (
            <img
              src={doctor.profilePhoto}
              alt={doctor.name}
              className="w-20 h-20 rounded-2xl object-cover ring-2 ring-white/20"
            />
          ) : (
            <div className="w-20 h-20 rounded-2xl bg-white/10" />
          )}
          <div className="flex-1">
            <div className="text-2xl font-semibold text-white">{doctor.name}</div>
            <div className="text-sm text-slate-300">{doctor.email}</div>
            {doctor.specialization && (
              <div className="text-sm text-slate-400 mt-1">
                {doctor.specialization}
              </div>
            )}
          </div>
        </div>
        <div className="text-white/80 text-sm">
          Please fill out the form below to request therapy from this doctor.
        </div>
      </motion.div>

      {/* Intake Form */}
      <motion.div
        className="glass rounded-3xl p-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
      >
        <div className="text-white font-semibold text-xl mb-4">
          Patient Information & Illness Details
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <Input
              label="Full Name *"
              value={intake.fullName}
              onChange={(e) => setIntake((v) => ({ ...v, fullName: e.target.value }))}
              required
            />
            <Input
              label="Age *"
              type="number"
              min="1"
              max="120"
              value={intake.age}
              onChange={(e) => setIntake((v) => ({ ...v, age: e.target.value }))}
              required
            />
            <Select
              label="Gender *"
              value={intake.gender}
              onChange={(e) => setIntake((v) => ({ ...v, gender: e.target.value }))}
              options={[
                ["male", "Male"],
                ["female", "Female"],
                ["other", "Other"],
              ]}
            />
            <Select
              label="Problem Type *"
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
              label="Pain Area"
              value={intake.painArea}
              onChange={(e) => setIntake((v) => ({ ...v, painArea: e.target.value }))}
              placeholder="e.g., Lower back, Head, Legs"
            />
            <Input
              label="Phone Number *"
              type="tel"
              value={intake.phone}
              onChange={(e) => setIntake((v) => ({ ...v, phone: e.target.value }))}
              placeholder="e.g., 9477xxxxxxx"
              required
            />
          </div>

          <div>
            <Textarea
              label="Other Notes / Additional Information"
              value={intake.otherNotes}
              onChange={(e) => setIntake((v) => ({ ...v, otherNotes: e.target.value }))}
              placeholder="Describe your condition, symptoms, or any other relevant information..."
              rows={5}
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={() => navigate("/user/doctors")}
              className="btn btn-ghost px-6 py-3"
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="btn btn-primary px-6 py-3 flex-1"
            >
              <span className="relative z-10">
                {submitting ? "Sending Request..." : "Send Request to Doctor"}
              </span>
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}

function Input({ label, required, ...rest }) {
  return (
    <label className="block text-sm text-white">
      {label}
      <input
        {...rest}
        required={required}
        className="mt-1 w-full p-3 rounded-xl bg-white/10 border border-white/20 outline-none text-white placeholder:text-white/50 focus:border-blue-400/50 focus:ring-2 focus:ring-blue-400/20 transition"
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
        className="mt-1 w-full p-3 rounded-xl bg-white/10 border border-white/20 outline-none text-white focus:border-blue-400/50 focus:ring-2 focus:ring-blue-400/20 transition"
      >
        {options.map(([v, l]) => (
          <option key={v} value={v} className="bg-slate-800">
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
        className="mt-1 w-full p-3 rounded-xl bg-white/10 border border-white/20 outline-none text-white placeholder:text-white/50 focus:border-blue-400/50 focus:ring-2 focus:ring-blue-400/20 transition resize-none"
      />
    </label>
  );
}

