// client/src/App.jsx
import { useEffect, useRef, useState } from "react";
import { Routes, Route, Navigate, useNavigate } from "react-router-dom";
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

import NotificationsPage from "./pages/Notifications"; // add import at the top

export default function AppShell() {
  const nav = useNavigate();
  const hubRef = useRef(null);
  const [incoming, setIncoming] = useState(null);

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

  return (
    <div className="min-h-screen bg-cover bg-center relative" style={{ backgroundImage: 'url("/bg.jpg")' }}>
      {/* overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-900/80 via-blue-700/70 to-blue-600/60" />

      {/* 🔔 incoming call modal */}
      <IncomingCallModal open={!!incoming} info={incoming} onAccept={acceptIncoming} onDecline={declineIncoming} />

      <div className="relative z-10">
        <Navbar />
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

            {/* user flows */}
            <Route
              path="/user/doctors"
              element={<ProtectedRoute role="user"><ChooseDoctor /></ProtectedRoute>}
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

            {/* catch-all */}
            <Route path="*" element={<Navigate to="/" replace />} />

<Route
  path="/notifications"
  element={
    <ProtectedRoute>
      <NotificationsPage />
    </ProtectedRoute>
  }
/>

<Route path="/user/sessions" element={<ProtectedRoute role="user"><UserTherapyList /></ProtectedRoute>} />
<Route path="/user/session/:id" element={<ProtectedRoute role="user"><UserSessionDetail /></ProtectedRoute>} />

<Route path="/doctor/session/:id" element={<ProtectedRoute role="doctor"><DoctorSessionDetail /></ProtectedRoute>} />

          </Routes>
        </div>
      </div>
    </div>
  );
}
