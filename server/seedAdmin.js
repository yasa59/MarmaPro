require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const User = require('./models/user');

(async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/iMarmaTherapy');
    const email = 'drseed@imar.local';
    const name = 'Dr Seeded';
    const password = await bcrypt.hash('Doctor#123', 10);

    let doc = await User.findOne({ email: email.toLowerCase() });
    if (!doc) {
      doc = await User.create({
        name,
        email: email.toLowerCase(),
        password,
        role: 'doctor',
        isApproved: true,
        profilePhoto: null,
        documentPath: null,
      });
      console.log('✅ Seeded approved doctor:', doc.email);
    } else {
      await User.updateOne({ _id: doc._id }, { $set: { role: 'doctor', isApproved: true } });
      console.log('ℹ️ Existing doctor set approved:', doc.email);
    }
    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
})();
