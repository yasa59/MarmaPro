// server/seedDoctor.js
require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

// ⚠️ If your model file is named `models/user.js`, change the next line to: require('./models/user')
const User = require('./models/user');

(async () => {
  try {
    const uri = process.env.MONGO_URI || 'mongodb://localhost:27017/iMarmaTherapy';
    await mongoose.connect(uri);
    console.log('✅ Connected:', uri);

    const email = 'drseed@imar.local';
    const name = 'Dr Seeded';
    const hashed = await bcrypt.hash('Doctor#123', 10);

    let doc = await User.findOne({ email: email.toLowerCase() });
    if (!doc) {
      doc = await User.create({
        name,
        email: email.toLowerCase(),
        password: hashed,
        role: 'doctor',
        isApproved: true,
        profilePhoto: null,
        documentPath: null,
      });
      console.log('✅ Seeded approved doctor:', doc.email);
    } else {
      await User.updateOne(
        { _id: doc._id },
        { $set: { role: 'doctor', isApproved: true, password: hashed } }
      );
      console.log('ℹ️ Existing user updated to approved doctor:', doc.email);
    }

    process.exit(0);
  } catch (e) {
    console.error('Seeder error:', e);
    process.exit(1);
  }
})();
