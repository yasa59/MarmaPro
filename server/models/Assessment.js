// server/models/Assessment.js
const mongoose = require('mongoose');

const AssessmentSchema = new mongoose.Schema(
  {
    userId:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },   // patient
    doctorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },   // doctor
    age:      { type: Number },
    job:      { type: String },
    condition:{ type: String },  // what patient suffers from
    notes:    { type: String },
  },
  { timestamps: true }
);

AssessmentSchema.index({ userId: 1, doctorId: 1 }, { unique: true }); // one row per pair
module.exports = mongoose.model('Assessment', AssessmentSchema);
