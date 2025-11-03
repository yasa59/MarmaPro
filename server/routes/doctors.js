// server/routes/doctors.js
const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');

const User = require('../models/user');                 // doctors & regular users
const Photo = require('../models/Photo');               // may have userId or user
const Connection = require('../models/Connection');     // may have doctorId/doctor, userId/user
const Notification = require('../models/Notification');
const Room = require('../models/Room');
const { verifyToken, requireDoctor, requireUser } = require('../middleware/auth');

/* ---------------------------------------------
   Helpers to support both {doctorId,userId} or {doctor,user}
---------------------------------------------- */
const oid = (v) => new mongoose.Types.ObjectId(String(v));

function doctorMatch(userId) {
  const id = oid(userId);
  return { $or: [ { doctorId: id }, { doctor: id } ] };
}

function userMatch(userId) {
  const id = oid(userId);
  return { $or: [ { userId: id }, { user: id } ] };
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
    console.error('doctors / error', e);
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
    const page  = Math.max(1, Number(req.query.page) || 1);
    const skip  = (page - 1) * limit;

    const filter = { role: 'doctor', isApproved: true };
    if (q) {
      filter.$or = [
        { name:  { $regex: q, $options: 'i' } },
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
    console.error('doctors/public error', e);
    res.status(500).json({ message: 'Server error' });
  }
});

/* ---------------------------------------------
   PUBLIC: get a doctor’s public profile
   GET /api/doctors/:id/profile
---------------------------------------------- */
router.get('/:id/profile', async (req, res) => {
  try {
    const id = req.params.id;
    const doc = await User.findOne({ _id: id, role: 'doctor', isApproved: true })
      .select('_id name email profilePhoto gender age specialization qualifications bio documentPath createdAt')
      .lean();
    if (!doc) return res.status(404).json({ message: 'Doctor not found/approved' });
    res.json(doc);
  } catch (e) {
    console.error('doctors/:id/profile error', e);
    res.status(500).json({ message: 'Server error' });
  }
});

/* ---------------------------------------------
   Helper: create/ensure a pending connection
---------------------------------------------- */
async function createOrPendConnection({ userId, doctorId }) {
  const doctor = await User.findOne({ _id: doctorId, role: 'doctor', isApproved: true });
  if (!doctor) return { ok: false, status: 404, message: 'Doctor not found/approved' };

  // find existing in either shape
  let conn = await Connection.findOne({
    $or: [
      { userId, doctorId },
      { user: userId, doctor: doctorId },
    ]
  });

  if (!conn) {
    conn = new Connection({
      userId, doctorId,
      user: userId, doctor: doctorId,
      status: 'pending',
      requestedAt: new Date(),
    });
    await conn.save();
    console.log('🧩 Created connection:', {
      _id: String(conn._id),
      userId: String(conn.userId || conn.user),
      doctorId: String(conn.doctorId || conn.doctor),
      status: conn.status
    });
  } else if (conn.status === 'rejected') {
    conn.status = 'pending';
    conn.requestedAt = new Date();
    await conn.save();
    console.log('🧩 Re-pended connection', String(conn._id));
  } else if (conn.status === 'accepted') {
    return { ok: true, message: 'Already connected to this doctor', already: true };
  } else {
    return { ok: true, message: 'Request already sent', already: true };
  }

  // optional notification
  try {
    await Notification.create({
      recipientId: doctorId,
      actorId: userId,
      type: 'connect_request',
      message: 'A patient requested to connect with you',
      meta: { connectionId: conn._id.toString(), userId: userId.toString() },
    });
  } catch (e) {
    console.log('⚠️ Notification create failed (ok in dev):', e.message);
  }

  return { ok: true, message: 'Request sent to doctor', connectionId: conn._id.toString() };
}

/* ---------------------------------------------
   USER: Request connect
   POST /api/doctors/request { doctorId }
---------------------------------------------- */
router.post('/request', verifyToken, requireUser, async (req, res) => {
  try {
    const userId = req.user.userId;
    const doctorId = req.body.doctorId;
    if (!doctorId) return res.status(400).json({ message: 'doctorId required' });

    const result = await createOrPendConnection({ userId, doctorId });
    if (!result.ok) return res.status(result.status || 500).json({ message: result.message });
    return res.json({ message: result.message, connectionId: result.connectionId });
  } catch (e) {
    console.error('doctors/request error', e);
    res.status(500).json({ message: 'Server error' });
  }
});

/* ---------------------------------------------
   DOCTOR: Pending requests (alerts)
   GET /api/doctors/alerts → { items: [...] }
---------------------------------------------- */
router.get('/alerts', verifyToken, requireDoctor, async (req, res) => {
  try {
    const match = { status: 'pending', ...doctorMatch(req.user.userId) };
    const pending = await Connection.find(match).sort({ createdAt: -1 }).lean();

    const userIds = pending.map(p => p.userId || p.user).filter(Boolean).map(String);
    const users = userIds.length
      ? await User.find({ _id: { $in: userIds } }).select('_id name email profilePhoto gender age').lean()
      : [];

    // latest photo per user (works for Photo.userId or Photo.user)
    const ids = userIds.map(oid);
    const latestByUser = new Map();
    try {
      const photos1 = await Photo.aggregate([
        { $match: { userId: { $in: ids } } },
        { $sort: { createdAt: -1 } },
        { $group: { _id: '$userId', doc: { $first: '$$ROOT' } } },
      ]);
      photos1.forEach(p => latestByUser.set(String(p._id), p.doc));
    } catch {}
    try {
      const photos2 = await Photo.aggregate([
        { $match: { user: { $in: ids } } },
        { $sort: { createdAt: -1 } },
        { $group: { _id: '$user', doc: { $first: '$$ROOT' } } },
      ]);
      photos2.forEach(p => { const k = String(p._id); if (!latestByUser.has(k)) latestByUser.set(k, p.doc); });
    } catch {}

    const items = pending.map(p => {
      const uid = String(p.userId || p.user || '');
      const u = users.find(x => String(x._id) === uid);
      const ph = latestByUser.get(uid);
      return {
        id: String(p._id),
        user: u ? { id: String(u._id), name: u.name, email: u.email, gender: u.gender, age: u.age } : null,
        requestedAt: p.createdAt,
        photo: ph ? { raw: ph.filepath, annotated: ph.annotated || null } : null,
      };
    });

    res.json({ items });
  } catch (e) {
    console.error('doctors/alerts error', e);
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
    if (!connectionId || !['accept','reject'].includes(action)) {
      return res.status(400).json({ message: 'connectionId and valid action required' });
    }

    const conn = await Connection.findOne({
      _id: connectionId,
      ...doctorMatch(req.user.userId),
    });
    if (!conn) return res.status(404).json({ message: 'Connection not found' });

    if (action === 'accept') {
      conn.status = 'accepted';
      await conn.save();

      let roomId = null;
      try {
        if (Room) {
          let room = await Room.findOne({
            participants: { $all: [ conn.userId || conn.user, conn.doctorId || conn.doctor ] }
          });
          if (!room) {
            room = await Room.create({ participants: [ conn.userId || conn.user, conn.doctorId || conn.doctor ] });
          }
          roomId = String(room._id);
        }
      } catch {}

      try {
        await Notification.create({
          recipientId: conn.userId || conn.user,
          actorId: conn.doctorId || conn.doctor,
          type: 'connect_accepted',
          message: 'Your doctor accepted the connection request',
          meta: { doctorId: String(conn.doctorId || conn.doctor), roomId },
        });
      } catch {}

      return res.json({ message: 'Accepted' });
    } else {
      conn.status = 'rejected';
      await conn.save();

      try {
        await Notification.create({
          recipientId: conn.userId || conn.user,
          actorId: conn.doctorId || conn.doctor,
          type: 'connect_rejected',
          message: 'Your connection request was rejected',
          meta: { doctorId: String(conn.doctorId || conn.doctor) },
        });
      } catch {}

      return res.json({ message: 'Rejected' });
    }
  } catch (e) {
    console.error('doctors/alerts/respond error', e);
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

    const patients = conns.map((c) => {
      const uid = String(c.userId || c.user || '');
      const u = users.find(x => String(x._id) === uid);
      return {
        _id: String(c._id),
        status: c.status === 'accepted' ? 'approved' : c.status,
        user: u ? {
          _id: String(u._id),
          name: u.name,
          email: u.email,
          avatarUrl: u.profilePhoto || null,
          gender: u.gender || null,
          age: u.age || null,
        } : null,
        lastPhotoAt: null,
        latestPhotoThumb: null,
      };
    });

    // enrich with latest photo
    if (patients.length) {
      const ids = userIds.map(oid);
      const latestByUser = new Map();

      try {
        const A = await Photo.aggregate([
          { $match: { userId: { $in: ids } } },
          { $sort: { createdAt: -1 } },
          { $group: { _id: '$userId', lastPhotoAt: { $first: '$createdAt' }, latestFile: { $first: '$filepath' }, latestAnnotated: { $first: '$annotated' } } },
        ]);
        A.forEach(r => latestByUser.set(String(r._id), r));
      } catch {}

      try {
        const B = await Photo.aggregate([
          { $match: { user: { $in: ids } } },
          { $sort: { createdAt: -1 } },
          { $group: { _id: '$user', lastPhotoAt: { $first: '$createdAt' }, latestFile: { $first: '$filepath' }, latestAnnotated: { $first: '$annotated' } } },
        ]);
        B.forEach(r => { const k = String(r._id); if (!latestByUser.has(k)) latestByUser.set(k, r); });
      } catch {}

      patients.forEach((p) => {
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
    const mapIn = { approved: 'accepted', accept: 'accepted', accepted: 'accepted', pending: 'pending', reject: 'rejected', rejected: 'rejected' };
    const dbStatus = mapIn[inStatus];
    if (!dbStatus) return res.status(400).json({ message: 'invalid_status' });

    const conn = await Connection.findOneAndUpdate(
      { _id: id, ...doctorMatch(req.user.userId) },
      { $set: { status: dbStatus } },
      { new: true }
    ).lean();

    if (!conn) return res.status(404).json({ message: 'connection_not_found' });

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
      $or: [
        { userId: me },
        { user: me },
      ],
    }).sort({ createdAt: -1 }).lean();

    const docIds = accepted.map(c => String(c.doctorId || c.doctor)).filter(Boolean);
    if (!docIds.length) return res.json({ items: [] });

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
    if (!userId) return res.status(400).json({ message: 'userId required' });

    const result = await createOrPendConnection({ userId, doctorId });
    if (!result.ok) return res.status(result.status || 500).json({ message: result.message });

    try {
      await Notification.create({
        recipientId: userId,
        actorId: doctorId,
        type: 'connect_request_from_doctor',
        message: 'Your doctor invited you to connect',
        meta: { connectionId: result.connectionId, doctorId },
      });
    } catch {}

    return res.json({ message: 'Invite sent to user', connectionId: result.connectionId });
  } catch (e) {
    console.error('POST /doctors/invite error', e);
    res.status(500).json({ message: 'server_error' });
  }
});

/* ---------------------------------------------
   USER: See doctor invites to me (pending connections)
   GET /api/doctors/invites
---------------------------------------------- */
router.get('/invites', verifyToken, requireUser, async (req, res) => {
  try {
    const me = String(req.user.userId);

    const pending = await Connection.find({
      status: 'pending',
      $or: [{ userId: me }, { user: me }],
    }).sort({ createdAt: -1 }).lean();

    if (!pending.length) return res.json({ items: [] });

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
        doctor: d ? {
          id: String(d._id),
          name: d.name,
          email: d.email,
          avatar: d.profilePhoto || null,
          gender: d.gender || null,
          age: d.age || null,
          specialization: d.specialization || null,
        } : null,
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
    if (!connectionId || !['accept','reject'].includes(action)) {
      return res.status(400).json({ message: 'connectionId and valid action required' });
    }

    const conn = await Connection.findOne({
      _id: connectionId,
      $or: [{ userId: me }, { user: me }],
    });
    if (!conn) return res.status(404).json({ message: 'Connection not found' });

    if (action === 'accept') {
      conn.status = 'accepted';
      await conn.save();

      try {
        await Notification.create({
          recipientId: conn.doctorId || conn.doctor,
          actorId: conn.userId || conn.user,
          type: 'connect_accepted_by_user',
          message: 'The patient accepted your connection request',
          meta: { userId: String(conn.userId || conn.user) },
        });
      } catch {}

      return res.json({ message: 'Accepted' });
    }

    conn.status = 'rejected';
    await conn.save();

    try {
      await Notification.create({
        recipientId: conn.doctorId || conn.doctor,
        actorId: conn.userId || conn.user,
        type: 'connect_rejected_by_user',
        message: 'The patient rejected your connection request',
        meta: { userId: String(conn.userId || conn.user) },
      });
    } catch {}

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
  const me = String(req.user.userId);
  const rows = await Connection.find({
    $or: [
      { userId: me }, { user: me },
      { doctorId: me }, { doctor: me },
    ],
  }).sort({ createdAt: -1 }).lean();

  res.json({ rows });
});

module.exports = router;
