const express = require('express');
const router = express.Router();
const Connection = require('../models/Connection');
const Room = require('../models/Room');
const Message = require('../models/Message');
const { verifyToken } = require('../middleware/auth');

// ensure a room exists for a user-doctor pair (accepted connection only)
router.post('/ensure', verifyToken, async (req, res) => {
  const { userId, doctorId } = req.body;
  if (!userId || !doctorId) return res.status(400).json({ message: 'userId & doctorId required' });

  const accepted = await Connection.findOne({ userId, doctorId, status: 'accepted' });
  if (!accepted) return res.status(403).json({ message: 'Not connected' });

  let room = await Room.findOne({ participants: { $all: [userId, doctorId] } });
  if (!room) room = await Room.create({ participants: [userId, doctorId] });

  res.json({ roomId: room._id });
});

// fetch history
router.get('/:roomId/messages', verifyToken, async (req, res) => {
  const room = await Room.findById(req.params.roomId);
  if (!room) return res.status(404).json({ message: 'Room not found' });
  if (!room.participants.map(String).includes(String(req.user.userId))) {
    return res.status(403).json({ message: 'Forbidden' });
  }
  const list = await Message.find({ roomId: room._id }).sort({ createdAt: 1 });
  res.json(list);
});

module.exports = router;
