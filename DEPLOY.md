# 🚀 Deploy Your Project to Vercel

## Quick Deployment Steps

### Step 1: Push Your Code to GitHub
```bash
# Make sure all changes are committed
git add .
git commit -m "Ready for deployment"
git push origin main
```

### Step 2: Deploy to Vercel

1. **Go to Vercel**: https://vercel.com
2. **Sign in** with GitHub
3. **Click "Add New"** → **"Project"**
4. **Import** your `MarmaPro` repository from GitHub
5. **Configure Project Settings:**

   **Root Directory:** `.` (leave empty or type a dot)
   
   **Framework Preset:** `Vite`
   
   **Build Command:** `cd client && npm install && npm run build`
   
   **Output Directory:** `client/dist`
   
   **Install Command:** `cd client && npm install`

6. **Click "Deploy"**

### Step 3: Set Environment Variables

After deployment starts, go to **Settings** → **Environment Variables** and add:

| Variable | Value | Environments |
|----------|-------|--------------|
| `MONGO_URI` | Your MongoDB connection string | All |
| `JWT_SECRET` | Any random secret string | All |
| `FRONTEND_URL` | Your Vercel URL (auto-set) | Production |
| `NODE_ENV` | `production` | Production |

**How to get MongoDB URI:**
- Go to https://www.mongodb.com/cloud/atlas
- Create free cluster
- Click "Connect" → "Connect your application"
- Copy the connection string
- Replace `<password>` with your password

### Step 4: Redeploy

After adding environment variables:
1. Go to **Deployments** tab
2. Click **⋯** (three dots) on latest deployment
3. Click **Redeploy**
4. Wait for build to complete

### Step 5: Test Your Deployment

1. Visit your Vercel URL (e.g., `https://your-app.vercel.app`)
2. Test login/signup
3. Check if API endpoints work

---

## ✅ Success Checklist

- [ ] Code pushed to GitHub
- [ ] Project imported to Vercel
- [ ] Build settings configured correctly
- [ ] Environment variables set
- [ ] Deployment successful
- [ ] Website loads correctly
- [ ] API endpoints work

---

## 🆘 Troubleshooting

### Build Fails
- Check **Root Directory** is `.` (not `/client`)
- Verify **Build Command** includes `cd client &&`
- Check build logs for specific errors

### API Not Working
- Verify `MONGO_URI` is set correctly
- Check API routes in Vercel Functions tab
- Look at function logs for errors

### Frontend Not Loading
- Check **Output Directory** is `client/dist`
- Verify build completed successfully
- Check browser console for errors

---

## 📝 Notes

- **Frontend + API** deploy together on Vercel
- **Socket.IO** won't work on Vercel (serverless limitation)
- **File uploads** may need external storage (Vercel Blob, AWS S3)
- **MongoDB Atlas** is recommended for database

---

**Your app should be live after these steps! 🎉**

