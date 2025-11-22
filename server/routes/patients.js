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
// GET /api/patients/:userId or /api/patients/:userId/basic
router.get('/:userId/basic', verifyToken, requireDoctor, async (req, res) => {
  const doctorId = req.user.userId;
  const userId = req.params.userId;
  const mongoose = require('mongoose');
  const oid = (v) => new mongoose.Types.ObjectId(String(v));
  const Session = require('../models/Session');

  // Check connection - try both accepted and approved status
  const conn = await Connection.findOne({
    $or: [
      { doctorId: oid(doctorId), userId: oid(userId) },
      { doctor: oid(doctorId), user: oid(userId) },
    ],
    status: { $in: ['accepted', 'approved'] }
  }).lean();
  
  if (!conn) {
    return res.status(403).json({ message: 'Not connected to this patient' });
  }

  const user = await User.findById(userId)
    .select('_id name email profilePhoto gender age phone address')
    .lean();
  if (!user) return res.status(404).json({ message: 'User not found' });

  // Also check Profile model for avatar (if exists)
  const Profile = require('../models/Profile');
  const profile = await Profile.findOne({ userId: oid(userId) }).lean();
  
  // Use Profile.avatar if available, otherwise User.profilePhoto
  const avatarUrl = profile?.avatar || user.profilePhoto || null;

  const photo = await Photo.findOne({ 
    $or: [
      { userId: oid(userId) },
      { user: oid(userId) }
    ]
  }).sort({ createdAt: -1 }).lean();
  
  const assessment = await Assessment.findOne({ userId, doctorId }).lean();

  // Get latest session with intake data
  const latestSession = await Session.findOne({
    doctorId: oid(doctorId),
    userId: oid(userId),
  }).sort({ createdAt: -1 }).lean();

  res.json({
    user: {
      id: String(user._id),
      _id: String(user._id),
      name: user.name,
      email: user.email,
      avatarUrl: avatarUrl,
      profilePhoto: avatarUrl, // Also include for compatibility
      gender: user.gender || null,
      age: user.age || null,
      phone: user.phone || profile?.phone || null,
      address: user.address || null,
    },
    photo: photo ? {
      raw: photo.filepath,
      url: photo.filepath,
      annotated: photo.annotated || null,
      aligned: !!photo.aligned,
      photoId: String(photo._id)
    } : null,
    assessment: assessment || null,
    latestIntake: latestSession?.intake || null,
  });
});

// Alias for /:userId (without /basic) - same handler
router.get('/:userId', verifyToken, requireDoctor, async (req, res) => {
  const doctorId = req.user.userId;
  const userId = req.params.userId;
  const mongoose = require('mongoose');
  const oid = (v) => new mongoose.Types.ObjectId(String(v));
  const Session = require('../models/Session');

  // Check connection - try both accepted and approved status
  const conn = await Connection.findOne({
    $or: [
      { doctorId: oid(doctorId), userId: oid(userId) },
      { doctor: oid(doctorId), user: oid(userId) },
    ],
    status: { $in: ['accepted', 'approved'] }
  }).lean();
  
  if (!conn) {
    return res.status(403).json({ message: 'Not connected to this patient' });
  }

  const user = await User.findById(userId)
    .select('_id name email profilePhoto gender age phone address')
    .lean();
  if (!user) return res.status(404).json({ message: 'User not found' });

  // Also check Profile model for avatar (if exists)
  const Profile = require('../models/Profile');
  const profile = await Profile.findOne({ userId: oid(userId) }).lean();
  
  // Use Profile.avatar if available, otherwise User.profilePhoto
  const avatarUrl = profile?.avatar || user.profilePhoto || null;

  const photo = await Photo.findOne({ 
    $or: [
      { userId: oid(userId) },
      { user: oid(userId) }
    ]
  }).sort({ createdAt: -1 }).lean();
  
  const assessment = await Assessment.findOne({ userId, doctorId }).lean();

  // Get latest session with intake data
  const latestSession = await Session.findOne({
    doctorId: oid(doctorId),
    userId: oid(userId),
  }).sort({ createdAt: -1 }).lean();

  res.json({
    user: {
      id: String(user._id),
      _id: String(user._id),
      name: user.name,
      email: user.email,
      avatarUrl: avatarUrl,
      profilePhoto: avatarUrl, // Also include for compatibility
      gender: user.gender || null,
      age: user.age || null,
      phone: user.phone || profile?.phone || null,
      address: user.address || null,
    },
    photo: photo ? {
      raw: photo.filepath,
      url: photo.filepath,
      annotated: photo.annotated || null,
      aligned: !!photo.aligned,
      photoId: String(photo._id)
    } : null,
    assessment: assessment || null,
    latestIntake: latestSession?.intake || null,
  });
});

module.exports = router;
