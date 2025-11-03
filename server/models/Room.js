const mongoose = require('mongoose');

const RoomSchema = new mongoose.Schema({
  participants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }], // [userId, doctorId]
}, { timestamps: true });

RoomSchema.index({ participants: 1 });

module.exports = mongoose.model('Room', RoomSchema);
