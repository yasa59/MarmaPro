// server/routes/sessions.js
const express = require('express');
const router = express.Router();
const axios = require('axios');            // npm i axios
const QRCode = require('qrcode');          // npm i qrcode
const mongoose = require('mongoose');

const { verifyToken, requireDoctor, requireUser } = require('../middleware/auth');

const Session = require('../models/Session');
const User = require('../models/user');
const Connection = require('../models/Connection');
const Photo = require('../models/Photo');

const oid = v => new mongoose.Types.ObjectId(String(v));

/* ---------------------------------------------
   Helper: ensure doctor & user are connected (accepted)
---------------------------------------------- */
async function isAcceptedPair(userId, doctorId) {
  const meU = oid(userId);
  const meD = oid(doctorId);
  const conn = await Connection.findOne({
    status: 'accepted',
    $or: [
      { userId: meU, doctorId: meD },
      { user: meU, doctor: meD },
    ],
  }).lean();
  return !!conn;
}

/* ---------------------------------------------
   Helper: enrich with latest foot photo
---------------------------------------------- */
async function attachLatestFootPhoto(sessionDoc) {
  const uid = oid(sessionDoc.userId);
  let latest = null;

  try {
    const A = await Photo.aggregate([
      { $match: { userId: uid } },
      { $sort: { createdAt: -1 } },
      { $limit: 1 },
    ]);
    latest = A[0] || null;
  } catch {}

  if (!latest) {
    try {
      const B = await Photo.aggregate([
        { $match: { user: uid } },
        { $sort: { createdAt: -1 } },
        { $limit: 1 },
      ]);
      latest = B[0] || null;
    } catch {}
  }

  if (latest?.annotated) sessionDoc.feetPhotoUrl = latest.annotated;
  else if (latest?.filepath) sessionDoc.feetPhotoUrl = latest.filepath;
}

/* ---------------------------------------------
   POST /api/sessions/start  (doctor)
   body: { userId }
   - must be an accepted doctor<->user pair
   - reuse most recent draft/active OR create new
---------------------------------------------- */
router.post('/start', verifyToken, requireDoctor, async (req, res) => {
  try {
    const doctorId = req.user.userId;
    const { userId } = req.body || {};
    if (!userId) return res.status(400).json({ message: 'userId required' });

    // ensure accepted connection
    const ok = await isAcceptedPair(userId, doctorId);
    if (!ok) return res.status(403).json({ message: 'not_connected_or_not_approved' });

    // try reuse active/draft
    let row = await Session.findOne({
      userId, doctorId, status: { $in: ['draft', 'active'] }
    }).sort({ createdAt: -1 });

    if (!row) {
      // create fresh with defaults + last foot photo
      row = new Session({
        userId, doctorId, status: 'active',
        marmaPlan: [
          { name: 'Marma 1', durationSec: 60, notes: '' },
          { name: 'Marma 2', durationSec: 60, notes: '' },
          { name: 'Marma 3', durationSec: 60, notes: '' },
          { name: 'Marma 4', durationSec: 60, notes: '' },
        ],
      });
      await attachLatestFootPhoto(row);
      await row.save();
    }

    return res.json({ id: String(row._id) });
  } catch (e) {
    console.error('POST /sessions/start error', e);
    res.status(500).json({ message: 'server_error' });
  }
});

/* ---------------------------------------------
   GET /api/sessions/inbox (doctor)
---------------------------------------------- */
router.get('/inbox', verifyToken, requireDoctor, async (req, res) => {
  try {
    const rows = await Session.find({ doctorId: req.user.userId })
      .sort({ updatedAt: -1 })
      .lean();

    const userIds = rows.map(r => r.userId).filter(Boolean);
    const users = userIds.length
      ? await User.find({ _id: { $in: userIds } })
          .select('_id name email profilePhoto gender age')
          .lean()
      : [];

    const byU = new Map(users.map(u => [String(u._id), u]));
    const items = rows.map(r => ({
      id: String(r._id),
      status: r.status,
      feetPhotoUrl: r.feetPhotoUrl || null,
      connectionState: r.connectionState || { userReady: false, doctorReady: false, connectedAt: null },
      user: (() => {
        const u = byU.get(String(r.userId));
        return u ? {
          id: String(u._id), name: u.name, email: u.email,
          avatar: u.profilePhoto || null, gender: u.gender || null, age: u.age || null,
        } : null;
      })(),
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    }));

    res.json({ items });
  } catch (e) {
    console.error('GET /sessions/inbox', e);
    res.status(500).json({ message: 'server_error' });
  }
});

/* ---------------------------------------------
   GET /api/sessions/mine (user)
---------------------------------------------- */
router.get('/mine', verifyToken, requireUser, async (req, res) => {
  try {
    const rows = await Session.find({ userId: req.user.userId })
      .sort({ updatedAt: -1 })
      .lean();

    const docIds = rows.map(r => r.doctorId).filter(Boolean);
    const docs = docIds.length
      ? await User.find({ _id: { $in: docIds } })
          .select('_id name email profilePhoto specialization')
          .lean()
      : [];
    const byD = new Map(docs.map(d => [String(d._id), d]));

    const items = rows.map(r => ({
      id: String(r._id),
      status: r.status,
      feetPhotoUrl: r.feetPhotoUrl || null,
      connectionState: r.connectionState || { userReady: false, doctorReady: false, connectedAt: null },
      doctor: (() => {
        const d = byD.get(String(r.doctorId));
        return d ? {
          id: String(d._id), name: d.name, email: d.email,
          avatar: d.profilePhoto || null, specialization: d.specialization || null,
        } : null;
      })(),
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    }));

    res.json({ items });
  } catch (e) {
    console.error('GET /sessions/mine', e);
    res.status(500).json({ message: 'server_error' });
  }
});

/* ---------------------------------------------
   GET /api/sessions/:id (doctor or user)
---------------------------------------------- */
router.get('/:id', verifyToken, async (req, res) => {
  try {
    const s = await Session.findById(req.params.id).lean();
    if (!s) return res.status(404).json({ message: 'not_found' });

    const isDoctor = String(s.doctorId) === String(req.user.userId);
    const isUser   = String(s.userId)   === String(req.user.userId);
    if (!isDoctor && !isUser) return res.status(403).json({ message: 'forbidden' });

    // summaries for header
    const [doctor, user] = await Promise.all([
      User.findById(s.doctorId).select('_id name email profilePhoto specialization').lean(),
      User.findById(s.userId).select('_id name email profilePhoto gender age').lean(),
    ]);

    res.json({
      id: String(s._id),
      status: s.status,
      instructions: s.instructions || {},
      marmaPlan: s.marmaPlan || [],
      feetPhotoUrl: s.feetPhotoUrl || null,
      connectionState: s.connectionState || { userReady: false, doctorReady: false, connectedAt: null },
      intake: s.intake || null,
      doctor: doctor ? {
        id: String(doctor._id), name: doctor.name, email: doctor.email,
        avatar: doctor.profilePhoto || null, specialization: doctor.specialization || null,
      } : null,
      user: user ? {
        id: String(user._id), name: user.name, email: user.email,
        avatar: user.profilePhoto || null, gender: user.gender || null, age: user.age || null,
      } : null,
      createdAt: s.createdAt,
      updatedAt: s.updatedAt,
    });
  } catch (e) {
    console.error('GET /sessions/:id error', e);
    res.status(500).json({ message: 'server_error' });
  }
});

/* ---------------------------------------------
   PATCH /api/sessions/:id/instructions (doctor)
   Also accepts marmaPlan in the same request
---------------------------------------------- */
router.patch('/:id/instructions', verifyToken, requireDoctor, async (req, res) => {
  try {
    const s = await Session.findById(req.params.id);
    if (!s) return res.status(404).json({ message: 'not_found' });
    if (String(s.doctorId) !== String(req.user.userId)) return res.status(403).json({ message: 'forbidden' });

    const { text = '', meds = '', doctorPhonePublic = '', marmaPlan } = req.body || {};
    s.instructions = { text, meds, doctorPhonePublic };
    
    // Also update marma plan if provided
    if (Array.isArray(marmaPlan)) {
      s.marmaPlan = marmaPlan.map(p => ({
        name: String(p.name || p.point || 'Marma').trim() || 'Marma',
        durationSec: Math.max(5, Number(p.durationSec || 60)),
        notes: String(p.notes || ''),
      }));
    }
    
    s.status = 'responded';
    await s.save();

    // Notify user via Socket.IO
    try {
      const io = req.app.get('io');
      const userId = String(s.userId);
      
      if (io) {
        io.to(`user:${userId}`).emit('session:instructions', {
          sessionId: String(s._id),
          doctorId: String(s.doctorId),
          doctorName: req.user.name || 'Doctor',
          hasInstructions: !!(text || meds || doctorPhonePublic),
          hasMarmaPlan: Array.isArray(marmaPlan) && marmaPlan.length > 0,
        });
        console.log(`📡 Emitted session:instructions to user:${userId} for session ${s._id}`);
      }
    } catch (e) {
      console.log('⚠️ Socket.IO notification failed:', e.message);
    }

    // Create notification for user
    try {
      const Notification = require('../models/Notification');
      await Notification.create({
        recipientId: s.userId,
        recipientIdStr: String(s.userId),
        actorId: s.doctorId,
        type: 'instructions_sent',
        message: 'Your doctor has sent you therapy instructions',
        meta: { 
          sessionId: String(s._id),
          doctorId: String(s.doctorId),
          hasInstructions: !!(text || meds || doctorPhonePublic),
          hasMarmaPlan: Array.isArray(marmaPlan) && marmaPlan.length > 0,
        },
      });
      console.log(`📬 Created notification for user ${s.userId} about instructions`);
    } catch (e) {
      console.log('⚠️ Notification creation failed:', e.message);
    }

    res.json({ ok: true, status: s.status });
  } catch (e) {
    console.error('PATCH /sessions/:id/instructions error', e);
    res.status(500).json({ message: 'server_error' });
  }
});

/* ---------------------------------------------
   PATCH /api/sessions/:id/marma (doctor)
   body: { marmaPlan: [{name, durationSec, notes}] }
---------------------------------------------- */
router.patch('/:id/marma', verifyToken, requireDoctor, async (req, res) => {
  try {
    const s = await Session.findById(req.params.id);
    if (!s) return res.status(404).json({ message: 'not_found' });
    if (String(s.doctorId) !== String(req.user.userId)) return res.status(403).json({ message: 'forbidden' });

    const incoming = Array.isArray(req.body?.marmaPlan) ? req.body.marmaPlan : [];
    s.marmaPlan = incoming.map(p => ({
      name: String(p.name || 'Marma').trim() || 'Marma',
      durationSec: Math.max(5, Number(p.durationSec || 60)),
      notes: String(p.notes || ''),
    }));
    s.status = 'responded';
    await s.save();
    res.json({ ok: true });
  } catch (e) {
    console.error('PATCH /sessions/:id/marma error', e);
    res.status(500).json({ message: 'server_error' });
  }
});

/* ---------------------------------------------
   GET /api/sessions/:id/marma-plan (doctor or user)
   (kept for compatibility with older client; returns { marmaPlan })
---------------------------------------------- */
router.get('/:id/marma-plan', verifyToken, async (req, res) => {
  try {
    const s = await Session.findById(req.params.id).lean();
    if (!s) return res.status(404).json({ message: 'not_found' });
    const isDoctor = String(s.doctorId) === String(req.user.userId);
    const isUser   = String(s.userId)   === String(req.user.userId);
    if (!isDoctor && !isUser) return res.status(403).json({ message: 'forbidden' });

    res.json({ marmaPlan: s.marmaPlan || [] });
  } catch (e) {
    console.error('GET /sessions/:id/marma-plan error', e);
    res.status(500).json({ message: 'server_error' });
  }
});

/* ---------------------------------------------
   POST /api/sessions/:id/emergency-qr (doctor)
   Returns { dataUrl, link }
---------------------------------------------- */
router.post('/:id/emergency-qr', verifyToken, requireDoctor, async (req, res) => {
  try {
    const s = await Session.findById(req.params.id);
    if (!s) return res.status(404).json({ message: 'not_found' });
    if (String(s.doctorId) !== String(req.user.userId)) return res.status(403).json({ message: 'forbidden' });

    const phone = s.instructions?.doctorPhonePublic || '';
    if (!phone) return res.status(400).json({ message: 'doctorPhonePublic missing' });

    const link = `https://wa.me/${encodeURIComponent(phone)}?text=${encodeURIComponent('Emergency for session ' + String(s._id))}`;
    const dataUrl = await QRCode.toDataURL(link, { margin: 1, width: 280 });

    res.json({ link, dataUrl });
  } catch (e) {
    console.error('POST /sessions/:id/emergency-qr error', e);
    res.status(500).json({ message: 'server_error' });
  }
});

/* ---------------------------------------------
   PATCH /api/sessions/:id/accept (doctor)
   Accept a pending therapy session
---------------------------------------------- */
router.patch('/:id/accept', verifyToken, requireDoctor, async (req, res) => {
  try {
    const s = await Session.findById(req.params.id);
    if (!s) return res.status(404).json({ message: 'not_found' });
    if (String(s.doctorId) !== String(req.user.userId)) return res.status(403).json({ message: 'forbidden' });
    if (s.status !== 'pending') return res.status(400).json({ message: 'session_not_pending' });

    s.status = 'accepted';
    await s.save();

    // Notify user
    try {
      const Notification = require('../models/Notification');
      await Notification.create({
        recipientId: s.userId,
        recipientIdStr: String(s.userId),
        actorId: s.doctorId,
        type: 'connect_accepted',
        message: 'Your doctor accepted the therapy session',
        meta: { sessionId: String(s._id), doctorId: String(s.doctorId) },
      });
    } catch (e) {
      console.log('⚠️ Notification failed:', e.message);
    }

    res.json({ ok: true, status: s.status });
  } catch (e) {
    console.error('PATCH /sessions/:id/accept error', e);
    res.status(500).json({ message: 'server_error' });
  }
});

/* ---------------------------------------------
   POST /api/sessions/:id/connect (user or doctor)
   body: {}
   - Toggles connection readiness and notifies the other party via Socket.IO
---------------------------------------------- */
router.post('/:id/connect', verifyToken, async (req, res) => {
  try {
    const s = await Session.findById(req.params.id);
    if (!s) return res.status(404).json({ message: 'not_found' });

    const me = req.user.userId;
    const isDoctor = String(s.doctorId) === String(me);
    const isUser = String(s.userId) === String(me);
    if (!isDoctor && !isUser) return res.status(403).json({ message: 'forbidden' });

    // Session must be accepted before connect button is available
    if (s.status !== 'accepted' && s.status !== 'intake_submitted' && s.status !== 'responded') {
      return res.status(400).json({ message: 'session_not_accepted' });
    }

    // Toggle readiness
    if (isUser) {
      s.connectionState.userReady = !s.connectionState.userReady;
    } else {
      s.connectionState.doctorReady = !s.connectionState.doctorReady;
    }

    // If both are ready, mark as connected
    if (s.connectionState.userReady && s.connectionState.doctorReady) {
      if (!s.connectionState.connectedAt) {
        s.connectionState.connectedAt = new Date();
      }
    } else {
      s.connectionState.connectedAt = null;
    }

    await s.save();

    // Notify the other party via Socket.IO
    try {
      const io = req.app.get('io'); // Socket.IO instance from server.js
      const otherUserId = isUser ? String(s.doctorId) : String(s.userId);
      const actorName = req.user.name || (isUser ? 'Patient' : 'Doctor');

      if (io) {
        io.to(`user:${otherUserId}`).emit('session:connect', {
          sessionId: String(s._id),
          actorId: String(me),
          actorName,
          userReady: s.connectionState.userReady,
          doctorReady: s.connectionState.doctorReady,
          connected: !!(s.connectionState.userReady && s.connectionState.doctorReady),
        });
        console.log(`📡 Emitted session:connect to user:${otherUserId} for session ${s._id}`, {
          userReady: s.connectionState.userReady,
          doctorReady: s.connectionState.doctorReady,
          connected: !!(s.connectionState.userReady && s.connectionState.doctorReady),
        });
      } else {
        console.log('⚠️ Socket.IO instance not available in routes');
      }
    } catch (e) {
      console.log('⚠️ Socket.IO notification failed:', e.message);
    }

    // Also create a notification
    try {
      const Notification = require('../models/Notification');
      const otherUserId = isUser ? s.doctorId : s.userId;
      await Notification.create({
        recipientId: otherUserId,
        recipientIdStr: String(otherUserId),
        actorId: typeof me === 'string' ? oid(me) : me,
        type: isUser ? 'user_connect' : 'doctor_connect',
        message: isUser 
          ? 'Patient is ready to connect' 
          : 'Doctor is ready to connect',
        meta: { sessionId: String(s._id), userReady: s.connectionState.userReady, doctorReady: s.connectionState.doctorReady },
      });
    } catch (e) {
      console.log('⚠️ Notification creation failed:', e.message);
    }

    res.json({ 
      ok: true, 
      connectionState: s.connectionState,
      message: isUser 
        ? (s.connectionState.userReady ? 'You are ready. Waiting for doctor...' : 'Connection cancelled')
        : (s.connectionState.doctorReady ? 'You are ready. Waiting for patient...' : 'Connection cancelled')
    });
  } catch (e) {
    console.error('POST /sessions/:id/connect error', e);
    res.status(500).json({ message: 'server_error' });
  }
});

/* ---------------------------------------------
   PATCH /api/sessions/:id/intake (user)
   Submit intake form
---------------------------------------------- */
router.patch('/:id/intake', verifyToken, requireUser, async (req, res) => {
  try {
    const s = await Session.findById(req.params.id);
    if (!s) return res.status(404).json({ message: 'not_found' });
    if (String(s.userId) !== String(req.user.userId)) return res.status(403).json({ message: 'forbidden' });
    if (s.status !== 'accepted') return res.status(400).json({ message: 'session_not_accepted' });

    const { fullName, age, gender, painArea, problemType, phone, otherNotes } = req.body || {};
    s.intake = {
      fullName: fullName || '',
      age: age ? Number(age) : null,
      gender: gender || '',
      painArea: painArea || '',
      problemType: problemType || '',
      phone: phone || '',
      otherNotes: otherNotes || '',
    };
    s.status = 'intake_submitted';
    await s.save();

    res.json({ ok: true, status: s.status });
  } catch (e) {
    console.error('PATCH /sessions/:id/intake error', e);
    res.status(500).json({ message: 'server_error' });
  }
});

/* ---------------------------------------------
   POST /api/sessions/:id/control (user)
   body: { pointIndex, action: 'start'|'stop' }
   - forwards to IoT box if IOT_BASE_URL is set
---------------------------------------------- */
router.post('/:id/control', verifyToken, requireUser, async (req, res) => {
  try {
    const id = req.params.id;
    const me = req.user.userId;
    const { pointIndex, action } = req.body || {};
    if (!['start','stop'].includes(action)) return res.status(400).json({ message: 'invalid_action' });

    const row = await Session.findOne({ _id: id, userId: me }).lean();
    if (!row) return res.status(404).json({ message: 'not_found' });

    const idx = Number(pointIndex);
    if (!row.marmaPlan || !row.marmaPlan[idx]) return res.status(400).json({ message: 'invalid_point' });

    // optional IoT forward
    const base = process.env.IOT_BASE_URL; // e.g. http://192.168.1.50:5001
    if (base) {
      try {
        await axios.post(`${base}/motor`, { pointIndex: idx, action });
      } catch (e) {
        console.log('IoT forward failed:', e.message);
      }
    }

    res.json({ ok: true });
  } catch (e) {
    console.error('POST /sessions/:id/control error', e);
    res.status(500).json({ message: 'server_error' });
  }
});

module.exports = router;
