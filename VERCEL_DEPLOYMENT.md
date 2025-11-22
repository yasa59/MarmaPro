# 🚀 Complete Deployment Guide for MarmaPro

This guide covers deploying your entire system:
- **Frontend**: Vercel (React/Vite)
- **Backend**: Railway or Render (Node.js/Express with Socket.IO)
- **Database**: MongoDB Atlas (Cloud)

---

## 📋 Prerequisites

1. **GitHub Account** (for version control)
2. **Vercel Account** (free tier: https://vercel.com)
3. **Railway Account** (free tier: https://railway.app) OR **Render Account** (free tier: https://render.com)
4. **MongoDB Atlas Account** (free tier: https://www.mongodb.com/cloud/atlas)

---

## 🗄️ Step 1: Set Up MongoDB Atlas (Database)

### 1.1 Create MongoDB Atlas Account
1. Go to https://www.mongodb.com/cloud/atlas
2. Sign up for free
3. Create a new **Free Cluster** (M0 - Free tier)

### 1.2 Configure Database Access
1. Go to **Database Access** → **Add New Database User**
2. Create a user with username/password (save these!)
3. Set privileges: **Read and write to any database**

### 1.3 Configure Network Access
1. Go to **Network Access** → **Add IP Address**
2. Click **Allow Access from Anywhere** (0.0.0.0/0) for development
   - ⚠️ For production, restrict to your backend server IPs

### 1.4 Get Connection String
1. Go to **Database** → **Connect**
2. Choose **Connect your application**
3. Copy the connection string (looks like):
   ```
   mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```
4. Replace `<username>` and `<password>` with your actual credentials
5. Add database name at the end: `?retryWrites=true&w=majority&appName=iMarmaTherapy`
   - Final format: `mongodb+srv://user:pass@cluster0.xxxxx.mongodb.net/iMarmaTherapy?retryWrites=true&w=majority`

**Save this connection string!** You'll need it for the backend.

---

## 🖥️ Step 2: Deploy Backend (Railway - Recommended)

### Why Railway?
- ✅ Easy deployment
- ✅ Supports Socket.IO
- ✅ File uploads work
- ✅ Free tier available
- ✅ Automatic HTTPS

### 2.1 Prepare Backend for Deployment

1. **Update CORS in `server/server.js`** (already done, but verify):
   - The `allowedOrigins` should include your Vercel frontend URL

2. **Create `server/.env` file** (for local testing):
   ```env
   PORT=5000
   MONGO_URI=your_mongodb_atlas_connection_string
   JWT_SECRET=your_super_secret_jwt_key_min_32_chars
   EMAIL_USER=your_gmail@gmail.com
   EMAIL_PASS=your_app_specific_password
   NODE_ENV=production
   ```

### 2.2 Deploy to Railway

1. **Push code to GitHub**:
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin https://github.com/yourusername/marmapro.git
   git push -u origin main
   ```

2. **Go to Railway**:
   - Visit https://railway.app
   - Sign up with GitHub
   - Click **New Project** → **Deploy from GitHub repo**
   - Select your repository

3. **Configure Railway**:
   - **Root Directory**: Set to `server`
   - **Build Command**: Leave empty (or `npm install`)
   - **Start Command**: `npm start`
   - **Port**: Railway auto-assigns (use `PORT` env var)

4. **Add Environment Variables** in Railway:
   - Go to **Variables** tab
   - Add these:
     ```
     PORT=5000
     MONGO_URI=mongodb+srv://user:pass@cluster0.xxxxx.mongodb.net/iMarmaTherapy?retryWrites=true&w=majority
     JWT_SECRET=your_super_secret_jwt_key_min_32_chars_long
     EMAIL_USER=your_gmail@gmail.com
     EMAIL_PASS=your_gmail_app_password
     NODE_ENV=production
     ```

5. **Get Backend URL**:
   - Railway will generate a URL like: `https://your-app-name.up.railway.app`
   - Copy this URL!

### 2.3 Update Backend CORS for Production

Update `server/server.js` to include your Vercel frontend URL:

```javascript
const allowedOrigins = new Set([
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'https://your-frontend.vercel.app', // Add your Vercel URL here
]);
```

---

## 🎨 Step 3: Deploy Frontend (Vercel)

### 3.1 Prepare Frontend

1. **Create `client/.env.production`**:
   ```env
   VITE_API_BASE=https://your-backend.railway.app
   ```

2. **Update `client/src/api/axios.js`** (already handles this, but verify):
   - It will use `VITE_API_BASE` from environment

### 3.2 Deploy to Vercel

1. **Install Vercel CLI** (optional, or use web interface):
   ```bash
   npm i -g vercel
   ```

2. **Deploy via Web Interface**:
   - Go to https://vercel.com
   - Sign up with GitHub
   - Click **Add New Project**
   - Import your GitHub repository
   - **Root Directory**: Set to `client`
   - **Framework Preset**: Vite
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`

3. **Add Environment Variables** in Vercel:
   - Go to **Settings** → **Environment Variables**
   - Add:
     ```
     VITE_API_BASE=https://your-backend.railway.app
     ```

4. **Deploy**:
   - Click **Deploy**
   - Vercel will build and deploy your frontend
   - You'll get a URL like: `https://your-app.vercel.app`

### 3.3 Update Backend CORS with Final Frontend URL

Go back to Railway and update the CORS in `server/server.js` with your actual Vercel URL, then redeploy.

---

## 🔄 Step 4: Update Frontend API URL

After deployment, update your frontend environment variable in Vercel:
- Go to **Settings** → **Environment Variables**
- Update `VITE_API_BASE` to your Railway backend URL
- Redeploy

---

## ✅ Step 5: Verify Deployment

1. **Test Frontend**: Visit your Vercel URL
2. **Test Backend**: Visit `https://your-backend.railway.app/api/health`
3. **Test Database**: Try logging in/signing up

---

## 🐛 Troubleshooting

### Backend Issues:
- **Socket.IO not working**: Ensure CORS includes your frontend URL
- **File uploads failing**: Check Railway disk space (free tier has limits)
- **MongoDB connection errors**: Verify connection string and network access

### Frontend Issues:
- **API calls failing**: Check `VITE_API_BASE` environment variable
- **CORS errors**: Ensure backend CORS includes Vercel URL
- **Build errors**: Check Vercel build logs

---

## 📝 Alternative: Deploy Backend on Render

If Railway doesn't work, use Render:

1. Go to https://render.com
2. Create **New Web Service**
3. Connect GitHub repo
4. Settings:
   - **Root Directory**: `server`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
5. Add environment variables (same as Railway)
6. Render will give you a URL like: `https://your-app.onrender.com`

**Note**: Render free tier spins down after inactivity (15 min). First request may be slow.

---

## 🔐 Security Checklist

- [ ] Use strong `JWT_SECRET` (32+ characters)
- [ ] Restrict MongoDB network access to backend IPs in production
- [ ] Use environment variables (never commit secrets)
- [ ] Enable HTTPS (automatic on Vercel/Railway)
- [ ] Update CORS to only allow your frontend domain

---

## 📚 Additional Resources

- **Vercel Docs**: https://vercel.com/docs
- **Railway Docs**: https://docs.railway.app
- **MongoDB Atlas Docs**: https://docs.atlas.mongodb.com
- **Render Docs**: https://render.com/docs

---

## 🎉 You're Done!

Your app should now be live:
- **Frontend**: `https://your-app.vercel.app`
- **Backend**: `https://your-backend.railway.app`
- **Database**: MongoDB Atlas (cloud)

Happy deploying! 🚀


