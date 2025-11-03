// server/models/CallLog.js
const mongoose = require('mongoose');

const CallLogSchema = new mongoose.Schema({
  roomId:      { type: String, required: true },
  callerId:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  calleeId:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  startedAt:   { type: Date, default: Date.now },
  endedAt:     { type: Date },
  reason:      { type: String, enum: ['completed','rejected','missed','error'], default: 'completed' },
  durationSec: { type: Number, default: 0 },
  meta:        { type: Object, default: {} },
}, { timestamps: true });

module.exports = mongoose.model('CallLog', CallLogSchema);
