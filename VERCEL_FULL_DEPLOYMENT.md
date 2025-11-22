# 🚀 Complete Vercel Deployment Guide (Frontend + Backend)

This guide covers deploying **both frontend and backend** on Vercel, with MongoDB Atlas for the database.

---

## ⚠️ Important Limitations

**Socket.IO Real-time Features:**
- ❌ Socket.IO **will NOT work** on Vercel serverless functions
- Serverless functions are stateless and short-lived
- WebSocket connections require persistent servers
- **Solution**: Use a separate service for real-time features (Pusher, Ably, or a separate server)

**File Uploads:**
- ⚠️ Vercel has limited file system access (`/tmp` only)
- Files in `/tmp` are temporary and may be deleted
- **Solution**: Use Vercel Blob Storage, AWS S3, or Cloudinary for file storage

---

## 📋 Prerequisites

1. **GitHub Account** (for version control)
2. **Vercel Account** (free tier: https://vercel.com)
3. **MongoDB Atlas Account** (free tier: https://www.mongodb.com/cloud/atlas)

---

## 🗄️ Step 1: Set Up MongoDB Atlas

### 1.1 Create Account & Cluster
1. Go to https://www.mongodb.com/cloud/atlas
2. Sign up for free
3. Create a new **Free Cluster** (M0)

### 1.2 Configure Database Access
1. **Database Access** → **Add New Database User**
2. Create username/password (save these!)
3. Set privileges: **Read and write to any database**

### 1.3 Configure Network Access
1. **Network Access** → **Add IP Address**
2. Click **Allow Access from Anywhere** (0.0.0.0/0)

### 1.4 Get Connection String
1. **Database** → **Connect** → **Connect your application**
2. Copy connection string:
   ```
   mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```
3. Replace `<username>` and `<password>`
4. Add database name: `...mongodb.net/iMarmaTherapy?retryWrites=true&w=majority`

**Save this connection string!**

---

## 🏗️ Step 2: Prepare Project Structure

Your project should look like this:
```
MarmaPro/
├── api/
│   └── index.js          # Vercel serverless function entry
├── client/               # Frontend (React/Vite)
│   ├── src/
│   ├── package.json
│   └── vercel.json
├── server/               # Backend code (routes, models, etc.)
│   ├── routes/
│   ├── models/
│   └── ...
├── vercel.json           # Root Vercel config
└── .gitignore
```

### 2.1 Update Routes to Work Without Socket.IO

Since Socket.IO won't work, you need to update routes that use `app.get('io')`:

**Option A**: Make Socket.IO optional (graceful degradation)
**Option B**: Remove Socket.IO dependencies (if not critical)

For now, the code will work but real-time features won't function.

---

## 🚀 Step 3: Deploy to Vercel

### 3.1 Push Code to GitHub

```bash
# Initialize git (if not already)
git init
git add .
git commit -m "Prepare for Vercel deployment"

# Create GitHub repo and push
git remote add origin https://github.com/yourusername/marmapro.git
git push -u origin main
```

### 3.2 Deploy on Vercel

1. **Go to Vercel**: https://vercel.com
2. **Sign up/Login** with GitHub
3. **Add New Project** → **Import Git Repository**
4. Select your repository
5. **Configure Project**:
   - **Framework Preset**: Other
   - **Root Directory**: `.` (root)
   - **Build Command**: `cd client && npm install && npm run build`
   - **Output Directory**: `client/dist`
   - **Install Command**: Leave default

### 3.3 Add Environment Variables

In Vercel project settings → **Environment Variables**, add:

```env
# MongoDB
MONGO_URI=mongodb+srv://user:pass@cluster0.xxxxx.mongodb.net/iMarmaTherapy?retryWrites=true&w=majority

# JWT
JWT_SECRET=your_super_secret_jwt_key_min_32_chars_long

# Email (optional)
EMAIL_USER=your_gmail@gmail.com
EMAIL_PASS=your_gmail_app_password

# Frontend URL (will be auto-set by Vercel, but you can override)
FRONTEND_URL=https://your-app.vercel.app

# Node Environment
NODE_ENV=production
```

**For Frontend** (also add these):
```env
VITE_API_BASE=https://your-app.vercel.app
```

### 3.4 Deploy

Click **Deploy** and wait for build to complete.

---

## 🔧 Step 4: Update Code for Vercel Compatibility

### 4.1 Update Routes That Use Socket.IO

Routes that use `req.app.get('io')` need to handle the case where `io` doesn't exist:

```javascript
// Example: In routes/notifications.js or similar
const io = req.app.get('io');
if (io) {
  // Socket.IO code here
  io.emit('notification', data);
} else {
  // Fallback: notifications will still be saved to DB
  console.log('Socket.IO not available (serverless mode)');
}
```

### 4.2 File Upload Storage

For file uploads, consider using **Vercel Blob Storage**:

1. Install: `npm install @vercel/blob`
2. Update upload routes to use Blob Storage instead of local filesystem

**Or use Cloudinary** (free tier available):
1. Sign up at https://cloudinary.com
2. Install: `npm install cloudinary`
3. Update upload routes

---

## 📝 Step 5: Update Frontend API Configuration

The frontend should automatically detect the API base URL, but verify:

1. **Check `client/src/api/axios.js`** - it should use `VITE_API_BASE` or auto-detect
2. **Set environment variable** in Vercel:
   - `VITE_API_BASE=https://your-app.vercel.app`

---

## ✅ Step 6: Verify Deployment

### Test Backend:
```bash
# Health check
curl https://your-app.vercel.app/api/health

# Should return: {"ok": true, "db": "connected"}
```

### Test Frontend:
1. Visit: `https://your-app.vercel.app`
2. Try logging in/signing up
3. Check browser console for errors

---

## 🐛 Troubleshooting

### Issue: "Database connection failed"
**Fix**:
- Verify `MONGO_URI` is correct in Vercel environment variables
- Check MongoDB Atlas network access allows all IPs (0.0.0.0/0)
- Verify username/password in connection string

### Issue: "Socket.IO not working"
**Expected**: Socket.IO doesn't work on Vercel serverless
**Fix**: 
- Use alternative real-time service (Pusher, Ably)
- Or deploy backend separately (Railway/Render) for Socket.IO

### Issue: "File uploads not working"
**Fix**:
- Use Vercel Blob Storage or Cloudinary
- Don't rely on local filesystem (`/tmp` is temporary)

### Issue: "CORS errors"
**Fix**:
- Verify `FRONTEND_URL` matches your Vercel domain
- Check `allowedOrigins` in `api/index.js`

### Issue: "Routes return 404"
**Fix**:
- Verify `vercel.json` routes configuration
- Check that `api/index.js` exports the Express app correctly

---

## 🔄 Alternative: Hybrid Deployment

If you need Socket.IO and file uploads:

1. **Frontend**: Vercel ✅
2. **Backend API**: Vercel ✅ (for REST endpoints)
3. **Backend Socket.IO**: Railway/Render (separate server for real-time)
4. **File Storage**: Vercel Blob or Cloudinary ✅
5. **Database**: MongoDB Atlas ✅

---

## 📚 File Storage Solutions

### Option 1: Vercel Blob Storage
```javascript
import { put } from '@vercel/blob';

const blob = await put(file.name, file, {
  access: 'public',
});
// blob.url is the public URL
```

### Option 2: Cloudinary
```javascript
const cloudinary = require('cloudinary').v2;

const result = await cloudinary.uploader.upload(file.path);
// result.secure_url is the public URL
```

---

## 🎯 Production Checklist

- [ ] MongoDB Atlas cluster is running
- [ ] Environment variables are set in Vercel
- [ ] Frontend builds successfully
- [ ] Backend API routes work (test `/api/health`)
- [ ] Authentication works (login/signup)
- [ ] File uploads use external storage (not local filesystem)
- [ ] CORS is configured correctly
- [ ] Socket.IO alternatives are set up (if needed)
- [ ] Error handling is in place for serverless limitations

---

## 🎉 You're Done!

Your app should now be live on Vercel:
- **Frontend**: `https://your-app.vercel.app`
- **Backend API**: `https://your-app.vercel.app/api/*`
- **Database**: MongoDB Atlas (cloud)

**Note**: Real-time features (Socket.IO) won't work. Consider using Pusher or Ably for real-time notifications if needed.

---

## 📞 Next Steps

1. **Set up file storage** (Vercel Blob or Cloudinary)
2. **Add real-time service** (if needed): Pusher, Ably, or separate server
3. **Monitor logs** in Vercel dashboard
4. **Set up custom domain** (optional)

Happy deploying! 🚀


