// server/routes/auth.js
require('dotenv').config();
const express = require('express');
const router = express.Router();
const multer = require('multer');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const path = require('path');
const fs = require('fs');

const User = require('../models/user');
const { verifyToken, requireAdmin } = require('../middleware/auth');
const { sendOtp, sendMail } = require('../utils/mailer');

/* Debug: log every /api/auth request */
router.use((req, _res, next) => {
  console.log(`[auth] ${req.method} ${req.originalUrl}`);
  next();
});

/* uploads */
const UPLOAD_DIR = path.join(__dirname, '..', 'uploads', 'doctors');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => cb(null, Date.now() + '-' + file.originalname),
});
const upload = multer({ storage });

router.get('/health', (_req, res) => res.json({ ok: true }));

/* SIGNUP */
router.post(
  '/signup',
  upload.fields([{ name: 'profilePhoto' }, { name: 'document' }]),
  async (req, res) => {
    try {
      const {
        name, email, password,
        role = 'user',
        gender,                          // NEW
        age,                             // NEW
        specialization, qualifications,  // doctor optional
        bio
      } = req.body;

      if (!name || !email || !password) {
        return res.status(400).json({ message: 'Name, email, password required' });
      }

      const normalizedEmail = String(email).toLowerCase();
      const exists = await User.findOne({ email: normalizedEmail });
      if (exists) return res.status(400).json({ message: 'Email already registered' });

      const hashed = await bcrypt.hash(password, 10);
      const profilePhoto = req.files?.profilePhoto?.[0]
        ? `/uploads/doctors/${req.files.profilePhoto[0].filename}`
        : null;
      const documentPath = req.files?.document?.[0]
        ? `/uploads/doctors/${req.files.document[0].filename}`
        : null;

      const docFields = role === 'doctor'
        ? {
            specialization: specialization || null,
            qualifications: qualifications || null,
            bio: bio || null,
            documentPath
          }
        : {};

      const user = await User.create({
        name,
        email: normalizedEmail,
        password: hashed,
        role,
        isApproved: role === 'user', // doctors require admin approval
        profilePhoto,
        gender: gender || null,
        age: age ? Number(age) : null,
        ...docFields,
      });

      if (role === 'doctor') {
        const otp = String(Math.floor(100000 + Math.random() * 900000));
        user.otp = otp;
        user.otpExpires = new Date(Date.now() + 10 * 60 * 1000);
        await user.save();

        try {
          const admins = await User.find({ role: 'admin' }).lean();
          const to = admins.length
            ? admins.map(a => a.email).join(',')
            : (process.env.EMAIL_USER || 'imar@local');

          await sendMail(
            to,
            'New Doctor Signup - Approval Needed',
            `
              <div style="font-family:Arial,sans-serif;max-width:560px;margin:auto">
                <h2 style="margin:0 0 8px;color:#111">Doctor Signup Pending</h2>
                <p style="margin:0 0 12px;color:#333">
                  <b>Name:</b> ${user.name}<br/>
                  <b>Email:</b> ${user.email}
                </p>
                <p style="margin:0;color:#555">Please review and approve in the Admin Dashboard.</p>
              </div>
            `
          );
        } catch (e) {
          console.log('⚠️ Could not send admin email (dev ok):', e.message);
        }

        return res.status(201).json({ message: 'Doctor signup submitted. Admin will review and approve.' });
      }

      return res.status(201).json({ message: 'User registered successfully. Please login.' });
    } catch (err) {
      console.error('Signup error:', err);
      return res.status(500).json({ message: 'Signup failed' });
    }
  }
);

/* LOGIN → OTP */
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const normalizedEmail = String(email).toLowerCase();
    const user = await User.findOne({ email: normalizedEmail });
    if (!user) return res.status(400).json({ message: 'Invalid credentials' });

    if (user.role === 'doctor' && !user.isApproved) {
      return res.status(403).json({ message: 'Doctor not approved by admin yet' });
    }

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return res.status(400).json({ message: 'Invalid credentials' });

    const otp = String(Math.floor(100000 + Math.random() * 900000));
    user.otp = otp;
    user.otpExpires = new Date(Date.now() + 10 * 60 * 1000);
    await user.save();

    console.log(`🔐 OTP for ${user.email}: ${otp}`);
    res.json({ message: 'OTP sent to your email (also printed in server console in dev).' });

    setImmediate(async () => {
      try { await sendOtp(user.email, otp); }
      catch (e) { console.log('⚠️ OTP email send failed (dev ok):', e.message); }
    });
  } catch (err) {
    console.error('Login error:', err);
    if (!res.headersSent) return res.status(500).json({ message: 'Server error' });
  }
});

/* VERIFY OTP → JWT */
router.post('/verify-otp', async (req, res) => {
  try {
    const { email, code } = req.body;
    const normalizedEmail = String(email).toLowerCase();
    const user = await User.findOne({ email: normalizedEmail });
    if (!user) return res.status(400).json({ message: 'User not found' });
    if (!user.otp || !user.otpExpires) return res.status(400).json({ message: 'Request an OTP first' });

    if (new Date() > new Date(user.otpExpires)) {
      user.otp = null;
      user.otpExpires = null;
      await user.save();
      return res.status(400).json({ message: 'OTP expired. Please login again.' });
    }
    if (String(code).trim() !== String(user.otp)) {
      return res.status(400).json({ message: 'Invalid OTP' });
    }

    user.otp = null;
    user.otpExpires = null;
    user.lastSignIn = new Date();
    await user.save();

    const token = jwt.sign(
      { userId: user._id, role: user.role, email: user.email, name: user.name },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    return res.json({
      message: 'Logged in',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        isApproved: user.isApproved,
        gender: user.gender || null,
        age: user.age || null,
      },
    });
  } catch (err) {
    console.error('Verify OTP error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
});

/* RESEND OTP */
router.post('/resend-otp', async (req, res) => {
  try {
    const { email } = req.body;
    const normalizedEmail = String(email).toLowerCase();
    const user = await User.findOne({ email: normalizedEmail });
    if (!user) return res.status(400).json({ message: 'User not found' });

    const otp = String(Math.floor(100000 + Math.random() * 900000));
    user.otp = otp;
    user.otpExpires = new Date(Date.now() + 10 * 60 * 1000);
    await user.save();

    console.log(`🔐 (Resend) OTP for ${user.email}: ${otp}`);
    res.json({ message: 'OTP resent' });

    setImmediate(async () => {
      try { await sendOtp(user.email, otp); }
      catch (e) { console.log('⚠️ Resend OTP email failed (dev ok):', e.message); }
    });
  } catch (err) {
    console.error('Resend OTP error:', err);
    if (!res.headersSent) return res.status(500).json({ message: 'Server error' });
  }
});

/* ADMIN */
router.get('/doctors/pending', verifyToken, requireAdmin, async (_req, res) => {
  const doctors = await User.find({ role: 'doctor', isApproved: false })
    .select('_id name email documentPath createdAt');
  res.json(doctors);
});

router.get('/doctors/pending-count', verifyToken, requireAdmin, async (_req, res) => {
  const count = await User.countDocuments({ role: 'doctor', isApproved: false });
  res.json({ count });
});

router.post('/approve-doctor', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { email } = req.body;
    const doctor = await User.findOne({ email: String(email).toLowerCase(), role: 'doctor' });
    if (!doctor) return res.status(404).json({ message: 'Doctor not found' });
    if (doctor.isApproved) return res.status(400).json({ message: 'Already approved' });

    doctor.isApproved = true;
    doctor.otp = null;
    doctor.otpExpires = null;
    await doctor.save();

    try {
      await sendMail(
        doctor.email,
        'Your Doctor Account has been Approved – iMarma Therapy',
        `
          <div style="font-family:Arial,sans-serif;max-width:560px;margin:auto">
            <h2 style="color:#2563eb;margin-bottom:8px">Welcome aboard, ${doctor.name}!</h2>
            <p style="color:#111827">Your iMarma Therapy <b>doctor</b> account is now approved. You can log in and start helping patients.</p>
            <p><a href="http://localhost:5173/login" style="display:inline-block;padding:10px 16px;background:#10b981;color:#083344;text-decoration:none;border-radius:999px;font-weight:700">Log in</a></p>
            <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0">
            <p style="color:#6b7280;font-size:12px">If you didn’t request this, please ignore this email.</p>
          </div>
        `
      );
    } catch (e) {
      console.log('⚠️ Could not send approval email (dev ok):', e.message);
    }

    return res.json({ message: 'Doctor approved and notified' });
  } catch (err) {
    console.error('Approve doctor error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
