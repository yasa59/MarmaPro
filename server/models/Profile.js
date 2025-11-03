// server/models/Profile.js
const mongoose = require('mongoose');

const ProfileSchema = new mongoose.Schema(
  {
    userId:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', unique: true, required: true },
    title:    { type: String, enum: ['Mr', 'Ms', 'Mrs', 'Dr', 'Prof', 'Mx', ''], default: '' },
    fullName: { type: String, default: '' },
    phone:    { type: String, default: '' },
    gender:   { type: String, enum: ['male','female','other','prefer_not',''], default: '' },
    avatar:   { type: String, default: '' }, // /uploads/avatars/<file>
  },
  { timestamps: true }
);

module.exports = mongoose.model('Profile', ProfileSchema);
