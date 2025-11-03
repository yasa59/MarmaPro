const mongoose = require('mongoose');

const MessageSchema = new mongoose.Schema({
  roomId:   { type: mongoose.Schema.Types.ObjectId, ref: 'Room', required: true },
  senderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  text:     { type: String },
}, { timestamps: true });

MessageSchema.index({ roomId: 1, createdAt: 1 });

module.exports = mongoose.model('Message', MessageSchema);
