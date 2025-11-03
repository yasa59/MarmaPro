// server/routes/patients.js
const express = require('express');
const router = express.Router();

const User = require('../models/user');
const Photo = require('../models/Photo');
const Connection = require('../models/Connection');
const Assessment = require('../models/Assessment');
const { verifyToken, requireDoctor } = require('../middleware/auth');

// List accepted patients for this doctor + latest photo thumb
router.get('/', verifyToken, requireDoctor, async (req, res) => {
  const doctorId = req.user.userId;

  const cons = await Connection.find({ doctorId, status: 'accepted' }).lean();
  const userIds = cons.map(c => c.userId);
  if (userIds.length === 0) return res.json([]);

  const users = await User.find({ _id: { $in: userIds } })
    .select('_id name email')
    .lean();

  // latest photo per patient
  const photosByUser = {};
  const photos = await Photo.aggregate([
    { $match: { userId: { $in: userIds } } },
    { $sort: { createdAt: -1 } },
    { $group: { _id: '$userId', doc: { $first: '$$ROOT' } } }
  ]);
  photos.forEach(p => {
    photosByUser[p._id.toString()] = p.doc;
  });

  const items = users.map(u => {
    const ph = photosByUser[String(u._id)];
    return {
      user: { id: String(u._id), name: u.name, email: u.email },
      photo: ph ? { raw: ph.filepath, annotated: ph.annotated || null, aligned: !!ph.aligned } : null
    };
  });

  res.json(items);
});

// Single patient detail (basic + latest photo + assessment)
router.get('/:userId', verifyToken, requireDoctor, async (req, res) => {
  const doctorId = req.user.userId;
  const userId = req.params.userId;

  // must be connected
  const conn = await Connection.findOne({ doctorId, userId, status: 'accepted' }).lean();
  if (!conn) return res.status(403).json({ message: 'Not connected to this patient' });

  const user = await User.findById(userId).select('_id name email').lean();
  if (!user) return res.status(404).json({ message: 'User not found' });

  const photo = await Photo.findOne({ userId }).sort({ createdAt: -1 }).lean();
  const assessment = await Assessment.findOne({ userId, doctorId }).lean();

  res.json({
    user: { id: String(user._id), name: user.name, email: user.email },
    photo: photo ? {
      raw: photo.filepath,
      annotated: photo.annotated || null,
      aligned: !!photo.aligned,
      photoId: String(photo._id)
    } : null,
    assessment: assessment || null
  });
});

module.exports = router;
