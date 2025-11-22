# 🔐 Admin Login Guide

Complete instructions for logging into the admin dashboard.

---

## 📋 Step 1: Create Admin User (First Time Only)

Before you can login, you need to create the admin user in the database.

### Option A: Using npm script (Recommended)

1. **Navigate to server directory:**
   ```bash
   cd server
   ```

2. **Run the seed script:**
   ```bash
   npm run seed:admin
   ```

   Or directly:
   ```bash
   node seedAdmin.js
   ```

3. **You should see:**
   ```
   ✅ Connected to MongoDB
   ✅ Created admin user: admin@imar.local
   
   📋 Admin Login Credentials:
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      Email:    admin@imar.local
      Password: Admin#123
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   
   ⚠️  IMPORTANT: Change this password after first login!
   ```

### Option B: Manual Database Setup

If the script doesn't work, you can manually create the admin user in MongoDB:

```javascript
// In MongoDB shell or Compass
db.users.insertOne({
  name: "Admin User",
  email: "admin@imar.local",
  password: "$2b$10$..." // Hashed password for "Admin#123"
  role: "admin",
  isApproved: true
})
```

**Note:** You'll need to hash the password using bcrypt. The seed script does this automatically.

---

## 🔑 Step 2: Login Process

The system uses **Two-Factor Authentication (2FA)** with OTP (One-Time Password).

### Login Steps:

1. **Go to Login Page**
   - Navigate to: `http://localhost:5173/login` (or your deployed URL)

2. **Enter Admin Credentials:**
   ```
   Email:    admin@imar.local
   Password: Admin#123
   ```

3. **Click "Login"**
   - This will send an OTP to your email
   - **In development mode**, the OTP is also printed in the server console

4. **Check for OTP:**
   - **Development:** Check your server terminal/console
     ```
     🔐 OTP for admin@imar.local: 123456
     ```
   - **Production:** Check your email inbox (and spam folder)

5. **Enter OTP Code:**
   - Enter the 6-digit code in the OTP field
   - Click "Verify OTP"

6. **You're In!**
   - You'll be redirected to the Admin Dashboard
   - URL: `/admin/dashboard`

---

## 🎯 Default Admin Credentials

```
Email:    admin@imar.local
Password: Admin#123
```

**⚠️ SECURITY WARNING:**
- These are default credentials
- **Change the password immediately after first login!**
- Use a strong password in production

---

## 🔄 Resetting Admin Password

If you forgot the password or need to reset it:

### Method 1: Run Seed Script Again

```bash
cd server
npm run seed:admin
```

This will reset the password back to `Admin#123`

### Method 2: Update in Database

```javascript
// In MongoDB
const bcrypt = require('bcrypt');
const newPassword = await bcrypt.hash('YourNewPassword123!', 10);

db.users.updateOne(
  { email: "admin@imar.local" },
  { $set: { password: newPassword } }
);
```

---

## 🐛 Troubleshooting

### Problem: "Invalid credentials" error

**Solutions:**
- Make sure admin user exists (run seed script)
- Check email spelling: `admin@imar.local` (case-insensitive)
- Verify password: `Admin#123` (case-sensitive, includes special character)

### Problem: OTP not received

**Solutions:**
- **Development:** Check server console - OTP is printed there
- **Production:** Check email spam folder
- Click "Resend" button to get a new OTP
- OTP expires after 10 minutes

### Problem: "Doctor not approved" error

**Solutions:**
- This shouldn't happen for admin users
- Make sure user has `role: "admin"` in database
- Verify `isApproved: true` in user document

### Problem: Can't access admin routes

**Solutions:**
- Verify you're logged in as admin (check user role)
- Check browser console for errors
- Verify JWT token includes admin role
- Try logging out and logging back in

### Problem: Seed script fails

**Solutions:**
- Check MongoDB connection (MONGO_URI environment variable)
- Ensure MongoDB is running
- Check database permissions
- Verify all dependencies are installed (`npm install`)

---

## 📍 Admin Dashboard Features

Once logged in as admin, you can:

1. **Approve/Reject Doctors**
   - View pending doctor registrations
   - Approve or reject doctor accounts

2. **Manage Users**
   - View all users (patients and doctors)
   - Delete users if needed

3. **View System Statistics**
   - Total users
   - Pending approvals
   - System health

---

## 🔒 Security Best Practices

1. **Change Default Password**
   - Immediately after first login
   - Use strong password (12+ characters, mixed case, numbers, symbols)

2. **Use Environment Variables**
   - Don't hardcode credentials in code
   - Use `.env` file for sensitive data

3. **Enable Email OTP**
   - Configure email service (SMTP) for production
   - OTP should only be sent via email in production

4. **Regular Security Updates**
   - Keep dependencies updated
   - Monitor for security vulnerabilities

5. **Access Control**
   - Limit admin access to trusted personnel only
   - Use strong authentication methods

---

## 📝 Quick Reference

**Create Admin:**
```bash
cd server
npm run seed:admin
```

**Login URL:**
```
http://localhost:5173/login
```

**Admin Credentials:**
- Email: `admin@imar.local`
- Password: `Admin#123`

**OTP Location:**
- Development: Server console
- Production: Email inbox

**Admin Dashboard:**
```
http://localhost:5173/admin/dashboard
```

---

## ✅ Checklist

Before logging in:

- [ ] MongoDB is running and connected
- [ ] Admin user created (seed script run)
- [ ] Server is running
- [ ] Frontend is running
- [ ] Email service configured (for production)

---

**Need Help?** Check the troubleshooting section or review server logs for detailed error messages.

