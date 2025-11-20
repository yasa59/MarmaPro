# Admin Login Steps

## Step 1: Create Admin Account (First Time Only)

If you haven't created an admin account yet, run this command in the `server` folder:

```bash
npm run seed:admin
```

This will create an admin user with these credentials:
- **Email**: `admin@imar.local`
- **Password**: `Admin#123`

## Step 2: Start Your Server

Make sure MongoDB is running, then start the server:

```bash
npm run dev
```

## Step 3: Login to Admin Panel

1. **Open your browser** and go to: `http://localhost:5173/login`

2. **Enter admin credentials**:
   - Email: `admin@imar.local`
   - Password: `Admin#123`

3. **Click "Login"** - You'll receive an OTP

4. **Check the server console** - The OTP will be printed there:
   ```
   🔐 OTP for admin@imar.local: 123456
   ```

5. **Enter the 6-digit OTP** in the login form

6. **Click "Verify OTP"** - You'll be redirected to `/admin` dashboard

## Step 4: Access Admin Dashboard

After successful login, you'll be automatically redirected to:
- **URL**: `http://localhost:5173/admin`
- **Features**: 
  - View all doctors
  - View all users
  - Approve/reject doctor registrations
  - Manage system

## Troubleshooting

### "Invalid credentials"
- Make sure you ran `npm run seed:admin` first
- Check that MongoDB is connected
- Verify email is exactly: `admin@imar.local`

### "OTP expired"
- Request a new OTP by clicking "Resend"
- OTP expires after 10 minutes

### "Doctor not approved" error
- This shouldn't happen for admin role
- If it does, check the user's role in database is set to `'admin'`

### Can't see OTP
- Check the **server console** (terminal where `npm run dev` is running)
- The OTP is printed there: `🔐 OTP for admin@imar.local: XXXXXX`
- Email sending might fail in development (that's OK)

## Change Admin Password

After first login, you can change the password by:
1. Going to Profile Settings
2. Or updating directly in MongoDB
3. Or re-running `npm run seed:admin` (resets to default)

---

**Default Admin Credentials:**
- Email: `admin@imar.local`
- Password: `Admin#123`

⚠️ **Change this password in production!**

