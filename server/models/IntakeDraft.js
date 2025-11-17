// server/models/IntakeDraft.js
const mongoose = require('mongoose');
const O = mongoose.Schema.Types.ObjectId;

const IntakeDraftSchema = new mongoose.Schema({
  userId: { type: O, ref: 'User', required: true },
  doctorId: { type: O, ref: 'User', required: true },
  
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
    problemType: String,
    phone: String,
    otherNotes: String,
  },
}, { timestamps: true });

IntakeDraftSchema.index({ userId: 1, doctorId: 1, createdAt: -1 });

module.exports = mongoose.models.IntakeDraft || mongoose.model('IntakeDraft', IntakeDraftSchema);

