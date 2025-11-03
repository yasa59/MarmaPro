// server/routes/assessments.js
const express = require('express');
const router = express.Router();

const Assessment = require('../models/Assessment');
const Connection = require('../models/Connection');
const { verifyToken, requireDoctor } = require('../middleware/auth');

// Get current assessment (for doctor-patient pair)
router.get('/:userId', verifyToken, requireDoctor, async (req, res) => {
  const doctorId = req.user.userId;
  const userId = req.params.userId;

  const conn = await Connection.findOne({ doctorId, userId, status: 'accepted' }).lean();
  if (!conn) return res.status(403).json({ message: 'Not connected to this patient' });

  const doc = await Assessment.findOne({ doctorId, userId }).lean();
  res.json(doc || {});
});

// Save/Update assessment (upsert)
router.post('/save', verifyToken, requireDoctor, async (req, res) => {
  const doctorId = req.user.userId;
  const { userId, age, job, condition, notes } = req.body;
  if (!userId) return res.status(400).json({ message: 'userId required' });

  const conn = await Connection.findOne({ doctorId, userId, status: 'accepted' }).lean();
  if (!conn) return res.status(403).json({ message: 'Not connected to this patient' });

  const up = await Assessment.findOneAndUpdate(
    { doctorId, userId },
    { age, job, condition, notes },
    { new: true, upsert: true }
  );

  res.json({ message: 'Saved', assessment: up });
});

module.exports = router;
