// client/src/pages/DoctorAlerts.jsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import api from "../api/axios";
import CallButton from "../components/CallButton";

export default function DoctorAlerts() {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [expandedItems, setExpandedItems] = useState(new Set());
  const [notifications, setNotifications] = useState([]);
  const [notifLoading, setNotifLoading] = useState(false);
  const [notifErr, setNotifErr] = useState("");

  async function load() {
    setLoading(true);
    setErr("");
    try {
      const { data } = await api.get("/doctors/alerts");
      console.log("📬 Doctor alerts response:", data);
      const items = Array.isArray(data?.items) ? data.items : [];
      console.log(`📋 Loaded ${items.length} alerts`);
      setItems(items);
    } catch (e) {
      const msg =
        e?.response?.data?.message ||
        `${e?.response?.status || ""} ${e?.response?.statusText || ""}`.trim() ||
        e.message;
      console.error("❌ Load doctor alerts failed:", e?.response || e);
      setErr(msg);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  async function loadNotifications() {
    setNotifLoading(true);
    setNotifErr("");
    try {
      const { data } = await api.get("/notifications?limit=25");
      const items = Array.isArray(data?.items) ? data.items : [];
      console.log("🔔 General notifications for doctor:", items.length);
      setNotifications(items);
    } catch (e) {
      const msg =
        e?.response?.data?.message ||
        `${e?.response?.status || ""} ${e?.response?.statusText || ""}`.trim() ||
        e.message;
      console.error("❌ Load doctor notifications failed:", e?.response || e);
      setNotifErr(msg);
      setNotifications([]);
    } finally {
      setNotifLoading(false);
    }
  }

  useEffect(() => {
    load();
    loadNotifications();
  }, []);

  async function respond(connectionId, action) {
    try {
      await api.post("/doctors/alerts/respond", { connectionId, action }); // 'accept' | 'reject'
      await load();
    } catch (e) {
      const msg =
        e?.response?.data?.message ||
        `${e?.response?.status || ""} ${e?.response?.statusText || ""}`.trim() ||
        e.message;
      console.error("Respond error:", e?.response || e);
      alert(`Failed to ${action}: ${msg}`);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl md:text-2xl font-semibold text-white">Therapy Requests</h1>
        <button
          onClick={() => {
            load();
            loadNotifications();
          }}
          className="px-3 py-2 rounded-2xl border border-white/20 bg-white/10 text-white hover:bg-white/20 transition"
        >
          Refresh
        </button>
      </div>

      {/* Card container */}
      <div className="rounded-3xl border border-white/10 bg-gradient-to-b from-slate-900/70 to-slate-800/60 backdrop-blur p-4 text-white shadow-xl">
        {err && (
          <div className="mb-3 text-sm text-rose-300">
            {err}
          </div>
        )}

        {/* Loading skeletons */}
        {loading && (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="rounded-2xl p-4 border border-white/10 bg-slate-900/40 animate-pulse"
              >
                <div className="h-12 w-12 bg-slate-700/60 rounded-xl mb-3" />
                <div className="h-3 bg-slate-700/60 rounded w-1/2 mb-2" />
                <div className="h-3 bg-slate-700/60 rounded w-1/3 mb-4" />
                <div className="h-9 bg-slate-700/60 rounded w-full" />
              </div>
            ))}
          </div>
        )}

        {/* Empty state */}
        {!loading && items.length === 0 && !err && (
          <div className="p-8 text-slate-300 text-center">
            <div className="text-lg mb-2">No pending requests.</div>
            <div className="text-sm text-slate-400">When patients send therapy requests, they will appear here.</div>
          </div>
        )}
        
        {err && (
          <div className="p-8 text-rose-300 text-center">
            <div className="text-lg mb-2">Error loading alerts</div>
            <div className="text-sm">{err}</div>
            <button
              onClick={load}
              className="mt-4 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white"
            >
              Retry
            </button>
          </div>
        )}

        {/* Items */}
        <AnimatePresence mode="popLayout">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((it, idx) => {
              const u = it.user || {}; // { id, name, email, gender, age }
              const thumb = it.photo?.annotated || it.photo?.raw || null;
              const when = it.requestedAt ? new Date(it.requestedAt).toLocaleString() : "—";

              return (
                <motion.div
                  key={it.id}
                  layout
                  initial={{ y: 8, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: 8, opacity: 0 }}
                  transition={{ delay: idx * 0.03 }}
                  className="group rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 transition p-4 shadow-lg hover:shadow-2xl"
                >
                  <div className="flex items-start gap-3">
                    {thumb ? (
                      <img
                        src={thumb}
                        alt="foot"
                        className="w-14 h-14 rounded-xl object-cover ring-2 ring-white/30"
                      />
                    ) : (
                      <div className="w-14 h-14 rounded-xl bg-slate-700/60" />
                    )}
                    <div className="flex-1">
                      <div className="font-semibold text-white/95">{u.name || "Patient"}</div>
                      <div className="text-xs text-white/70">{u.email || ""}</div>
                      <div className="text-xs text-white/70 mt-1">
                        {(u.gender ? `${u.gender} · ` : "")}{u.age ? `${u.age}y` : ""}
                      </div>
                      <div className="text-xs text-white/50 mt-1">
                        Requested: {when}
                      </div>
                    </div>
                  </div>

                  {/* Intake Form Display */}
                  {it.intake && (
                    <div className="mt-3">
                      <button
                        onClick={() => {
                          const newExpanded = new Set(expandedItems);
                          if (newExpanded.has(it.id)) {
                            newExpanded.delete(it.id);
                          } else {
                            newExpanded.add(it.id);
                          }
                          setExpandedItems(newExpanded);
                        }}
                        className="w-full text-left px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-sm text-white/80 flex items-center justify-between"
                      >
                        <span>View Patient Intake Form</span>
                        <span>{expandedItems.has(it.id) ? "▼" : "▶"}</span>
                      </button>
                      {expandedItems.has(it.id) && (
                        <div className="mt-2 p-3 rounded-xl bg-slate-800/50 border border-white/10 text-sm space-y-2">
                          <div className="grid md:grid-cols-2 gap-2">
                            {it.intake.fullName && (
                              <div><span className="text-white/60">Name:</span> <span className="text-white">{it.intake.fullName}</span></div>
                            )}
                            {it.intake.age && (
                              <div><span className="text-white/60">Age:</span> <span className="text-white">{it.intake.age}</span></div>
                            )}
                            {it.intake.gender && (
                              <div><span className="text-white/60">Gender:</span> <span className="text-white">{it.intake.gender}</span></div>
                            )}
                            {it.intake.livingArea && (
                              <div><span className="text-white/60">Living Area:</span> <span className="text-white">{it.intake.livingArea}</span></div>
                            )}
                            {it.intake.bloodType && (
                              <div><span className="text-white/60">Blood Type:</span> <span className="text-white">{it.intake.bloodType}</span></div>
                            )}
                            {it.intake.phone && (
                              <div><span className="text-white/60">Phone:</span> <span className="text-white">{it.intake.phone}</span></div>
                            )}
                            {it.intake.painLocation && (
                              <div className="md:col-span-2"><span className="text-white/60">Pain Location:</span> <span className="text-white">{it.intake.painLocation}</span></div>
                            )}
                            {it.intake.painDuration && (
                              <div><span className="text-white/60">Pain Duration:</span> <span className="text-white">{it.intake.painDuration}</span></div>
                            )}
                            {it.intake.painSeverity && (
                              <div><span className="text-white/60">Pain Severity:</span> <span className="text-white">{it.intake.painSeverity}</span></div>
                            )}
                            {it.intake.problemType && (
                              <div><span className="text-white/60">Problem Type:</span> <span className="text-white">{it.intake.problemType}</span></div>
                            )}
                          </div>
                          {it.intake.painDescription && (
                            <div className="mt-2 pt-2 border-t border-white/10">
                              <div className="text-white/60 mb-1">Pain Description:</div>
                              <div className="text-white whitespace-pre-wrap">{it.intake.painDescription}</div>
                            </div>
                          )}
                          {it.intake.otherNotes && (
                            <div className="mt-2 pt-2 border-t border-white/10">
                              <div className="text-white/60 mb-1">Additional Notes:</div>
                              <div className="text-white whitespace-pre-wrap">{it.intake.otherNotes}</div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      onClick={() => respond(it.id, "accept")}
                      className="px-3 py-2 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white transition shadow-sm"
                    >
                      Accept
                    </button>
                    <button
                      onClick={() => respond(it.id, "reject")}
                      className="px-3 py-2 rounded-2xl border border-white/20 hover:bg-white/10 transition"
                    >
                      Reject
                    </button>

                    {/* Send Therapy Session button - navigates to session detail */}
                    {it.sessionId && (
                      <button
                        onClick={() => navigate(`/doctor/session/${it.sessionId}`)}
                        className="px-3 py-2 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white transition shadow-sm font-semibold"
                      >
                        Send Therapy Session
                      </button>
                    )}

                    {/* Optional quick connect (useful right after accepting) */}
                    {u.id && (
                      <CallButton partnerId={u.id} label="Connect now" variant="outline" />
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </AnimatePresence>
      </div>

      {/* Notifications Section */}
      <div className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur p-4 text-white shadow-xl">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">Notifications</h2>
          <button
            onClick={loadNotifications}
            className="px-3 py-2 rounded-2xl border border-white/20 bg-white/10 text-white hover:bg-white/20 transition"
          >
            Refresh
          </button>
        </div>

        {notifErr && (
          <div className="mb-3 text-sm text-rose-300">{notifErr}</div>
        )}

        {notifLoading && (
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="rounded-2xl border border-white/10 bg-slate-900/40 animate-pulse h-20" />
            ))}
          </div>
        )}

        {!notifLoading && notifications.length === 0 && !notifErr && (
          <div className="p-6 text-slate-300 text-center">
            No notifications yet.
          </div>
        )}

        <div className="space-y-3">
          {notifications.map((notif) => (
            <div
              key={notif._id}
              className="rounded-2xl border border-white/10 bg-white/5 p-4 flex flex-col gap-2"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="text-sm font-semibold text-white">
                    {notif.message}
                  </div>
                  <div className="text-xs text-white/60">
                    {notif.type?.replace(/_/g, " ")}
                  </div>
                </div>
                {notif.createdAt && (
                  <div className="text-[11px] text-white/60">
                    {new Date(notif.createdAt).toLocaleString()}
                  </div>
                )}
              </div>

              {notif.meta?.sessionId && (
                <button
                  onClick={() => navigate(`/doctor/session/${notif.meta.sessionId}`)}
                  className="self-start px-3 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-xs hover:from-blue-500 hover:to-indigo-500"
                >
                  View Session
                </button>
              )}

              {!notif.meta?.sessionId && notif.meta?.connectionId && (
                <button
                  onClick={() => navigate("/doctor/alerts")}
                  className="self-start px-3 py-2 rounded-xl border border-white/20 text-xs text-white hover:bg-white/10"
                >
                  View Request
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
