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
    
    if (!doctorId) return res.status(400).json({ message: 'doctorId required' });
    
    // Verify doctor exists
    const doctor = await User.findOne({ _id: doctorId, role: 'doctor' });
    if (!doctor) return res.status(404).json({ message: 'Doctor not found' });
    
    // Upsert draft (update if exists, create if not)
    const draft = await IntakeDraft.findOneAndUpdate(
      { userId, doctorId },
      { intake },
      { new: true, upsert: true }
    );
    
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
    
    const draft = await IntakeDraft.findOne({ userId, doctorId })
      .populate('doctorId', 'name email specialization profilePhoto')
      .lean();
    
    if (!draft) return res.status(404).json({ message: 'Draft not found' });
    
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
    
    await IntakeDraft.findOneAndDelete({ userId, doctorId });
    
    res.json({ message: 'Draft deleted' });
  } catch (e) {
    console.error('DELETE /user/intake-drafts/:doctorId error', e);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;

