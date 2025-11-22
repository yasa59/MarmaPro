# 🔧 Step-by-Step: Fix Vercel Build Error

## Problem
```
Command "npm install" exited with 254
npm error path /vercel/path0/client/package.json
```

## ✅ Solution: Update Vercel Dashboard Settings

### Step 1: Open Your Vercel Project
1. Go to https://vercel.com/dashboard
2. Sign in to your account
3. Click on your **MarmaPro** project

### Step 2: Go to Project Settings
1. Click on the **Settings** tab (top navigation)
2. Click on **General** (left sidebar)

### Step 3: Check Root Directory
1. Scroll down to **Root Directory** section
2. **IMPORTANT**: Make sure it says:
   - Either **`.`** (a single dot)
   - Or **Empty/Not Set**
   - **DO NOT** set it to `/client` or `/server`

If it's set incorrectly:
- Click **Edit**
- Change it to `.` (single dot) or clear it
- Click **Save**

### Step 4: Update Build Settings
1. Still in **Settings** → **General**
2. Scroll to **Build & Development Settings**
3. Click **Edit** or **Override**

Set these values:

**Framework Preset:**
- Select: **Vite** (or **Other** if Vite is not available)

**Build Command:**
- Enter: `cd client && npm install && npm run build`
- OR leave it empty (to use vercel.json)

**Output Directory:**
- Enter: `client/dist`

**Install Command:**
- Enter: `cd client && npm install`
- OR leave it empty (to use vercel.json)

**Development Command:**
- Enter: `cd client && npm run dev`
- OR leave it empty

4. Click **Save**

### Step 5: Check Environment Variables
1. In **Settings**, click **Environment Variables** (left sidebar)
2. Make sure you have:
   - `MONGO_URI` - Your MongoDB connection string
   - `JWT_SECRET` - Your JWT secret
   - `FRONTEND_URL` - Your Vercel URL (e.g., `https://your-app.vercel.app`)
   - `NODE_ENV` - Set to `production`

### Step 6: Redeploy
1. Go to **Deployments** tab (top navigation)
2. Find the latest failed deployment
3. Click the **⋯** (three dots) menu
4. Click **Redeploy**
5. Wait for the build to complete

---

## Alternative: If Settings Don't Work

### Option A: Delete and Re-import Project
1. Go to **Settings** → **General**
2. Scroll to bottom
3. Click **Delete Project** (don't worry, you can re-import)
4. Go to **Add New** → **Project**
5. Import from GitHub
6. Select **MarmaPro** repository
7. **Root Directory**: Leave empty or set to `.`
8. **Framework**: Vite
9. **Build Command**: `cd client && npm install && npm run build`
10. **Output Directory**: `client/dist`
11. Click **Deploy**

### Option B: Use Separate Deployments (Recommended for Complex Apps)

**Deploy Frontend Only on Vercel:**
1. Create new Vercel project
2. Connect to GitHub
3. **Root Directory**: `client`
4. **Framework**: Vite
5. **Build Command**: `npm run build` (no `cd client` needed)
6. **Output Directory**: `dist`
7. Deploy

**Deploy Backend on Railway:**
1. Go to https://railway.app
2. Sign up/login
3. **New Project** → **Deploy from GitHub**
4. Select **MarmaPro** repository
5. **Root Directory**: `server`
6. Add environment variables
7. Deploy

Then update frontend `VITE_API_BASE` to point to Railway backend URL.

---

## Quick Checklist

Before redeploying, verify:
- ✅ Root Directory is `.` or empty (NOT `/client`)
- ✅ Build Command includes `cd client &&`
- ✅ Output Directory is `client/dist`
- ✅ Framework is set to Vite
- ✅ Environment variables are set
- ✅ vercel.json is committed to git

---

## Still Having Issues?

If the build still fails:
1. Check the **Build Logs** in Vercel
2. Look for the exact error message
3. Share the error with me for further help

Common issues:
- **"Cannot find package.json"** → Root Directory is wrong
- **"Module not found"** → Dependencies issue, check package.json
- **"Build failed"** → Check build logs for specific error

