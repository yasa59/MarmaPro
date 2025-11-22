// server/routes/user.js
const express = require('express');
const router = express.Router();
const { verifyToken, requireUser } = require('../middleware/auth');
const IntakeDraft = require('../models/IntakeDraft');
const User = require('../models/user');

// POST /api/user/intake-drafts - Save an intake draft
router.post('/intake-drafts', verifyToken, requireUser, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { doctorId, intake } = req.body;
    const mongoose = require('mongoose');
    const oid = (v) => new mongoose.Types.ObjectId(String(v));
    
    if (!doctorId) return res.status(400).json({ message: 'doctorId required' });
    
    // Verify doctor exists
    const doctor = await User.findOne({ _id: doctorId, role: 'doctor' });
    if (!doctor) return res.status(404).json({ message: 'Doctor not found' });
    
    // Convert doctorId to ObjectId for consistent storage
    const doctorIdObj = oid(doctorId);
    
    // Upsert draft (update if exists, create if not)
    // Try to find existing draft with either format
    let draft = await IntakeDraft.findOne({
      userId: userId,
      $or: [
        { doctorId: doctorIdObj },
        { doctorId: String(doctorId) },
      ]
    });
    
    if (draft) {
      // Update existing draft
      draft.intake = intake;
      await draft.save();
      await draft.populate('doctorId', 'name email specialization profilePhoto');
    } else {
      // Create new draft
      draft = await IntakeDraft.create({
        userId: userId,
        doctorId: doctorIdObj,
        intake: intake,
      });
      await draft.populate('doctorId', 'name email specialization profilePhoto');
    }
    
    res.json({ message: 'Draft saved', draft });
  } catch (e) {
    console.error('POST /user/intake-drafts error', e);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/user/intake-drafts - Get all drafts for the user
router.get('/intake-drafts', verifyToken, requireUser, async (req, res) => {
  try {
    const userId = req.user.userId;
    
    const drafts = await IntakeDraft.find({ userId })
      .populate('doctorId', 'name email specialization profilePhoto')
      .sort({ updatedAt: -1 })
      .lean();
    
    res.json({ items: drafts });
  } catch (e) {
    console.error('GET /user/intake-drafts error', e);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/user/intake-drafts/:doctorId - Get specific draft
router.get('/intake-drafts/:doctorId', verifyToken, requireUser, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { doctorId } = req.params;
    const mongoose = require('mongoose');
    const oid = (v) => new mongoose.Types.ObjectId(String(v));
    
    // Try both ObjectId and string formats for doctorId
    const doctorIdObj = oid(doctorId);
    const doctorIdStr = String(doctorId);
    
    const draft = await IntakeDraft.findOne({
      userId: userId,
      $or: [
        { doctorId: doctorIdObj },
        { doctorId: doctorIdStr },
      ]
    })
      .populate('doctorId', 'name email specialization profilePhoto')
      .lean();
    
    // Return empty object instead of 404 since drafts are optional
    if (!draft) {
      return res.json({ 
        _id: null,
        userId: String(userId),
        doctorId: doctorId,
        intake: null,
        createdAt: null,
        updatedAt: null
      });
    }
    
    res.json(draft);
  } catch (e) {
    console.error('GET /user/intake-drafts/:doctorId error', e);
    res.status(500).json({ message: 'Server error' });
  }
});

// DELETE /api/user/intake-drafts/:doctorId - Delete a draft
router.delete('/intake-drafts/:doctorId', verifyToken, requireUser, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { doctorId } = req.params;
    const mongoose = require('mongoose');
    const oid = (v) => new mongoose.Types.ObjectId(String(v));
    
    // Try both ObjectId and string formats
    const doctorIdObj = oid(doctorId);
    const doctorIdStr = String(doctorId);
    
    const result = await IntakeDraft.findOneAndDelete({
      userId: userId,
      $or: [
        { doctorId: doctorIdObj },
        { doctorId: doctorIdStr },
      ]
    });
    
    if (!result) {
      return res.status(404).json({ message: 'Draft not found' });
    }
    
    res.json({ message: 'Draft deleted' });
  } catch (e) {
    console.error('DELETE /user/intake-drafts/:doctorId error', e);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;

