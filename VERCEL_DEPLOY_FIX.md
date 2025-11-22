# 🔧 Fix Vercel Deployment Error

## Problem
```
npm error path /vercel/path0/client/package.json
npm error enoent Could not read package.json
```

## ✅ Solution

### Step 1: Update Vercel Project Settings

1. Go to your Vercel dashboard: https://vercel.com/dashboard
2. Select your **MarmaPro** project
3. Go to **Settings** → **General**
4. Check the **Root Directory** setting:
   - If it's set to `/client` or `/server`, change it to **`.` (root)** or leave it empty
   - The root directory should be the project root (where `vercel.json` is)

### Step 2: Update Build Settings

In **Settings** → **General** → **Build & Development Settings**:

- **Framework Preset**: `Vite` or `Other`
- **Root Directory**: `.` (or leave empty)
- **Build Command**: `cd client && npm install && npm run build`
- **Output Directory**: `client/dist`
- **Install Command**: `cd client && npm install`

### Step 3: Environment Variables

Make sure you have these environment variables set in **Settings** → **Environment Variables**:

- `MONGO_URI` - Your MongoDB connection string
- `JWT_SECRET` - Your JWT secret key
- `FRONTEND_URL` - Your frontend URL (e.g., `https://your-app.vercel.app`)
- Any other environment variables your app needs

### Step 4: Redeploy

After updating settings:

1. Go to **Deployments** tab
2. Click the **⋯** (three dots) on the latest deployment
3. Click **Redeploy**

OR

Push a new commit:
```bash
git add vercel.json
git commit -m "Fix Vercel build configuration"
git push
```

## Alternative: Deploy Frontend and Backend Separately

If the above doesn't work, deploy them separately:

### Frontend (Vercel)
1. Create a new Vercel project
2. Connect to your GitHub repo
3. **Root Directory**: `client`
4. **Framework**: `Vite`
5. **Build Command**: `npm run build`
6. **Output Directory**: `dist`

### Backend (Railway or Render)
- Use Railway (https://railway.app) or Render (https://render.com)
- Deploy the `server` folder
- Set environment variables
- Update `VITE_API_BASE` in frontend to point to backend URL

## ✅ After Fix

Your deployment should:
- ✅ Build the frontend successfully
- ✅ Show the contact section and feedback button
- ✅ Connect to your API endpoints

---

**Note**: The `vercel.json` file has been updated with the correct build commands. Make sure your Vercel dashboard settings match.

