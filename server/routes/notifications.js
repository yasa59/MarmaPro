// server/routes/notifications.js
const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');

const Notification = require('../models/Notification');
const { verifyToken } = require('../middleware/auth');

const oid = (v) => new mongoose.Types.ObjectId(String(v));

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
    const recipientId = req.user.userId;
    
    // Try both ObjectId and string formats to handle any stored format
    const recipientIdObj = oid(recipientId);
    const recipientIdStr = String(recipientId);
    
    console.log('📬 Fetching notifications for user:', {
      recipientId: recipientIdStr,
      recipientIdObj: String(recipientIdObj),
      recipientIdType: typeof recipientId,
      role: req.user.role,
      limit: limit,
    });
    
    // Query with $or to match both ObjectId and string formats
    // Also try matching recipientIdStr field
    const recipientMatch = {
      $or: [
        { recipientId: recipientIdObj },
        { recipientId: recipientIdStr },
        { recipientIdStr: recipientIdStr },
        // Also try matching as string in recipientIdStr field
        { recipientIdStr: String(recipientIdObj) },
      ],
    };

    // Debug: Check ALL connect_request notifications to see what recipientIds exist
    const allConnectRequests = await Notification.find({
      type: 'connect_request',
    }).sort({ createdAt: -1 }).limit(10).lean();
    
    console.log('🔍 Sample connect_request notifications in DB:', {
      total: allConnectRequests.length,
      sample: allConnectRequests.slice(0, 5).map(n => ({
        id: String(n._id),
        recipientId: String(n.recipientId),
        recipientIdStr: n.recipientIdStr || 'missing',
        recipientIdType: typeof n.recipientId,
        message: n.message,
        createdAt: n.createdAt,
        matchesCurrentUser: (
          String(n.recipientId) === recipientIdStr ||
          String(n.recipientId) === String(recipientIdObj) ||
          n.recipientIdStr === recipientIdStr ||
          n.recipientIdStr === String(recipientIdObj)
        ),
      })),
    });

    // Debug: Check all notifications for this specific doctor (before filtering)
    const doctorNotifications = await Notification.find({
      $or: [
        { recipientId: recipientIdObj },
        { recipientId: recipientIdStr },
        { recipientIdStr: recipientIdStr },
        { recipientIdStr: String(recipientIdObj) },
      ],
    }).limit(20).lean();
    
    console.log('🔍 All notifications for this doctor (before query filter):', {
      doctorId: recipientIdStr,
      doctorIdObj: String(recipientIdObj),
      totalFound: doctorNotifications.length,
      notifications: doctorNotifications.map(n => ({
        id: String(n._id),
        recipientId: String(n.recipientId),
        recipientIdStr: n.recipientIdStr || 'missing',
        type: n.type,
        message: n.message,
        createdAt: n.createdAt,
        matches: (
          String(n.recipientId) === recipientIdStr ||
          String(n.recipientId) === String(recipientIdObj) ||
          n.recipientIdStr === recipientIdStr ||
          n.recipientIdStr === String(recipientIdObj)
        ),
      })),
    });

    const items = await Notification
      .find(recipientMatch)
      .populate('actorId', 'name email profilePhoto')
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    console.log('📬 Found notifications:', {
      recipientId: recipientIdStr,
      recipientIdObj: String(recipientIdObj),
      count: items.length,
      types: items.map(i => i.type),
      connectRequestCount: items.filter(i => i.type === 'connect_request').length,
      sampleRecipientIds: items.slice(0, 3).map(i => ({
        stored: String(i.recipientId),
        storedStr: i.recipientIdStr || 'missing',
        storedType: typeof i.recipientId,
        type: i.type,
      })),
    });
    
    // If no notifications found but we expect some, log a warning
    if (items.length === 0 && req.user.role === 'doctor') {
      console.warn('⚠️ No notifications found for doctor, but checking if any exist in DB...');
      const allDoctorNotifs = await Notification.find({
        type: 'connect_request',
      }).limit(5).lean();
      console.log('🔍 Sample connect_request notifications in DB:', {
        total: allDoctorNotifs.length,
        sample: allDoctorNotifs.slice(0, 3).map(n => ({
          recipientId: String(n.recipientId),
          recipientIdStr: n.recipientIdStr || 'missing',
          doctorId: recipientIdStr,
          matches: String(n.recipientId) === recipientIdStr || n.recipientIdStr === recipientIdStr,
        })),
      });
    }

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
    const recipientId = req.user.userId;
    const recipientIdObj = oid(recipientId);
    const recipientIdStr = String(recipientId);
    
    console.log('📊 Unread count query:', {
      recipientId: recipientIdStr,
      recipientIdObj: String(recipientIdObj),
      role: req.user.role,
    });
    
    // Try multiple query formats to ensure we catch all notifications
    const count = await Notification.countDocuments({
      $and: [
        {
          $or: [
            { recipientId: recipientIdObj },
            { recipientId: recipientIdStr },
            { recipientIdStr: recipientIdStr },
            { recipientIdStr: String(recipientIdObj) },
          ],
        },
        {
          $or: [
            { read: false },
            { read: { $exists: false } }, // Handle undefined/null as unread
          ],
        },
      ],
    });
    
    // Also check total notifications for debugging
    const totalCount = await Notification.countDocuments({
      $or: [
        { recipientId: recipientIdObj },
        { recipientId: recipientIdStr },
        { recipientIdStr: recipientIdStr },
        { recipientIdStr: String(recipientIdObj) },
      ],
    });
    
    console.log('📊 Unread count result:', {
      recipientId: recipientIdStr,
      unreadCount: count,
      totalCount: totalCount,
      role: req.user.role,
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
    const recipientId = req.user.userId;
    const recipientIdObj = oid(recipientId);
    const recipientIdStr = String(recipientId);
    
    let result;

    if (Array.isArray(ids) && ids.length) {
      result = await Notification.updateMany(
        {
          _id: { $in: ids },
          $or: [
            { recipientId: recipientIdObj },
            { recipientId: recipientIdStr },
            { recipientIdStr: recipientIdStr },
          ],
        },
        { $set: { read: true } }
      );
    } else {
      result = await Notification.updateMany(
        {
          $or: [
            { recipientId: recipientIdObj },
            { recipientId: recipientIdStr },
            { recipientIdStr: recipientIdStr },
          ],
          read: false,
        },
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
 * Dev helper to create a test notification - only available in development
 */
if (process.env.NODE_ENV !== 'production') {
  router.post('/test', verifyToken, async (req, res) => {
    try {
      const recipientObj = oid(req.user.userId);
      const row = await Notification.create({
        recipientId: recipientObj,
        recipientIdStr: String(recipientObj),
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
}

/**
 * GET /api/notifications/debug
 * Debug endpoint - only available in development
 */
if (process.env.NODE_ENV !== 'production') {
  router.get('/debug', verifyToken, async (req, res) => {
  try {
    const recipientId = req.user.userId;
    const recipientIdObj = oid(recipientId);
    const recipientIdStr = String(recipientId);
    
    // Get all notifications (both formats)
    const allNotifications = await Notification.find({
      $or: [
        { recipientId: recipientIdObj },
        { recipientId: recipientIdStr },
        { recipientIdStr: recipientIdStr },
      ],
    }).lean();
    
    // Also check what format is stored
    const sample = allNotifications.slice(0, 5).map(n => ({
      _id: String(n._id),
      recipientId: String(n.recipientId),
      recipientIdType: n.recipientId.constructor.name,
      type: n.type,
      message: n.message,
      createdAt: n.createdAt,
    }));
    
    res.json({
      currentUserId: recipientIdStr,
      currentUserIdObj: String(recipientIdObj),
      totalCount: allNotifications.length,
      sample: sample,
      allNotifications: allNotifications.map(n => ({
        _id: String(n._id),
        recipientId: String(n.recipientId),
        type: n.type,
        message: n.message,
        read: n.read,
        createdAt: n.createdAt,
      })),
    });
  } catch (e) {
    console.error('GET /notifications/debug error', e);
    res.status(500).json({ message: 'server_error' });
  }
  });
}

module.exports = router;
