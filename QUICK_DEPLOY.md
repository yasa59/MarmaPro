# ⚡ Quick Vercel Deployment Guide

## 🚀 Deploy Everything to Vercel in 5 Steps

### Step 1: Set Up MongoDB Atlas (5 minutes)
1. Go to https://www.mongodb.com/cloud/atlas → Sign up
2. Create free cluster (M0)
3. **Database Access**: Create user (save username/password)
4. **Network Access**: Allow from anywhere (0.0.0.0/0)
5. **Connect** → Copy connection string:
   ```
   mongodb+srv://USERNAME:PASSWORD@cluster0.xxxxx.mongodb.net/iMarmaTherapy?retryWrites=true&w=majority
   ```

### Step 2: Push Code to GitHub
```bash
git init
git add .
git commit -m "Ready for Vercel"
git remote add origin https://github.com/YOUR_USERNAME/marmapro.git
git push -u origin main
```

### Step 3: Deploy on Vercel
1. Go to https://vercel.com → Sign up with GitHub
2. **New Project** → Import your repo
3. **Settings**:
   - Framework: **Other**
   - Root Directory: `.` (root)
   - Build Command: `cd client && npm install && npm run build`
   - Output Directory: `client/dist`

### Step 4: Add Environment Variables
In Vercel → **Settings** → **Environment Variables**:

**Backend:**
```
MONGO_URI=mongodb+srv://user:pass@cluster0.xxxxx.mongodb.net/iMarmaTherapy?retryWrites=true&w=majority
JWT_SECRET=your_super_secret_key_min_32_chars
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password
NODE_ENV=production
FRONTEND_URL=https://your-app.vercel.app
```

**Frontend:**
```
VITE_API_BASE=https://your-app.vercel.app
```

### Step 5: Deploy & Test
1. Click **Deploy**
2. Wait for build (2-3 minutes)
3. Test: `https://your-app.vercel.app/api/health`
4. Visit your app: `https://your-app.vercel.app`

---

## ⚠️ Important Notes

### Socket.IO Won't Work
- Real-time notifications won't work on Vercel serverless
- Use **Pusher** or **Ably** for real-time features
- Or deploy backend separately (Railway/Render) for Socket.IO

### File Uploads
- Don't use local filesystem (files will be deleted)
- Use **Vercel Blob Storage** or **Cloudinary** instead

### MongoDB
- Must use **MongoDB Atlas** (cloud database)
- Vercel doesn't host databases

---

## ✅ After Deployment

1. **Test Health**: `https://your-app.vercel.app/api/health`
2. **Test Login**: Try signing up/logging in
3. **Check Logs**: Vercel dashboard → Functions → Logs

---

## 🐛 Common Issues

**"Database connection failed"**
→ Check `MONGO_URI` in environment variables

**"CORS error"**
→ Verify `FRONTEND_URL` matches your Vercel domain

**"404 on API routes"**
→ Check `vercel.json` routes configuration

---

## 📚 Full Guide
See `VERCEL_FULL_DEPLOYMENT.md` for detailed instructions.

---

**Your app will be live at**: `https://your-app.vercel.app` 🎉


