// server/models/Session.js
const mongoose = require('mongoose');
const O = mongoose.Schema.Types.ObjectId;

const SessionSchema = new mongoose.Schema({
  userId:   { type: O, ref: 'User', required: true },
  doctorId: { type: O, ref: 'User', required: true },

  status: { type: String, enum: ['draft', 'active', 'completed', 'cancelled'], default: 'active' },

  // snapshot-ish
  feetPhotoUrl: { type: String, default: null },

  // optional intake answers (if you decide to collect)
  intake: {
    fullName: String,
    age: Number,
    gender: String,
    painArea: String,
    problemType: String,
    phone: String,
    otherNotes: String,
  },

  instructions: {
    text: { type: String, default: '' },
    meds: { type: String, default: '' },
    doctorPhonePublic: { type: String, default: '' }, // for WhatsApp
  },

  // exactly 4 points is common, but allow array
  marmaPlan: [
    {
      name: String,         // e.g. "Marma 1"
      durationSec: Number,  // e.g. 60
      notes: String,        // optional
    }
  ],
}, { timestamps: true });

SessionSchema.index({ userId: 1, doctorId: 1, createdAt: -1 });

module.exports = mongoose.models.Session || mongoose.model('Session', SessionSchema);
