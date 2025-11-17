// server/routes/notifications.js
const express = require('express');
const router = express.Router();

const Notification = require('../models/Notification');
const { verifyToken } = require('../middleware/auth');

/**
 * GET /api/notifications/health
 * Simple health check
 */
router.get('/health', (_req, res) => res.json({ ok: true }));

/**
 * GET /api/notifications?limit=20
 * Returns newest notifications for the logged-in user.
 * Response: { items: [...] }
 */
router.get('/', verifyToken, async (req, res) => {
  try {
    const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 20));
    const items = await Notification
      .find({ recipientId: req.user.userId })
      .populate('actorId', 'name email profilePhoto')
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    // Transform items to include actor info
    const transformed = items.map(item => ({
      _id: item._id,
      type: item.type,
      message: item.message,
      read: item.read,
      meta: item.meta || {},
      createdAt: item.createdAt,
      actor: item.actorId ? {
        name: item.actorId.name,
        email: item.actorId.email,
        avatar: item.actorId.profilePhoto,
      } : null,
    }));

    res.json({ items: transformed });
  } catch (e) {
    console.error('GET /notifications error', e);
    res.status(500).json({ message: 'server_error' });
  }
});

/**
 * GET /api/notifications/unread-count
 * Returns unread count for navbar badge.
 * Response: { count: number }
 */
router.get('/unread-count', verifyToken, async (req, res) => {
  try {
    const count = await Notification.countDocuments({
      recipientId: req.user.userId,
      read: false,
    });
    res.json({ count });
  } catch (e) {
    console.error('GET /notifications/unread-count error', e);
    res.status(500).json({ message: 'server_error' });
  }
});

/**
 * POST /api/notifications/mark-read
 * body: { ids?: [notificationId] }
 * If ids provided → mark those as read; otherwise mark all mine as read.
 * Response: { ok: true, updated: number }
 */
router.post('/mark-read', verifyToken, async (req, res) => {
  try {
    const { ids } = req.body || {};
    let result;

    if (Array.isArray(ids) && ids.length) {
      result = await Notification.updateMany(
        { _id: { $in: ids }, recipientId: req.user.userId },
        { $set: { read: true } }
      );
    } else {
      result = await Notification.updateMany(
        { recipientId: req.user.userId, read: false },
        { $set: { read: true } }
      );
    }

    res.json({ ok: true, updated: result?.modifiedCount || 0 });
  } catch (e) {
    console.error('POST /notifications/mark-read error', e);
    res.status(500).json({ message: 'server_error' });
  }
});

/**
 * POST /api/notifications/test
 * Dev helper to create a test notification for yourself.
 * Response: created notification doc
 */
router.post('/test', verifyToken, async (req, res) => {
  try {
    const row = await Notification.create({
      recipientId: req.user.userId,
      type: 'connect_request',
      message: 'Test notification',
      read: false,
      meta: {},
    });
    res.json(row);
  } catch (e) {
    console.error('POST /notifications/test error', e);
    res.status(500).json({ message: 'server_error' });
  }
});

module.exports = router;
