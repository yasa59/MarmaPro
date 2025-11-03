// server/routes/call.js
const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const { verifyToken } = require("../middleware/auth");

const User = require("../models/user");
const Connection = require("../models/Connection");

let Room;
try { Room = require("../models/Room"); } catch { Room = null; }

// Health: http://localhost:5000/api/call/health
router.get("/health", (_req, res) => {
  res.json({ ok: true });
});

/**
 * POST /api/call/room
 * body: { partnerId }
 */
router.post("/room", verifyToken, async (req, res) => {
  try {
    const me = String(req.user.userId || req.user.id);
    const { partnerId } = req.body || {};
    if (!partnerId) return res.status(400).json({ message: "partner_required" });
    if (!me) return res.status(401).json({ message: "unauthorized" });
    if (partnerId === me) return res.status(400).json({ message: "cannot_call_self" });

    const partner = await User.findById(partnerId).lean();
    if (!partner) return res.status(404).json({ message: "partner_not_found" });

    // Match both legacy and new connection shapes, both directions
    const id = (v) => new mongoose.Types.ObjectId(String(v));
    const matchConn = {
      $or: [
        { userId: id(me),        doctorId: id(partnerId) },
        { userId: id(partnerId), doctorId: id(me)        },
        { user:   id(me),        doctor:   id(partnerId) },
        { user:   id(partnerId), doctor:   id(me)        },
      ],
    };

    const conn = await Connection.findOne(matchConn).lean();
    if (!conn) return res.status(403).json({ message: "not_connected" });

    const status = String(conn.status || "").toLowerCase();
    const approved = status === "accepted" || status === "approved";
    if (!approved) return res.status(403).json({ message: "not_approved" });

    // Ensure/find a room
    let roomId;
    if (Room) {
      let room = await Room.findOne({ participants: { $all: [me, String(partner._id)] } });
      if (!room) room = await Room.create({ participants: [me, String(partner._id)] });
      roomId = String(room._id);
    } else {
      roomId = `pair:${[me, String(partner._id)].sort().join(":")}`;
    }

    // Ring partner via Socket.IO personal room (their userId)
    try {
      const io = req.app.get("io");
      if (io) {
        io.of("/call").to(String(partner._id)).emit("incoming-call", {
          roomId,
          from: { id: me, name: req.user.name, role: req.user.role },
          at: Date.now(),
        });
      }
    } catch (e) {
      console.log("incoming-call emit error:", e.message);
    }

    res.json({ roomId });
  } catch (e) {
    console.error("POST /api/call/room error", e);
    res.status(500).json({ message: "server_error" });
  }
});

module.exports = router;
