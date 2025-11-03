// server/models/Photo.js
const mongoose = require('mongoose');

const RectSchema = new mongoose.Schema(
  { x: Number, y: Number, width: Number, height: Number },
  { _id: false }
);

const PhotoSchema = new mongoose.Schema(
  {
    userId:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    filepath: { type: String, required: true },     // original image: /uploads/photos/<file>
    annotated:{ type: String },                     // annotated image path (PNG/JPG)
    aligned:  { type: Boolean, default: false },    // red/green flag

    // Legacy rectangles (used by Sharp overlay or external AI)
    rectangles: [RectSchema],

    // Flexible metadata for Python pipeline (e.g., { boxes: [...], model: 'groq', ... })
    meta: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Photo', PhotoSchema);
