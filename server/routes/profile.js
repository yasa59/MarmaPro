// server/routes/profile.js
const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');

const { verifyToken } = require('../middleware/auth');
const User = require('../models/user');           // core account fields (name/email/role/etc.)
const Profile = require('../models/Profile');     // optional extra fields (title/fullName/phone/avatar)

const router = express.Router();

// Ensure uploads/avatars exists
const AVATAR_DIR = path.join(__dirname, '..', 'uploads', 'avatars');
fs.mkdirSync(AVATAR_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, AVATAR_DIR),
  filename: (_req, file, cb) => cb(null, Date.now() + '-' + file.originalname),
});
const upload = multer({ storage });

/**
 * GET /api/profile/me
 * Returns core account fields from User + overlays with Profile (if it exists).
 */
router.get('/me', verifyToken, async (req, res) => {
  try {
    const u = await User.findById(req.user.userId)
      .select('_id name email role isApproved profilePhoto gender age specialization qualifications bio')
      .lean();

    if (!u) return res.status(404).json({ message: 'not_found' });

    // Overlay with Profile (title, fullName, phone, avatar, optional gender override, etc.)
    const p = await Profile.findOne({ userId: req.user.userId }).lean();

    const merged = {
      id: String(u._id),
      name: u.name,
      email: u.email,
      role: u.role,
      isApproved: u.isApproved,

      // avatar/photo
      profilePhoto: u.profilePhoto || null,
      avatar: p?.avatar || null,

      // shared/basic fields
      gender: (p?.gender ?? u.gender) ?? null,
      age: u.age ?? null,

      // doctor extras
      specialization: u.specialization ?? null,
      qualifications: u.qualifications ?? null,
      bio: u.bio ?? null,

      // profile extras
      title: p?.title ?? null,
      fullName: p?.fullName ?? null,
      phone: p?.phone ?? null,
    };

    res.json(merged);
  } catch (e) {
    console.error('GET /profile/me error', e);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * PUT /api/profile/me
 * body: { title, fullName, phone, gender }
 * (Stores these extras in Profile; does not overwrite User unless you later choose to.)
 */
router.put('/me', verifyToken, async (req, res) => {
  try {
    const { title = '', fullName = '', phone = '', gender = '' } = req.body || {};
    const doc = await Profile.findOneAndUpdate(
      { userId: req.user.userId },
      { $set: { title, fullName, phone, gender } },
      { upsert: true, new: true }
    ).lean();
    res.json({ ok: true, profile: doc });
  } catch (e) {
    console.error('PUT /profile/me error', e);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * POST /api/profile/avatar
 * form-data: avatar (file)
 * Saves avatar path into Profile.avatar (does not change User.profilePhoto).
 */
router.post('/avatar', verifyToken, upload.single('avatar'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No file' });
    const publicPath = '/uploads/avatars/' + path.basename(req.file.path);

    const doc = await Profile.findOneAndUpdate(
      { userId: req.user.userId },
      { $set: { avatar: publicPath } },
      { upsert: true, new: true }
    ).lean();

    res.json({ ok: true, avatar: publicPath, profile: doc });
  } catch (e) {
    console.error('POST /profile/avatar error', e);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * OPTIONAL: GET /api/profile/by-user/:userId (for doctor/patient views)
 * Returns only the Profile document (extras). Use /api/profile/me for merged view for self.
 */
router.get('/by-user/:userId', verifyToken, async (req, res) => {
  try {
    const p = await Profile.findOne({ userId: req.params.userId }).lean();
    res.json(p || {});
  } catch (e) {
    console.error('GET /profile/by-user/:userId error', e);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
