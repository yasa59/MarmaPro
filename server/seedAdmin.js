require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const User = require('./models/user');

(async () => {
  try {
    const uri = process.env.MONGO_URI || 'mongodb://localhost:27017/iMarmaTherapy';
    await mongoose.connect(uri);
    console.log('✅ Connected to MongoDB');

    // Admin credentials
    const email = 'admin@imar.local';
    const name = 'Admin User';
    const password = 'Admin#123'; // Default password - CHANGE THIS IN PRODUCTION!
    const hashedPassword = await bcrypt.hash(password, 10);

    let admin = await User.findOne({ email: email.toLowerCase() });
    if (!admin) {
      admin = await User.create({
        name,
        email: email.toLowerCase(),
        password: hashedPassword,
        role: 'admin',
        isApproved: true, // Admin is always approved
        profilePhoto: null,
        documentPath: null,
      });
      console.log('✅ Created admin user:', admin.email);
    } else {
      // Update existing user to admin
      await User.updateOne(
        { _id: admin._id },
        { 
          $set: { 
            role: 'admin', 
            isApproved: true,
            password: hashedPassword // Reset password to default
          } 
        }
      );
      console.log('ℹ️ Updated existing user to admin:', admin.email);
    }

    console.log('\n📋 Admin Login Credentials:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('   Email:    admin@imar.local');
    console.log('   Password: Admin#123');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('\n⚠️  IMPORTANT: Change this password after first login!\n');

    process.exit(0);
  } catch (e) {
    console.error('❌ Error seeding admin:', e.message);
    process.exit(1);
  }
})();
