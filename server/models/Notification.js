// server/models/Notification.js
const mongoose = require('mongoose');

const NotificationSchema = new mongoose.Schema(
  {
    recipientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    actorId:     { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    type:        { type: String, enum: ['connect_request','connect_accepted','connect_rejected','doctor_approved','user_connect','doctor_connect','instructions_sent'], required: true },
    message:     { type: String, required: true },
    read:        { type: Boolean, default: false },
    meta:        { type: Object, default: {} },
  },
  { timestamps: true }
);

NotificationSchema.index({ recipientId: 1, read: 1, createdAt: -1 });

module.exports = mongoose.model('Notification', NotificationSchema);
