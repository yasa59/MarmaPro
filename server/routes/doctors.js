// server/routes/doctors.js
const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');

const User = require('../models/user');
const Photo = require('../models/Photo');
const Connection = require('../models/Connection');
const Notification = require('../models/Notification');
const Room = require('../models/Room');
const Session = require('../models/Session');
const { verifyToken, requireDoctor, requireUser } = require('../middleware/auth');

/* ---------------------------------------------
   Helper Functions
---------------------------------------------- */
const oid = (v) => new mongoose.Types.ObjectId(String(v));

function doctorMatch(userId) {
  const idObj = oid(userId);
  const idStr = String(userId);
  return {
    $or: [
      { doctorId: idObj },
      { doctor: idObj },
      { doctorId: idStr },
      { doctor: idStr },
    ],
  };
}

function userMatch(userId) {
  const idObj = oid(userId);
  const idStr = String(userId);
  return {
    $or: [
      { userId: idObj },
      { user: idObj },
      { userId: idStr },
      { user: idStr },
    ],
  };
}

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
  } catch (e) {
    console.log('attachLatestFootPhoto[A] warn:', e.message);
  }

  if (!latest) {
    try {
      const B = await Photo.aggregate([
        { $match: { user: uid } },
        { $sort: { createdAt: -1 } },
        { $limit: 1 },
      ]);
      latest = B[0] || null;
    } catch (e) {
      console.log('attachLatestFootPhoto[B] warn:', e.message);
    }
  }

  if (latest?.annotated) {
    sessionDoc.feetPhotoUrl = latest.annotated;
  } else if (latest?.filepath) {
    sessionDoc.feetPhotoUrl = latest.filepath;
  }
}

/* ---------------------------------------------
   Helper: create/ensure a pending connection
   - Saves BOTH field shapes
   - Creates/updates a pending Session tied to the request (with optional intake)
---------------------------------------------- */
async function createOrPendConnection({ userId, doctorId, intake }) {
  const doctor = await User.findOne({ _id: doctorId, role: 'doctor', isApproved: true }).select('_id').lean();
  if (!doctor) {
    return { ok: false, status: 404, message: 'Doctor not found/approved' };
  }

  const doctorStr = String(doctor._id || doctorId);
  const doctorObjId = oid(doctorStr);
  const userStr = String(userId);
  const userObjId = oid(userStr);

  const userFieldValues = [userObjId, userStr];
  const doctorFieldValues = [doctorObjId, doctorStr];

  const userFieldQuery = { $in: userFieldValues };
  const doctorFieldQuery = { $in: doctorFieldValues };

  const connectionMatch = {
    $or: [
      { userId: userFieldQuery, doctorId: doctorFieldQuery },
      { userId: userFieldQuery, doctor: doctorFieldQuery },
      { user: userFieldQuery, doctorId: doctorFieldQuery },
      { user: userFieldQuery, doctor: doctorFieldQuery },
    ],
  };

  // Find existing connection (either shape)
  let conn = await Connection.findOne(connectionMatch);

  let sessionId = null;

  if (!conn) {
    // Create new connection
    conn = new Connection({
      userId: userObjId,
      doctorId: doctorObjId,
      user: userObjId,
      doctor: doctorObjId,
      status: 'pending',
      requestedAt: new Date(),
    });
    await conn.save();
    console.log('🧩 Created connection:', {
      _id: String(conn._id),
      userId: String(conn.userId || conn.user),
      doctorId: String(conn.doctorId || conn.doctor),
      status: conn.status,
    });

    // Create pending session
    try {
      let session = await Session.findOne({
        userId: userFieldQuery,
        doctorId: doctorFieldQuery,
        status: 'pending',
      }).sort({ createdAt: -1 });

      if (!session) {
        session = new Session({
          userId: userObjId,
          doctorId: doctorObjId,
          status: 'pending',
          marmaPlan: [
            { name: 'Marma 1', durationSec: 60, notes: '' },
            { name: 'Marma 2', durationSec: 60, notes: '' },
            { name: 'Marma 3', durationSec: 60, notes: '' },
            { name: 'Marma 4', durationSec: 60, notes: '' },
          ],
        });

        if (intake) {
          session.intake = {
            fullName: intake.fullName || '',
            age: intake.age ? Number(intake.age) : null,
            gender: intake.gender || '',
            livingArea: intake.livingArea || '',
            bloodType: intake.bloodType || '',
            painDescription: intake.painDescription || '',
            painLocation: intake.painLocation || '',
            painDuration: intake.painDuration || '',
            painSeverity: intake.painSeverity || '',
            painArea: intake.painArea || intake.painLocation || '',
            problemType: intake.problemType || '',
            phone: intake.phone || '',
            otherNotes: intake.otherNotes || '',
          };
        }

        await attachLatestFootPhoto(session);
        await session.save();
        sessionId = String(session._id);
        console.log('📋 Created session for therapy request:', sessionId);
      } else {
        // Update intake if provided and session exists
        if (intake) {
          session.intake = {
            fullName: intake.fullName || '',
            age: intake.age ? Number(intake.age) : null,
            gender: intake.gender || '',
            livingArea: intake.livingArea || '',
            bloodType: intake.bloodType || '',
            painDescription: intake.painDescription || '',
            painLocation: intake.painLocation || '',
            painDuration: intake.painDuration || '',
            painSeverity: intake.painSeverity || '',
            painArea: intake.painArea || intake.painLocation || '',
            problemType: intake.problemType || '',
            phone: intake.phone || '',
            otherNotes: intake.otherNotes || '',
          };
          await session.save();
        }
        sessionId = String(session._id);
      }
    } catch (e) {
      console.error('⚠️ Session creation failed:', e.message);
    }
  } else if (conn.status === 'rejected') {
    // Re-pend rejected connection
    conn.status = 'pending';
    conn.requestedAt = new Date();
    await conn.save();
    console.log('🧩 Re-pended connection', String(conn._id));

    if (intake) {
      try {
        const session = await Session.findOne({
          userId: userFieldQuery,
          doctorId: doctorFieldQuery,
          status: 'pending',
        }).sort({ createdAt: -1 });
        if (session) {
          session.intake = {
            fullName: intake.fullName || '',
            age: intake.age ? Number(intake.age) : null,
            gender: intake.gender || '',
            livingArea: intake.livingArea || '',
            bloodType: intake.bloodType || '',
            painDescription: intake.painDescription || '',
            painLocation: intake.painLocation || '',
            painDuration: intake.painDuration || '',
            painSeverity: intake.painSeverity || '',
            painArea: intake.painArea || intake.painLocation || '',
            problemType: intake.problemType || '',
            phone: intake.phone || '',
            otherNotes: intake.otherNotes || '',
          };
          await session.save();
          sessionId = String(session._id);
        }
      } catch (e) {
        console.error('⚠️ Session update (re-pend) failed:', e.message);
      }
    }

    if (!sessionId) {
      try {
        const session = await Session.findOne({
          userId: userFieldQuery,
          doctorId: doctorFieldQuery,
          status: 'pending',
        }).sort({ createdAt: -1 });
        if (session) {
          sessionId = String(session._id);
        }
      } catch (e) {
        console.error('⚠️ Failed to get sessionId:', e.message);
      }
    }

    try {
      // Ensure doctorId is a valid ObjectId
      const notif = await Notification.create({
        recipientId: doctorObjId,
        recipientIdStr: doctorStr,
        actorId: userObjId,
        type: 'connect_request',
        message: intake 
          ? 'A patient resubmitted their therapy request with intake information'
          : 'A patient resubmitted their therapy request',
        meta: {
          connectionId: conn._id.toString(),
          userId: userStr,
          sessionId: sessionId || null,
        },
      });
      console.log('📬 Created notification for re-pended request:', {
        notificationId: String(notif._id),
        recipientId: String(notif.recipientId),
        doctorIdProvided: String(doctorId),
      });
    } catch (e) {
      console.error('❌ Notification create failed:', {
        error: e.message,
        stack: e.stack,
        doctorId: String(doctorId),
      });
      // Don't fail the request if notification fails, but log the error
    }
  } else if (conn.status === 'accepted') {
    return { ok: true, message: 'Already connected to this doctor', already: true };
  } else {
    // Connection already exists and is pending - update session with intake if provided
    if (intake) {
      try {
        const session = await Session.findOne({
          userId: userFieldQuery,
          doctorId: doctorFieldQuery,
          status: 'pending',
        }).sort({ createdAt: -1 });

        if (session) {
          session.intake = {
            fullName: intake.fullName || '',
            age: intake.age ? Number(intake.age) : null,
            gender: intake.gender || '',
            livingArea: intake.livingArea || '',
            bloodType: intake.bloodType || '',
            painDescription: intake.painDescription || '',
            painLocation: intake.painLocation || '',
            painDuration: intake.painDuration || '',
            painSeverity: intake.painSeverity || '',
            painArea: intake.painArea || intake.painLocation || '',
            problemType: intake.problemType || '',
            phone: intake.phone || '',
            otherNotes: intake.otherNotes || '',
          };
          await session.save();
          sessionId = String(session._id);
          console.log('📝 Updated existing pending session intake:', sessionId);
        } else {
          // Create session if it doesn't exist
          try {
            const newSession = new Session({
              userId: userObjId,
              doctorId: doctorObjId,
              status: 'pending',
              marmaPlan: [
                { name: 'Marma 1', durationSec: 60, notes: '' },
                { name: 'Marma 2', durationSec: 60, notes: '' },
                { name: 'Marma 3', durationSec: 60, notes: '' },
                { name: 'Marma 4', durationSec: 60, notes: '' },
              ],
              intake: {
                fullName: intake.fullName || '',
                age: intake.age ? Number(intake.age) : null,
                gender: intake.gender || '',
                livingArea: intake.livingArea || '',
                bloodType: intake.bloodType || '',
                painDescription: intake.painDescription || '',
                painLocation: intake.painLocation || '',
                painDuration: intake.painDuration || '',
                painSeverity: intake.painSeverity || '',
                painArea: intake.painArea || intake.painLocation || '',
                problemType: intake.problemType || '',
                phone: intake.phone || '',
                otherNotes: intake.otherNotes || '',
              },
            });
            await attachLatestFootPhoto(newSession);
            await newSession.save();
            sessionId = String(newSession._id);
            console.log('📋 Created new session for existing pending connection:', sessionId);
          } catch (e) {
            console.error('⚠️ Failed to create session for existing connection:', e.message);
          }
        }
      } catch (e) {
        console.error('⚠️ Session update failed:', e.message);
      }
    }

    if (!sessionId) {
      try {
        const session = await Session.findOne({
          userId: userFieldQuery,
          doctorId: doctorFieldQuery,
          status: 'pending',
        }).sort({ createdAt: -1 });
        if (session) {
          sessionId = String(session._id);
        }
      } catch (e) {
        console.error('⚠️ Failed to get sessionId:', e.message);
      }
    }

    // Always create notification for existing pending connections when intake is provided
    let notificationCreated = false;
    try {
      // Ensure doctorId is a valid ObjectId
      const notif = await Notification.create({
        recipientId: doctorObjId,
        recipientIdStr: doctorStr,
        actorId: userObjId,
        type: 'connect_request',
        message: intake 
          ? 'A patient sent a therapy request with intake information'
          : 'A patient sent a therapy request',
        meta: {
          connectionId: conn._id.toString(),
          userId: userStr,
          sessionId: sessionId || null,
        },
      });
      notificationCreated = true;
      console.log('📬 Created notification for existing pending request:', {
        notificationId: String(notif._id),
        recipientId: String(notif.recipientId),
        recipientIdType: typeof notif.recipientId,
        doctorIdProvided: String(doctorId),
        sessionId: sessionId || null,
      });
    } catch (e) {
      console.error('❌ Notification create failed:', {
        error: e.message,
        stack: e.stack,
        doctorId: String(doctorId),
        doctorIdType: typeof doctorId,
      });
      // Don't fail the request if notification fails, but log the error
    }

    return {
      ok: true,
      message: 'Request sent to doctor',
      already: true,
      connectionId: conn._id.toString(),
      sessionId: sessionId || null,
      notificationCreated,
    };
  }

  // Create notification for new connections
  let notificationCreated = false;
  try {
    // Ensure doctorId is a valid ObjectId
    const notif = await Notification.create({
      recipientId: doctorObjId,
      recipientIdStr: doctorStr,
      actorId: userObjId,
      type: 'connect_request',
      message: intake 
        ? 'A patient sent a therapy request with intake information'
        : 'A patient requested to connect with you',
      meta: {
        connectionId: conn._id.toString(),
        userId: userStr,
        sessionId: sessionId || null,
      },
    });
    notificationCreated = true;
    console.log('📬 Created notification for new request:', {
      notificationId: String(notif._id),
      recipientId: String(notif.recipientId),
      recipientIdType: typeof notif.recipientId,
      doctorIdProvided: String(doctorId),
      sessionId: sessionId || null,
    });
  } catch (e) {
    console.error('❌ Notification create failed:', {
      error: e.message,
      stack: e.stack,
      doctorId: String(doctorId),
      doctorIdType: typeof doctorId,
    });
    // Don't fail the request if notification fails, but log the error
  }

  return {
    ok: true,
    message: 'Request sent to doctor',
    connectionId: conn._id.toString(),
    sessionId: sessionId || null,
    notificationCreated,
  };
}

/* ---------------------------------------------
   PUBLIC: simple list of approved doctors
   GET /api/doctors
---------------------------------------------- */
router.get('/', async (_req, res) => {
  try {
    const docs = await User.find({ role: 'doctor', isApproved: true })
      .select('_id name email profilePhoto gender age specialization qualifications bio documentPath')
      .lean();
    res.json(docs);
  } catch (e) {
    console.error('GET /doctors error', e);
    res.status(500).json({ message: 'Server error' });
  }
});

/* ---------------------------------------------
   PUBLIC: searchable, paginated approved doctors
   GET /api/doctors/public?q=&limit=24&page=1
---------------------------------------------- */
router.get('/public', async (req, res) => {
  try {
    const q = (req.query.q || '').trim();
    const limit = Math.min(48, Math.max(1, Number(req.query.limit) || 24));
    const page = Math.max(1, Number(req.query.page) || 1);
    const skip = (page - 1) * limit;

    const filter = { role: 'doctor', isApproved: true };
    if (q) {
      filter.$or = [
        { name: { $regex: q, $options: 'i' } },
        { email: { $regex: q, $options: 'i' } },
        { specialization: { $regex: q, $options: 'i' } },
      ];
    }

    const [items, total] = await Promise.all([
      User.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .select('_id name email profilePhoto gender age specialization qualifications bio documentPath')
        .lean(),
      User.countDocuments(filter),
    ]);

    res.json({ items, total, page, pages: Math.max(1, Math.ceil(total / limit)) });
  } catch (e) {
    console.error('GET /doctors/public error', e);
    res.status(500).json({ message: 'Server error' });
  }
});

/* ---------------------------------------------
   PUBLIC: get a doctor's public profile
   GET /api/doctors/:id/profile
---------------------------------------------- */
router.get('/:id/profile', async (req, res) => {
  try {
    const id = req.params.id;
    const doc = await User.findOne({ _id: id, role: 'doctor', isApproved: true })
      .select('_id name email profilePhoto gender age specialization qualifications bio documentPath createdAt')
      .lean();
    if (!doc) {
      return res.status(404).json({ message: 'Doctor not found/approved' });
    }
    res.json(doc);
  } catch (e) {
    console.error('GET /doctors/:id/profile error', e);
    res.status(500).json({ message: 'Server error' });
  }
});

/* ---------------------------------------------
   USER: Request connect (with optional intake)
   POST /api/doctors/request { doctorId, intake? }
---------------------------------------------- */
router.post('/request', verifyToken, requireUser, async (req, res) => {
  try {
    const userId = req.user.userId;
    const doctorId = req.body.doctorId;
    const intake = req.body.intake || null;
    
    console.log('📥 Received therapy request:', {
      userId: String(userId),
      doctorId: String(doctorId || 'missing'),
      hasIntake: !!intake,
    });
    
    if (!doctorId) {
      console.error('❌ Missing doctorId in request');
      return res.status(400).json({ message: 'doctorId required' });
    }

    // Verify doctor exists and get their actual _id
    const doctor = await User.findOne({ _id: doctorId, role: 'doctor' }).select('_id').lean();
    if (!doctor) {
      console.error('❌ Doctor not found:', String(doctorId));
      return res.status(404).json({ message: 'Doctor not found' });
    }
    
    const actualDoctorId = String(doctor._id);
    console.log('👨‍⚕️ Doctor verified:', {
      requestedDoctorId: String(doctorId),
      actualDoctorId: actualDoctorId,
      match: String(doctorId) === actualDoctorId,
    });

    const result = await createOrPendConnection({ userId, doctorId: actualDoctorId, intake });
    
    if (!result.ok) {
      console.error('❌ createOrPendConnection failed:', result.message);
      return res.status(result.status || 500).json({ message: result.message });
    }

    // Verify notification was created
    if (result.notificationCreated !== false) {
      try {
        const Notification = require('../models/Notification');
        const doctorObjId = oid(actualDoctorId);
        const recentNotif = await Notification.findOne({
          $or: [
            { recipientId: doctorObjId },
            { recipientId: actualDoctorId },
          ],
          type: 'connect_request',
        }).sort({ createdAt: -1 }).lean();
        
        console.log('🔍 Verification - Latest notification for doctor:', {
          doctorId: actualDoctorId,
          notificationId: recentNotif ? String(recentNotif._id) : 'NOT FOUND',
          recipientId: recentNotif ? String(recentNotif.recipientId) : 'N/A',
          createdAt: recentNotif?.createdAt || 'N/A',
        });
      } catch (e) {
        console.error('⚠️ Notification verification failed:', e.message);
      }
    }

    // Emit real-time notification to doctor via Socket.IO
    try {
      const io = req.app.get('io');
      if (io) {
        io.to(`user:${actualDoctorId}`).emit('connect_request', {
          connectionId: result.connectionId,
          sessionId: result.sessionId,
          userId: String(userId),
          hasIntake: !!intake,
        });
        console.log(`📡 Emitted connect_request to doctor:${actualDoctorId}`, {
          connectionId: result.connectionId,
          sessionId: result.sessionId,
        });
      } else {
        console.log('⚠️ Socket.IO instance not available');
      }
    } catch (e) {
      console.error('⚠️ Socket.IO emission failed:', e.message, e.stack);
    }

    console.log('✅ Therapy request processed successfully:', {
      connectionId: result.connectionId,
      sessionId: result.sessionId,
      message: result.message,
      notificationCreated: result.notificationCreated !== false,
      doctorId: actualDoctorId,
    });

    return res.json({
      message: result.message,
      connectionId: result.connectionId,
      sessionId: result.sessionId || null,
    });
  } catch (e) {
    console.error('❌ POST /doctors/request error:', e.message, e.stack);
    res.status(500).json({ message: 'Server error' });
  }
});

/* ---------------------------------------------
   DOCTOR: Pending requests (alerts)
   GET /api/doctors/alerts → { items: [...] }
---------------------------------------------- */
router.get('/alerts', verifyToken, requireDoctor, async (req, res) => {
  try {
    const doctorId = req.user.userId;
    const match = { status: 'pending', ...doctorMatch(doctorId) };

    const pending = await Connection.find(match).sort({ createdAt: -1 }).lean();
    if (!pending.length) {
      return res.json({ items: [] });
    }

    const userIds = pending.map(p => p.userId || p.user).filter(Boolean).map(String);
    const users = userIds.length
      ? await User.find({ _id: { $in: userIds } }).select('_id name email profilePhoto gender age').lean()
      : [];

    // Latest photo per user (works for Photo.userId or Photo.user)
    const ids = userIds.map(oid);
    const latestByUser = new Map();
    try {
      const photos1 = await Photo.aggregate([
        { $match: { userId: { $in: ids } } },
        { $sort: { createdAt: -1 } },
        { $group: { _id: '$userId', doc: { $first: '$$ROOT' } } },
      ]);
      photos1.forEach(p => latestByUser.set(String(p._id), p.doc));
    } catch (e) {
      // Ignore photo aggregation errors
    }

    try {
      const photos2 = await Photo.aggregate([
        { $match: { user: { $in: ids } } },
        { $sort: { createdAt: -1 } },
        { $group: { _id: '$user', doc: { $first: '$$ROOT' } } },
      ]);
      photos2.forEach(p => {
        const k = String(p._id);
        if (!latestByUser.has(k)) {
          latestByUser.set(k, p.doc);
        }
      });
    } catch (e) {
      // Ignore photo aggregation errors
    }

    // Fetch session details (id + intake) per pair
    const sessionDetails = new Map();
    try {
      const pairs = pending.map(p => ({
        userId: p.userId || p.user,
        doctorId: p.doctorId || p.doctor,
      }));
      const sessions = await Session.find({ $or: pairs })
        .select('_id userId doctorId intake status')
        .lean();
      sessions.forEach(s => {
        const key = `${String(s.userId)}_${String(s.doctorId)}`;
        sessionDetails.set(key, {
          id: String(s._id),
          intake: s.intake || null,
          status: s.status,
        });
      });
    } catch (e) {
      console.error('alerts: fetch sessionDetails failed:', e.message);
    }

    const items = pending.map(p => {
      const uid = String(p.userId || p.user || '');
      const did = String(p.doctorId || p.doctor || '');
      const u = users.find(x => String(x._id) === uid);
      const ph = latestByUser.get(uid);
      const s = sessionDetails.get(`${uid}_${did}`) || null;
      return {
        id: String(p._id),
        sessionId: s?.id || null,
        intake: s?.intake || null,
        user: u
          ? {
              id: String(u._id),
              name: u.name,
              email: u.email,
              gender: u.gender,
              age: u.age,
            }
          : null,
        requestedAt: p.requestedAt || p.createdAt,
        photo: ph
          ? {
              raw: ph.filepath,
              annotated: ph.annotated || null,
            }
          : null,
      };
    });

    res.json({ items });
  } catch (e) {
    console.error('GET /doctors/alerts error', e);
    res.status(500).json({ message: 'Server error' });
  }
});

/* ---------------------------------------------
   DOCTOR: Accept / Reject a request
   POST /api/doctors/alerts/respond { connectionId, action }
---------------------------------------------- */
router.post('/alerts/respond', verifyToken, requireDoctor, async (req, res) => {
  try {
    const { connectionId, action } = req.body;
    if (!connectionId || !['accept', 'reject'].includes(action)) {
      return res.status(400).json({ message: 'connectionId and valid action required' });
    }

    const conn = await Connection.findOne({
      _id: connectionId,
      ...doctorMatch(req.user.userId),
    });
    if (!conn) {
      return res.status(404).json({ message: 'Connection not found' });
    }

    const rawUserId = conn.userId || conn.user;
    const rawDoctorId = conn.doctorId || conn.doctor;
    const userStr = String(rawUserId);
    const doctorStr = String(rawDoctorId);
    const userId = typeof rawUserId === 'string' ? oid(rawUserId) : rawUserId;
    const doctorId = typeof rawDoctorId === 'string' ? oid(rawDoctorId) : rawDoctorId;

    if (action === 'accept') {
      conn.status = 'accepted';
      await conn.save();

      // Accept/create a session
      let sessionId = null;
      try {
        let session = await Session.findOne({
          userId,
          doctorId,
          status: 'pending',
        }).sort({ createdAt: -1 });

        if (!session) {
          session = new Session({
            userId,
            doctorId,
            status: 'accepted',
            marmaPlan: [
              { name: 'Marma 1', durationSec: 60, notes: '' },
              { name: 'Marma 2', durationSec: 60, notes: '' },
              { name: 'Marma 3', durationSec: 60, notes: '' },
              { name: 'Marma 4', durationSec: 60, notes: '' },
            ],
          });
          await attachLatestFootPhoto(session);
        } else {
          session.status = 'accepted';
        }
        await session.save();
        sessionId = String(session._id);
        console.log('✅ Accepted session:', sessionId);
      } catch (e) {
        console.error('⚠️ Session accept failed:', e.message);
      }

      // Ensure room exists
      try {
        if (Room) {
          let room = await Room.findOne({
            participants: { $all: [userId, doctorId] },
          });
          if (!room) {
            room = await Room.create({ participants: [userId, doctorId] });
          }
        }
      } catch (e) {
        console.log('room ensure warn:', e.message);
      }

      try {
        await Notification.create({
          recipientId: userId,
          recipientIdStr: userStr,
          actorId: doctorId,
          type: 'connect_accepted',
          message: 'Your doctor accepted the therapy request',
          meta: {
            doctorId: doctorStr,
            sessionId: sessionId || null,
          },
        });
      } catch (e) {
        // Ignore notification errors
      }

      return res.json({ message: 'Accepted', sessionId: sessionId || null });
    }

    // Reject
    conn.status = 'rejected';
    await conn.save();

    try {
      await Notification.create({
        recipientId: userId,
        recipientIdStr: userStr,
        actorId: doctorId,
        type: 'connect_rejected',
        message: 'Your connection request was rejected',
        meta: { doctorId: doctorStr },
      });
    } catch (e) {
      // Ignore notification errors
    }

    return res.json({ message: 'Rejected' });
  } catch (e) {
    console.error('POST /doctors/alerts/respond error', e);
    res.status(500).json({ message: 'server_error' });
  }
});

/* ---------------------------------------------
   DOCTOR DASHBOARD: Patients list
   GET /api/doctors/patients → { patients: [...] }
---------------------------------------------- */
router.get('/patients', verifyToken, requireDoctor, async (req, res) => {
  try {
    const match = { ...doctorMatch(req.user.userId) };
    const conns = await Connection.find(match).sort({ createdAt: -1 }).lean();

    const userIds = conns.map(c => c.userId || c.user).filter(Boolean).map(String);
    const users = userIds.length
      ? await User.find({ _id: { $in: userIds } }).select('_id name email profilePhoto gender age').lean()
      : [];

    const patients = conns.map(c => {
      const uid = String(c.userId || c.user || '');
      const u = users.find(x => String(x._id) === uid);
      return {
        _id: String(c._id),
        status: c.status === 'accepted' ? 'approved' : c.status,
        user: u
          ? {
              _id: String(u._id),
              name: u.name,
              email: u.email,
              avatarUrl: u.profilePhoto || null,
              gender: u.gender || null,
              age: u.age || null,
            }
          : null,
        lastPhotoAt: null,
        latestPhotoThumb: null,
      };
    });

    if (patients.length) {
      const ids = userIds.map(oid);
      const latestByUser = new Map();

      try {
        const A = await Photo.aggregate([
          { $match: { userId: { $in: ids } } },
          { $sort: { createdAt: -1 } },
          {
            $group: {
              _id: '$userId',
              lastPhotoAt: { $first: '$createdAt' },
              latestFile: { $first: '$filepath' },
              latestAnnotated: { $first: '$annotated' },
            },
          },
        ]);
        A.forEach(r => latestByUser.set(String(r._id), r));
      } catch (e) {
        // Ignore aggregation errors
      }

      try {
        const B = await Photo.aggregate([
          { $match: { user: { $in: ids } } },
          { $sort: { createdAt: -1 } },
          {
            $group: {
              _id: '$user',
              lastPhotoAt: { $first: '$createdAt' },
              latestFile: { $first: '$filepath' },
              latestAnnotated: { $first: '$annotated' },
            },
          },
        ]);
        B.forEach(r => {
          const k = String(r._id);
          if (!latestByUser.has(k)) {
            latestByUser.set(k, r);
          }
        });
      } catch (e) {
        // Ignore aggregation errors
      }

      patients.forEach(p => {
        const key = String(p.user?._id || '');
        const r = latestByUser.get(key);
        if (r) {
          p.lastPhotoAt = r.lastPhotoAt || null;
          p.latestPhotoThumb = r.latestAnnotated || r.latestFile || null;
        }
      });
    }

    res.json({ patients });
  } catch (e) {
    console.error('GET /api/doctors/patients error', e);
    res.status(500).json({ message: 'server_error' });
  }
});

/* ---------------------------------------------
   DOCTOR updates connection status (approved/rejected)
   PATCH /api/doctors/connections/:id { status }
---------------------------------------------- */
router.patch('/connections/:id', verifyToken, requireDoctor, async (req, res) => {
  try {
    const { id } = req.params;
    const inStatus = String(req.body.status || '').toLowerCase();
    const mapIn = {
      approved: 'accepted',
      accept: 'accepted',
      accepted: 'accepted',
      pending: 'pending',
      reject: 'rejected',
      rejected: 'rejected',
    };
    const dbStatus = mapIn[inStatus];
    if (!dbStatus) {
      return res.status(400).json({ message: 'invalid_status' });
    }

    const conn = await Connection.findOneAndUpdate(
      { _id: id, ...doctorMatch(req.user.userId) },
      { $set: { status: dbStatus } },
      { new: true }
    ).lean();

    if (!conn) {
      return res.status(404).json({ message: 'connection_not_found' });
    }

    const outMap = { accepted: 'approved', pending: 'pending', rejected: 'rejected' };
    res.json({ ok: true, status: outMap[conn.status] || conn.status });
  } catch (e) {
    console.error('PATCH /api/doctors/connections/:id error', e);
    res.status(500).json({ message: 'server_error' });
  }
});

/* ---------------------------------------------
   USER: which doctors have accepted me?
   GET /api/doctors/my/accepted
---------------------------------------------- */
router.get('/my/accepted', verifyToken, requireUser, async (req, res) => {
  try {
    const me = String(req.user.userId);

    const accepted = await Connection.find({
      status: { $in: ['accepted', 'approved'] },
      $or: [{ userId: me }, { user: me }],
    })
      .sort({ createdAt: -1 })
      .lean();

    const docIds = accepted.map(c => String(c.doctorId || c.doctor)).filter(Boolean);
    if (!docIds.length) {
      return res.json({ items: [] });
    }

    const docs = await User.find({ _id: { $in: docIds } })
      .select('_id name email profilePhoto gender age specialization qualifications bio documentPath')
      .lean();

    const byId = new Map(docs.map(d => [String(d._id), d]));
    const items = docIds
      .map(id => byId.get(String(id)))
      .filter(Boolean)
      .map(d => ({
        id: String(d._id),
        name: d.name,
        email: d.email,
        avatar: d.profilePhoto || null,
        gender: d.gender ?? null,
        age: d.age ?? null,
        specialization: d.specialization ?? null,
        qualifications: d.qualifications ?? null,
        bio: d.bio ?? null,
        documentPath: d.documentPath || null,
      }));

    res.json({ items });
  } catch (e) {
    console.error('GET /api/doctors/my/accepted error', e);
    res.status(500).json({ message: 'server_error' });
  }
});

/* ---------------------------------------------
   DOCTOR -> USER: Send an invite to connect
   POST /api/doctors/invite { userId }
---------------------------------------------- */
router.post('/invite', verifyToken, requireDoctor, async (req, res) => {
  try {
    const doctorId = String(req.user.userId);
    const { userId } = req.body || {};
    if (!userId) {
      return res.status(400).json({ message: 'userId required' });
    }

    const result = await createOrPendConnection({ userId, doctorId });
    if (!result.ok) {
      return res.status(result.status || 500).json({ message: result.message });
    }

    try {
      const recipientObj = typeof userId === 'string' ? oid(userId) : userId;
      await Notification.create({
        recipientId: recipientObj,
        recipientIdStr: String(userId),
        actorId: typeof doctorId === 'string' ? oid(doctorId) : doctorId,
        type: 'connect_request_from_doctor',
        message: 'Your doctor invited you to connect',
        meta: {
          connectionId: result.connectionId,
          doctorId: doctorId,
        },
      });
    } catch (e) {
      // Ignore notification errors
    }

    return res.json({
      message: 'Invite sent to user',
      connectionId: result.connectionId,
    });
  } catch (e) {
    console.error('POST /doctors/invite error', e);
    res.status(500).json({ message: 'server_error' });
  }
});

/* ---------------------------------------------
   USER: See doctor invites to me (pending)
   GET /api/doctors/invites → { items: [...] }
---------------------------------------------- */
router.get('/invites', verifyToken, requireUser, async (req, res) => {
  try {
    const me = String(req.user.userId);

    const pending = await Connection.find({
      status: 'pending',
      $or: [{ userId: me }, { user: me }],
    })
      .sort({ createdAt: -1 })
      .lean();

    if (!pending.length) {
      return res.json({ items: [] });
    }

    const doctorIds = pending.map(p => String(p.doctorId || p.doctor)).filter(Boolean);
    const docs = await User.find({ _id: { $in: doctorIds } })
      .select('_id name email profilePhoto gender age specialization')
      .lean();
    const byId = new Map(docs.map(d => [String(d._id), d]));

    const items = pending.map(p => {
      const did = String(p.doctorId || p.doctor || '');
      const d = byId.get(did);
      return {
        id: String(p._id),
        doctor: d
          ? {
              id: String(d._id),
              name: d.name,
              email: d.email,
              avatar: d.profilePhoto || null,
              gender: d.gender || null,
              age: d.age || null,
              specialization: d.specialization || null,
            }
          : null,
        requestedAt: p.requestedAt || p.createdAt,
      };
    });

    res.json({ items });
  } catch (e) {
    console.error('GET /doctors/invites error', e);
    res.status(500).json({ message: 'server_error' });
  }
});

/* ---------------------------------------------
   USER: Accept/Reject a doctor invite
   POST /api/doctors/invites/respond { connectionId, action }
---------------------------------------------- */
router.post('/invites/respond', verifyToken, requireUser, async (req, res) => {
  try {
    const me = String(req.user.userId);
    const { connectionId, action } = req.body || {};
    if (!connectionId || !['accept', 'reject'].includes(action)) {
      return res.status(400).json({ message: 'connectionId and valid action required' });
    }

    const conn = await Connection.findOne({
      _id: connectionId,
      $or: [{ userId: me }, { user: me }],
    });
    if (!conn) {
      return res.status(404).json({ message: 'Connection not found' });
    }

    const rawDoctorId = conn.doctorId || conn.doctor;
    const rawUserId = conn.userId || conn.user;
    const doctorObj = typeof rawDoctorId === 'string' ? oid(rawDoctorId) : rawDoctorId;
    const userObj = typeof rawUserId === 'string' ? oid(rawUserId) : rawUserId;
    const doctorStr = String(rawDoctorId);
    const userStr = String(rawUserId);

    if (action === 'accept') {
      conn.status = 'accepted';
      await conn.save();

      try {
        await Notification.create({
          recipientId: doctorObj,
          recipientIdStr: doctorStr,
          actorId: userObj,
          type: 'connect_accepted_by_user',
          message: 'The patient accepted your connection request',
          meta: { userId: userStr },
        });
      } catch (e) {
        // Ignore notification errors
      }

      return res.json({ message: 'Accepted' });
    }

    // Reject
    conn.status = 'rejected';
    await conn.save();

    try {
      await Notification.create({
        recipientId: doctorObj,
        recipientIdStr: doctorStr,
        actorId: userObj,
        type: 'connect_rejected_by_user',
        message: 'The patient rejected your connection request',
        meta: { userId: userStr },
      });
    } catch (e) {
      // Ignore notification errors
    }

    return res.json({ message: 'Rejected' });
  } catch (e) {
    console.error('POST /doctors/invites/respond error', e);
    res.status(500).json({ message: 'server_error' });
  }
});

/* ---------------------------------------------
   DEV: list my connections (as either role)
   GET /api/doctors/debug/my-connections
---------------------------------------------- */
router.get('/debug/my-connections', verifyToken, async (req, res) => {
  try {
    const me = String(req.user.userId);
    const rows = await Connection.find({
      $or: [
        { userId: me },
        { user: me },
        { doctorId: me },
        { doctor: me },
      ],
    })
      .sort({ createdAt: -1 })
      .lean();

    res.json({ rows });
  } catch (e) {
    console.error('GET /doctors/debug/my-connections error', e);
    res.status(500).json({ message: 'server_error' });
  }
});

module.exports = router;
