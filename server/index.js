// server/index.js
require("dotenv").config();
const path = require("path");
const fs = require("fs");
const express = require("express");
const http = require("http");
const cors = require("cors");

const app = express();
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || "http://localhost:5173";


app.use("/api/notifications", require("./routes/notifications"));


app.use(cors({ origin: CLIENT_ORIGIN, credentials: true }));
app.use(express.json());
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// ---- MOUNT ROUTES (all before 404) ----
app.use("/api/auth", require("./routes/auth"));
app.use("/api/call", require("./routes/call"));                 // <-- call router
app.use("/api/ice", require("./routes/ice"));
app.use("/api/profile", require("./routes/profile"));
app.use("/api/notifications", require("./routes/notifications"));
app.use("/api/sessions", require("./routes/sessions"));



// OPTIONAL: inline fallback health for /api/call/health.
// If your router’s /health ever fails, this still answers so you can debug mount order.
// You can remove this once you see {"ok":true}.
app.get("/api/call/health", (_req, res) => {
  res.json({ ok: true, source: "index_fallback" });
});

// Doctors router (plural preferred; fallback to singular)
function loadDoctorsRouter() {
  const plural   = path.join(__dirname, "routes", "doctors.js");
  const singular = path.join(__dirname, "routes", "doctor.js");
  const target = fs.existsSync(plural) ? plural : (fs.existsSync(singular) ? singular : null);
  if (!target) throw new Error("Neither routes/doctors.js nor routes/doctor.js found.");
  const router = require(target);
  console.log("Mounted", path.relative(__dirname, target));
  return router;
}
const doctorsRouter = loadDoctorsRouter();
app.use("/api/doctors", doctorsRouter);
app.use("/api/doctor", doctorsRouter);

// Health
app.get("/healthz", (_, res) => res.json({ ok: true }));

app.use("/api/sessions", require("./routes/sessions"));


// 404 handler (AFTER all routes)
app.use((req, res) => {
  console.warn("404 ->", req.method, req.originalUrl);
  res.status(404).json({ message: "not_found", path: req.originalUrl });
});

// ---- Socket.IO ----
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server, { cors: { origin: CLIENT_ORIGIN, credentials: true } });
const { registerCallNamespace } = require("./socket/call");
registerCallNamespace(io);

// Expose io to routes (so /api/call/room can emit)
app.set("io", io);

// ---- Start ----
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server listening on ${PORT}`);
  console.log(`CORS origin: ${CLIENT_ORIGIN}`);
  console.log(`Auth health:  http://localhost:${PORT}/api/auth/health`);
  console.log(`Call health:  http://localhost:${PORT}/api/call/health`);
});
