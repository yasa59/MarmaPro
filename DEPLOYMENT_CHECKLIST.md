# ✅ Deployment Checklist

Use this checklist to ensure everything is set up correctly before and after deployment.

## 📋 Pre-Deployment

### Database (MongoDB Atlas)
- [ ] Created MongoDB Atlas account
- [ ] Created free cluster (M0)
- [ ] Created database user with read/write permissions
- [ ] Added network access (0.0.0.0/0 for development, or specific IPs for production)
- [ ] Copied connection string and replaced `<username>` and `<password>`
- [ ] Tested connection string locally

### Backend Preparation
- [ ] Code is pushed to GitHub
- [ ] `server/.env` file is NOT committed (should be in `.gitignore`)
- [ ] All environment variables are documented
- [ ] CORS origins include production frontend URL
- [ ] Socket.IO configuration is correct
- [ ] File upload directory (`server/uploads`) is handled (Railway/Render may need volume)

### Frontend Preparation
- [ ] Code is pushed to GitHub
- [ ] `client/.env.production` has correct `VITE_API_BASE`
- [ ] Environment variables are documented
- [ ] Build command works locally (`npm run build`)
- [ ] No hardcoded API URLs in code

---

## 🚀 Deployment Steps

### Step 1: MongoDB Atlas
- [ ] Cluster is running
- [ ] Connection string is ready
- [ ] Network access is configured

### Step 2: Backend (Railway/Render)
- [ ] Created account
- [ ] Connected GitHub repository
- [ ] Set root directory to `server`
- [ ] Set build command (if needed)
- [ ] Set start command: `npm start`
- [ ] Added all environment variables:
  - [ ] `PORT`
  - [ ] `MONGO_URI`
  - [ ] `JWT_SECRET`
  - [ ] `EMAIL_USER`
  - [ ] `EMAIL_PASS`
  - [ ] `NODE_ENV=production`
- [ ] Deployed successfully
- [ ] Got backend URL (e.g., `https://xxx.railway.app`)
- [ ] Tested health endpoint: `https://xxx.railway.app/api/health`

### Step 3: Frontend (Vercel)
- [ ] Created account
- [ ] Connected GitHub repository
- [ ] Set root directory to `client`
- [ ] Set framework to Vite
- [ ] Set build command: `npm run build`
- [ ] Set output directory: `dist`
- [ ] Added environment variable: `VITE_API_BASE=https://xxx.railway.app`
- [ ] Deployed successfully
- [ ] Got frontend URL (e.g., `https://xxx.vercel.app`)

### Step 4: Update CORS
- [ ] Updated `server/server.js` with Vercel frontend URL
- [ ] Redeployed backend
- [ ] Verified CORS allows frontend origin

---

## ✅ Post-Deployment Testing

### Backend Tests
- [ ] Health check: `GET https://backend-url/api/health` returns `{"ok": true}`
- [ ] MongoDB connection works (check backend logs)
- [ ] Socket.IO connection works (test from frontend)

### Frontend Tests
- [ ] Frontend loads without errors
- [ ] Can navigate between pages
- [ ] API calls work (check browser console)
- [ ] Login works
- [ ] Signup works
- [ ] File uploads work (if applicable)
- [ ] Real-time features work (notifications, Socket.IO)

### Integration Tests
- [ ] User can sign up
- [ ] User can log in
- [ ] User can access protected routes
- [ ] Doctor can see alerts/notifications
- [ ] Patient can send therapy requests
- [ ] Notifications work in real-time
- [ ] File uploads work
- [ ] Profile photo upload works

---

## 🔧 Common Issues & Fixes

### Issue: CORS Errors
**Fix**: 
- Check backend CORS includes frontend URL
- Verify `allowedOrigins` in `server/server.js`
- Check browser console for exact error

### Issue: API Calls Fail (404)
**Fix**:
- Verify `VITE_API_BASE` in Vercel environment variables
- Check backend is running (Railway/Render dashboard)
- Verify API routes are correct

### Issue: MongoDB Connection Fails
**Fix**:
- Verify connection string format
- Check MongoDB Atlas network access (should allow backend IP)
- Verify username/password are correct
- Check backend logs for specific error

### Issue: Socket.IO Not Working
**Fix**:
- Verify CORS includes frontend URL
- Check Socket.IO client connects (browser console)
- Verify JWT token is sent in Socket.IO handshake
- Check backend logs for Socket.IO errors

### Issue: File Uploads Fail
**Fix**:
- Check backend has write permissions
- Verify upload directory exists (`server/uploads`)
- Check file size limits
- Verify Multer configuration

### Issue: Environment Variables Not Working
**Fix**:
- Verify variables are set in deployment platform
- Check variable names match exactly (case-sensitive)
- Redeploy after adding/changing variables
- Check build logs for errors

---

## 📝 Environment Variables Reference

### Backend (Railway/Render)
```env
PORT=5000
MONGO_URI=mongodb+srv://user:pass@cluster0.xxxxx.mongodb.net/iMarmaTherapy?retryWrites=true&w=majority
JWT_SECRET=your_super_secret_jwt_key_min_32_chars_long
EMAIL_USER=your_gmail@gmail.com
EMAIL_PASS=your_gmail_app_password
NODE_ENV=production
```

### Frontend (Vercel)
```env
VITE_API_BASE=https://your-backend.railway.app
```

---

## 🎯 Final Verification

Before marking deployment as complete:

- [ ] All tests pass
- [ ] No console errors in browser
- [ ] No errors in backend logs
- [ ] Database connection is stable
- [ ] Real-time features work
- [ ] File uploads work
- [ ] Authentication works
- [ ] All user flows work end-to-end

---

## 📞 Support

If you encounter issues:
1. Check deployment platform logs (Railway/Render/Vercel)
2. Check browser console for frontend errors
3. Check backend logs for API errors
4. Verify all environment variables are set correctly
5. Test locally first to isolate issues

---

**Deployment Date**: _______________
**Frontend URL**: _______________
**Backend URL**: _______________
**Status**: ⬜ Not Started | ⬜ In Progress | ⬜ Complete


