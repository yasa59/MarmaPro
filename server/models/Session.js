// server/models/Session.js
const mongoose = require('mongoose');
const O = mongoose.Schema.Types.ObjectId;

const SessionSchema = new mongoose.Schema({
  userId:   { type: O, ref: 'User', required: true },
  doctorId: { type: O, ref: 'User', required: true },

  status: { 
    type: String, 
    enum: ['pending', 'accepted', 'intake_submitted', 'responded', 'active', 'completed', 'cancelled'], 
    default: 'pending' 
  },

  // connection readiness state (for Connect button feature)
  connectionState: {
    userReady: { type: Boolean, default: false },
    doctorReady: { type: Boolean, default: false },
    connectedAt: { type: Date, default: null }, // when both are ready
  },

  // snapshot-ish
  feetPhotoUrl: { type: String, default: null },

  // optional intake answers (if you decide to collect)
  intake: {
    fullName: String,
    age: Number,
    gender: String,
    livingArea: String,
    bloodType: String,
    painDescription: String,
    painLocation: String,
    painDuration: String,
    painSeverity: String,
    painArea: String, // kept for backward compatibility
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
