# 🔧 Fix Railway Deployment Error

## Problem
```
Error creating build plan with Railpack
```

## ✅ Solution: Add Railway Configuration

I've created these files for you:
- `server/railway.json` - Railway configuration
- `server/Procfile` - Process file for Railway

## 📝 Steps to Fix

### Step 1: Push the New Files
```bash
cd ..
git add server/railway.json server/Procfile
git commit -m "Add Railway configuration"
git push
```

### Step 2: Configure Railway Project

1. **Go to Railway Dashboard**
2. **Select your project**
3. **Go to Settings** → **Service**
4. **Set these values**:

   **Root Directory**: `server`
   
   **Build Command**: `npm install` (or leave empty)
   
   **Start Command**: `npm start`

### Step 3: Add Environment Variables

In Railway → **Variables** tab, add:

```env
PORT=5000
MONGO_URI=mongodb+srv://user:pass@cluster0.xxxxx.mongodb.net/iMarmaTherapy?retryWrites=true&w=majority
JWT_SECRET=your_super_secret_jwt_key_min_32_chars_long
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_gmail_app_password
NODE_ENV=production
```

### Step 4: Redeploy

1. Click **Deploy** or **Redeploy**
2. Wait for build to complete

## ✅ Alternative: Manual Configuration

If Railway still doesn't detect:

1. **Delete the project** in Railway
2. **Create new project** → **Deploy from GitHub**
3. **Select your repo**
4. **Before deploying**, click **Settings**:
   - **Root Directory**: `server`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
5. **Add environment variables** (see above)
6. **Deploy**

## 🐛 Still Not Working?

### Check 1: Verify package.json
Make sure `server/package.json` has:
```json
{
  "scripts": {
    "start": "node server.js"
  }
}
```

### Check 2: Check Railway Logs
- Go to Railway dashboard
- Click on your service
- Check **Deployments** → **View Logs**
- Look for specific error messages

### Check 3: Try Nixpacks Explicitly
In Railway settings, try:
- **Builder**: `NIXPACKS`
- **Build Command**: `npm install`
- **Start Command**: `npm start`

## 📚 Railway Documentation
- https://docs.railway.app/deploy/builds

---

**After fixing, your backend will be live on Railway!** 🚀


