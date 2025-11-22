# 📋 Exact Vercel Dashboard Settings

## 🎯 Quick Fix Steps

### Step 1: Open Vercel Dashboard
1. Go to: https://vercel.com/dashboard
2. Click on **MarmaPro** project

### Step 2: Settings → General

**Click on "Settings" tab → "General"**

Find these sections and set them EXACTLY as shown:

---

### 📁 Root Directory Section

**Current Value:** (Check what it says)

**Change To:**
- Click **Edit** (if there's an edit button)
- Set to: `.` (single dot) 
- OR **Clear/Delete** the value (make it empty)
- Click **Save**

**⚠️ IMPORTANT:** 
- ❌ DO NOT set to `/client`
- ❌ DO NOT set to `/server`
- ✅ Should be `.` or **empty**

---

### 🔨 Build & Development Settings Section

**Click "Edit" or "Override" button**

Set these values:

#### Framework Preset:
```
Vite
```
(If Vite not available, select "Other")

#### Build Command:
```
cd client && npm install && npm run build
```

#### Output Directory:
```
client/dist
```

#### Install Command:
```
cd client && npm install
```

#### Development Command:
```
cd client && npm run dev
```

**Click "Save"**

---

### Step 3: Environment Variables

**Click "Environment Variables" in left sidebar**

Make sure you have these (add if missing):

| Variable Name | Value | Environment |
|--------------|-------|-------------|
| `MONGO_URI` | `mongodb+srv://...` | Production, Preview, Development |
| `JWT_SECRET` | `your-secret-key` | Production, Preview, Development |
| `FRONTEND_URL` | `https://your-app.vercel.app` | Production |
| `NODE_ENV` | `production` | Production |

**Click "Save" for each variable**

---

### Step 4: Redeploy

1. Go to **"Deployments"** tab
2. Find the **latest deployment** (the one that failed)
3. Click the **⋯** (three dots) on the right
4. Click **"Redeploy"**
5. Select **"Use existing Build Cache"** (optional)
6. Click **"Redeploy"**

---

## 🔍 How to Verify Settings Are Correct

After updating settings, check:

1. **Root Directory** shows `.` or is empty
2. **Build Command** shows `cd client && npm install && npm run build`
3. **Output Directory** shows `client/dist`
4. **Framework** shows `Vite`

---

## 📸 What It Should Look Like

### Root Directory:
```
Root Directory: . (or empty)
```

### Build Settings:
```
Framework Preset: Vite
Build Command: cd client && npm install && npm run build
Output Directory: client/dist
Install Command: cd client && npm install
```

---

## ⚠️ Common Mistakes to Avoid

1. ❌ Setting Root Directory to `/client` → Will cause "package.json not found"
2. ❌ Leaving Build Command empty when Root Directory is wrong
3. ❌ Setting Output Directory to `dist` instead of `client/dist`
4. ❌ Not including `cd client &&` in build command

---

## ✅ Success Indicators

When it works, you'll see in build logs:
```
✓ Running "cd client && npm install && npm run build"
✓ Installing dependencies...
✓ Building for production...
✓ Build completed successfully
```

---

## 🆘 Still Not Working?

If it still fails:

1. **Check Build Logs:**
   - Go to **Deployments** → Click on failed deployment
   - Scroll through the logs
   - Look for the exact error message

2. **Try Deleting and Re-importing:**
   - Settings → General → Scroll to bottom
   - Delete project (it's safe, you can re-import)
   - Add New → Import from GitHub
   - Use the exact settings above

3. **Contact Support:**
   - Share the exact error from build logs
   - Share a screenshot of your settings

