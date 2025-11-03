// server/models/User.js  (recommend renaming to: server/models/user.js)
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    // Core
    name:        { type: String, required: true },
    email:       { type: String, required: true, unique: true, lowercase: true },
    password:    { type: String, required: true },

    // Roles & approval
    role:        { type: String, enum: ['user', 'doctor', 'admin'], default: 'user' },
    isApproved:  { type: Boolean, default: false }, // doctors need admin approval

    // Media / docs
    profilePhoto:{ type: String, default: null },   // avatar or headshot
    documentPath:{ type: String, default: null },   // doctor credential / ID upload

    // NEW shared demographics
    gender:      { type: String, enum: ['male', 'female', 'other', null], default: null },
    age:         { type: Number, default: null },

    // NEW doctor extras
    specialization:  { type: String, default: null }, // e.g., "Marma Therapy", "Physio"
    qualifications:  { type: String, default: null }, // e.g., "BAMS, MSc"
    bio:             { type: String, default: null }, // short profile/about

    // Auth / OTP
    otp:         { type: String, default: null },
    otpExpires:  { type: Date,   default: null },
    lastSignIn:  { type: Date,   default: null },
  },
  { timestamps: true }
);

// ✅ Guard against model re-compilation during hot reloads
module.exports = mongoose.models.User || mongoose.model('User', userSchema);
