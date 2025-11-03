// server/routes/therapy.js
const express = require("express");
const axios = require("axios");
const router = express.Router();

const Connection = require("../models/Connection");
const Photo = require("../models/Photo");
const { verifyToken } = require("../middleware/auth");

// === ESP32 CONFIG ===
// If you use the ESP32 AP (offline mode) set to "http://192.168.4.1"
// If you use it on your LAN, set e.g. "http://192.168.1.77"
const ESP32_BASE_URL = process.env.ESP32_BASE_URL || "http://192.168.4.1";
const ESP32_TOKEN    = process.env.ESP32_TOKEN || "";
function withToken(url) {
  return ESP32_TOKEN
    ? `${url}${url.includes("?") ? "&" : "?"}t=${encodeURIComponent(ESP32_TOKEN)}`
    : url;
}

/* ----------------------------------------------------------------------------
 * ALIGN PHOTO (unchanged)
 * ----------------------------------------------------------------------------
 */
router.post("/align/:photoId/mark", verifyToken, async (req, res) => {
  try {
    const { aligned } = req.body;
    const { photoId } = req.params;
    if (typeof aligned !== "boolean") {
      return res.status(400).json({ message: "aligned (boolean) is required" });
    }
    const updated = await Photo.findByIdAndUpdate(
      photoId,
      { aligned: !!aligned },
      { new: true }
    );
    if (!updated) return res.status(404).json({ message: "Photo not found" });
    res.json({ aligned: !!updated.aligned, photoId: String(updated._id) });
  } catch (e) {
    console.error("align mark error:", e);
    res.status(500).json({ message: "Server error" });
  }
});

/* ----------------------------------------------------------------------------
 * LEGACY START/STOP (kept for compatibility; logs only)
 * ----------------------------------------------------------------------------
 */
router.post("/start", verifyToken, async (req, res) => {
  try {
    const { photoId, durationMinutes = 10, channel = 1 } = req.body;
    const photo = await Photo.findById(photoId);
    if (!photo) return res.status(404).json({ message: "Photo not found" });
    if (!photo.aligned) return res.status(400).json({ message: "Not aligned" });

    console.log(
      `▶️ Legacy start: channel=${channel}, duration=${durationMinutes}min, photo=${photoId}, user=${req.user.userId}`
    );
    res.json({ message: "Therapy started", durationMinutes, channel, photoId });
  } catch (e) {
    console.error("therapy start error:", e);
    res.status(500).json({ message: "Server error" });
  }
});

router.post("/stop", verifyToken, async (req, res) => {
  try {
    const { channel = 1 } = req.body;
    console.log(`⏹️ Legacy stop: channel=${channel}, user=${req.user.userId}`);
    res.json({ message: "Therapy stopped", channel });
  } catch (e) {
    console.error("therapy stop error:", e);
    res.status(500).json({ message: "Server error" });
  }
});

/* ----------------------------------------------------------------------------
 * NEW MOTOR CONTROL (User self OR Doctor for connected patient)
 * ----------------------------------------------------------------------------
 * START motor (M1..M4) for durationSec.
 * BODY: { userId?, motor:1|2|3|4, durationSec:number }
 */
router.post("/start-motor", verifyToken, async (req, res) => {
  try {
    const { motor, durationSec = 60 } = req.body;
    let   { userId } = req.body;

    const m = Number(motor);
    if (![1, 2, 3, 4].includes(m)) {
      return res.status(400).json({ message: "Valid motor (1..4) required" });
    }
    const duration = Math.max(1, Number(durationSec) || 1);

    const me   = req.user.userId;
    const role = req.user.role;

    if (role === "doctor") {
      if (!userId) return res.status(400).json({ message: "userId required for doctor" });
      const conn = await Connection.findOne({
        doctorId: me, userId, status: "accepted",
      }).lean();
      if (!conn) return res.status(403).json({ message: "Not connected to this patient" });
    } else if (role === "user") {
      // user can control only self
      userId = me;
    } else {
      return res.status(403).json({ message: "Forbidden" });
    }

    // Proxy to ESP32 (short timeout; catch below)
    await axios.post(withToken(`${ESP32_BASE_URL}/motor/start?m=${m}&sec=${duration}`), null, { timeout: 3000 });
    console.log(`🔧 Start Motor M${m} for user ${userId} for ${duration}s (by ${role} ${me})`);

    res.json({ message: `Motor M${m} started for ${duration}s`, motor: m, durationSec: duration });
  } catch (e) {
    console.error("start-motor error:", e.message || e);
    // 502 indicates the downstream (ESP32) failed/unreachable
    res.status(502).json({ message: "ESP32 error", detail: e.message });
  }
});

/**
 * STOP one motor
 * BODY: { userId?, motor:1|2|3|4 }
 */
router.post("/stop-motor", verifyToken, async (req, res) => {
  try {
    const { motor } = req.body;
    let   { userId } = req.body;

    const m = Number(motor);
    if (![1, 2, 3, 4].includes(m)) {
      return res.status(400).json({ message: "Valid motor (1..4) required" });
    }

    const me   = req.user.userId;
    const role = req.user.role;

    if (role === "doctor") {
      if (!userId) return res.status(400).json({ message: "userId required for doctor" });
      const conn = await Connection.findOne({
        doctorId: me, userId, status: "accepted",
      }).lean();
      if (!conn) return res.status(403).json({ message: "Not connected to this patient" });
    } else if (role === "user") {
      userId = me;
    } else {
      return res.status(403).json({ message: "Forbidden" });
    }

    await axios.post(withToken(`${ESP32_BASE_URL}/motor/stop?m=${m}`), null, { timeout: 3000 });
    console.log(`⏹️ Stop Motor M${m} for user ${userId} (by ${role} ${me})`);

    res.json({ message: `Motor M${m} stopped`, motor: m });
  } catch (e) {
    console.error("stop-motor error:", e.message || e);
    res.status(502).json({ message: "ESP32 error", detail: e.message });
  }
});

/**
 * STOP ALL motors
 * BODY: { userId? }
 */
router.post("/stop-all", verifyToken, async (req, res) => {
  try {
    let { userId } = req.body;

    const me   = req.user.userId;
    const role = req.user.role;

    if (role === "doctor") {
      if (!userId) return res.status(400).json({ message: "userId required for doctor" });
      const conn = await Connection.findOne({
        doctorId: me, userId, status: "accepted",
      }).lean();
      if (!conn) return res.status(403).json({ message: "Not connected to this patient" });
    } else if (role === "user") {
      userId = me;
    } else {
      return res.status(403).json({ message: "Forbidden" });
    }

    await axios.post(withToken(`${ESP32_BASE_URL}/motor/stop-all`), null, { timeout: 3000 });
    console.log(`🛑 Stop ALL motors for user ${userId} (by ${role} ${me})`);

    res.json({ message: "All motors stopped" });
  } catch (e) {
    console.error("stop-all error:", e.message || e);
    res.status(502).json({ message: "ESP32 error", detail: e.message });
  }
});

/**
 * STATUS passthrough (used by UI polling)
 * Always returns JSON and never crashes the page:
 *  - If ESP32 unreachable → { ok:false, offline:true, error:"..." }
 *  - If no device configured → returns a harmless mock
 */
router.get("/status", verifyToken, async (_req, res) => {
  try {
    if (!ESP32_BASE_URL) {
      return res.json({
        ok: true,
        motors: [
          { id:1, on:false, remainingSec:0 },
          { id:2, on:false, remainingSec:0 },
          { id:3, on:false, remainingSec:0 },
          { id:4, on:false, remainingSec:0 },
        ],
        mock: true
      });
    }
    const { data } = await axios.get(withToken(`${ESP32_BASE_URL}/status`), { timeout: 1000 });
    res.json(data);
  } catch (e) {
    res.status(200).json({ ok:false, offline:true, error: e.message || "ESP32 unreachable" });
  }
});

module.exports = router;
