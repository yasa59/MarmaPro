// server/models/Connection.js
const mongoose = require('mongoose');

const O = mongoose.Schema.Types.ObjectId;

const ConnectionSchema = new mongoose.Schema(
  {
    // Support BOTH shapes (legacy + new). One pair may be null.
    userId:   { type: O, ref: 'User', default: null },
    doctorId: { type: O, ref: 'User', default: null },
    user:     { type: O, ref: 'User', default: null },
    doctor:   { type: O, ref: 'User', default: null },

    status: { type: String, enum: ['pending', 'accepted', 'rejected'], default: 'pending' },
    requestedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

/* ---------- Indexes (NON-UNIQUE) ---------- */
// Fast lookups by either shape
ConnectionSchema.index({ userId: 1, doctorId: 1 });
ConnectionSchema.index({ user: 1, doctor: 1 });

// Alerts / recency
ConnectionSchema.index({ status: 1, createdAt: -1 });

// Export (safe for hot-reload)
module.exports =
  mongoose.models.Connection || mongoose.model('Connection', ConnectionSchema);
