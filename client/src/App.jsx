// client/src/App.jsx
import { useEffect, useRef, useState } from "react";
import { Routes, Route, Navigate, useNavigate } from "react-router-dom";
import { useTheme } from "./context/ThemeContext";
import Navbar from "./components/Navbar";

import HomeGate from "./components/HomeGate";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Signup from "./pages/Signup";

import CallRoom from "./pages/CallRoom"; // ok to keep even if you don't use it

import AdminDashboard from "./pages/AdminDashboard";
import UserDashboard from "./pages/UserDashboard";
import DoctorDashboard from "./pages/DoctorDashboard";

import ProtectedRoute from "./components/ProtectedRoute";

import TherapyControls from "./pages/TherapyControls";
import TherapySelf from "./pages/TherapySelf";

import ChooseDoctor from "./pages/ChooseDoctor";
import PatientIntakeForm from "./pages/PatientIntakeForm";
import DoctorAlerts from "./pages/DoctorAlerts";
import DoctorPatients from "./pages/DoctorPatients";
import DoctorPatient from "./pages/DoctorPatient";

import UserFootPhoto from "./pages/UserFootPhoto";
import UserPhotos from "./pages/UserPhotos";
import DoctorPatientPhotos from "./pages/DoctorPatientPhotos";
import ProfileSettings from "./pages/ProfileSettings";

// 🔔 call hub + incoming modal
import { initCallHub } from "./lib/callHub";
import IncomingCallModal from "./components/IncomingCallModal";

// Therapy-session pages (use ONE set consistently)
import UserTherapyList from "./pages/UserTherapyList";
import UserSessionDetail from "./pages/UserSessionDetail";
import DoctorTherapyRequests from "./pages/DoctorTherapyRequests";
import DoctorSessionDetail from "./pages/DoctorSessionDetail";

// Public doctor profile (signed-in)
import DoctorPublicProfile from "./pages/DoctorPublicProfile";
// Connected doctor profile (for patients)
import DoctorProfile from "./pages/DoctorProfile";

import NotificationsPage from "./pages/Notifications";
import { ToastContainer } from "./components/Toast";

export default function AppShell() {
  const nav = useNavigate();
  const hubRef = useRef(null);
  const [incoming, setIncoming] = useState(null);
  const { theme } = useTheme();

  // Start call hub after login (token exists)
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;
    if (hubRef.current) return; // prevent double init
    hubRef.current = initCallHub({ onIncoming: (payload) => setIncoming(payload) });
    return () => {
      try { hubRef.current?.disconnect(); } catch {}
      hubRef.current = null;
    };
  }, []);

  const acceptIncoming = () => {
    const roomId = incoming?.roomId;
    setIncoming(null);
    if (roomId) nav(`/call/${roomId}`);
  };
  const declineIncoming = () => setIncoming(null);

  // Theme-based overlay opacity - lighter overlay in dark mode to show background more
  const overlayClass = theme === "dark" 
    ? "bg-gradient-to-br from-slate-950/75 via-blue-950/70 to-indigo-950/75" // More transparent in dark mode
    : "bg-gradient-to-br from-white/85 via-blue-50/80 to-indigo-50/85"; // Light overlay for light mode

  return (
    <div className="min-h-screen bg-cover bg-center bg-fixed relative" style={{ backgroundImage: 'url("/bg.jpg")' }}>
      {/* Theme-aware Overlay - More visible background */}
      <div className={`absolute inset-0 ${overlayClass} transition-colors duration-300`} />

      {/* 🔔 incoming call modal */}
      <IncomingCallModal open={!!incoming} info={incoming} onAccept={acceptIncoming} onDecline={declineIncoming} />

      <div className="relative z-10">
        <Navbar />
        <ToastContainer />
        <div className="max-w-7xl mx-auto px-4 lg:px-6 py-6">
          <Routes>
            {/* public */}
            <Route path="/" element={<HomeGate landing={<Landing />} />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />

            {/* dashboards */}
            <Route
              path="/admin"
              element={<ProtectedRoute role="admin"><AdminDashboard /></ProtectedRoute>}
            />
            <Route
              path="/user"
              element={<ProtectedRoute role="user"><UserDashboard /></ProtectedRoute>}
            />
            <Route
              path="/doctor"
              element={<ProtectedRoute role="doctor"><DoctorDashboard /></ProtectedRoute>}
            />

            {/* call room (optional) */}
            <Route
              path="/call/:roomId"
              element={<ProtectedRoute><CallRoom /></ProtectedRoute>}
            />
            <Route
              path="/call"
              element={<ProtectedRoute><CallRoom /></ProtectedRoute>}
            />

            {/* public doctor profile (signed-in) — define ONCE */}
            <Route
              path="/doctor/:id/profile"
              element={<ProtectedRoute><DoctorPublicProfile /></ProtectedRoute>}
            />
            {/* connected doctor profile (for patients) */}
            <Route
              path="/user/doctor/:id/profile"
              element={<ProtectedRoute role="user"><DoctorProfile /></ProtectedRoute>}
            />

            {/* user flows */}
            <Route
              path="/user/doctors"
              element={<ProtectedRoute role="user"><ChooseDoctor /></ProtectedRoute>}
            />
            <Route
              path="/patient-intake/:doctorId"
              element={<ProtectedRoute role="user"><PatientIntakeForm /></ProtectedRoute>}
            />
            <Route
              path="/user/foot-photo"
              element={<ProtectedRoute role="user"><UserFootPhoto /></ProtectedRoute>}
            />
            <Route
              path="/user/photos"
              element={<ProtectedRoute role="user"><UserPhotos /></ProtectedRoute>}
            />
            <Route
              path="/therapy"
              element={<ProtectedRoute role="user"><TherapySelf /></ProtectedRoute>}
            />

            {/* doctor flows */}
            <Route
              path="/doctor/alerts"
              element={<ProtectedRoute role="doctor"><DoctorAlerts /></ProtectedRoute>}
            />
            <Route
              path="/doctor/patients"
              element={<ProtectedRoute role="doctor"><DoctorPatients /></ProtectedRoute>}
            />
            <Route
              path="/doctor/patient/:id"
              element={<ProtectedRoute role="doctor"><DoctorPatient /></ProtectedRoute>}
            />
            <Route
              path="/doctor/patient/:id/photos"
              element={<ProtectedRoute role="doctor"><DoctorPatientPhotos /></ProtectedRoute>}
            />
            <Route
              path="/doctor/therapy"
              element={<ProtectedRoute role="doctor"><TherapyControls /></ProtectedRoute>}
            />

            {/* therapy-session routes (ONE set) */}
            <Route
              path="/user/sessions"
              element={<ProtectedRoute role="user"><UserTherapyList /></ProtectedRoute>}
            />
            <Route
              path="/user/session/:id"
              element={<ProtectedRoute role="user"><UserSessionDetail /></ProtectedRoute>}
            />
            <Route
              path="/doctor/therapy-requests"
              element={<ProtectedRoute role="doctor"><DoctorTherapyRequests /></ProtectedRoute>}
            />
            <Route
              path="/doctor/session/:id"
              element={<ProtectedRoute role="doctor"><DoctorSessionDetail /></ProtectedRoute>}
            />

            {/* settings */}
            <Route
              path="/settings/profile"
              element={<ProtectedRoute><ProfileSettings /></ProtectedRoute>}
            />

            {/* notifications */}
<Route
  path="/notifications"
  element={
    <ProtectedRoute>
      <NotificationsPage />
    </ProtectedRoute>
  }
/>

            {/* catch-all */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </div>
    </div>
  );
}
