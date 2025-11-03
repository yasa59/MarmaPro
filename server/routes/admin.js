// server/routes/admin.js
const express = require('express');
const router = express.Router();

const { verifyToken, requireRole } = require('../middleware/auth');
const User = require('../models/user');
const Photo = require('../models/Photo');
const Connection = require('../models/Connection'); // If you have it
const Room = require('../models/Room');             // If you have chat/room
const Message = require('../models/Message');       // If you have chat

// GET /api/admin/users?role=user|doctor
router.get('/users', verifyToken, requireRole('admin'), async (req, res) => {
  try {
    const role = (req.query.role || '').toLowerCase();
    const q = role ? { role } : {};
    const items = await User.find(q)
      .sort({ createdAt: -1 })
      .select('_id name email role createdAt')
      .lean();
    res.json({ items });
  } catch (e) {
    console.error('admin/users list error', e);
    res.status(500).json({ message: 'Server error' });
  }
});

// DELETE /api/admin/users/:id
// Permanently delete a user and related data
router.delete('/users/:id', verifyToken, requireRole('admin'), async (req, res) => {
  try {
    const id = req.params.id;

    // Remove related data (best-effort)
    const ops = [
      Photo.deleteMany({ userId: id }),
    ];
    if (Connection) ops.push(Connection.deleteMany({ $or: [{ userId: id }, { doctorId: id }] }));
    if (Message)    ops.push(Message.deleteMany({ senderId: id }));
    if (Room)       ops.push(Room.deleteMany({ participants: id }));

    await Promise.all(ops);
    await User.deleteOne({ _id: id });

    res.json({ ok: true, message: 'User deleted' });
  } catch (e) {
    console.error('admin/delete user error', e);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
