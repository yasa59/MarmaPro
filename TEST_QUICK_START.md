# Quick Testing Guide

## 🚀 Quick Start

### 1. Start Servers

**Terminal 1 (Backend):**
```bash
cd server
npm run dev
```

**Terminal 2 (Frontend):**
```bash
cd client
npm run dev
```

### 2. Test in Browser

1. **Open http://localhost:5173**

2. **Login as User:**
   - Go to `/user/doctors`
   - Click on a doctor
   - Click "Request Therapy"

3. **Login as Doctor (different browser/incognito):**
   - Go to `/doctor/therapy-requests`
   - Click "Accept"

4. **As User:**
   - Go to `/user/sessions`
   - Click on the session
   - Click "Connect" button
   - ✅ Button should change to "Ready"

5. **As Doctor:**
   - Go to `/doctor/session/{id}`
   - ✅ Should see "Patient: Ready" (real-time!)
   - Click "Connect" button
   - ✅ Both should see "🎉 Connected!"

## 🔍 Check Socket.IO

**Open Browser Console (F12):**
- Look for: `✅ Socket connected`
- Check Network tab → WS (WebSocket) → Should see connection

**Check Server Logs:**
- Look for: `📡 Emitted session:connect to user:{userId}`

## ✅ Success Indicators

- [ ] Connect button appears after session accepted
- [ ] Clicking Connect updates status in real-time
- [ ] Other party receives notification immediately
- [ ] Both see "Connected!" when both ready
- [ ] Socket.IO connection established
- [ ] No console errors

## 🐛 Quick Troubleshooting

**Connect button not showing?**
- Check session status is "accepted"
- Check browser console for errors

**Socket not connecting?**
- Check server is running on port 5000
- Check JWT token is valid
- Check CORS configuration

**Notifications not working?**
- Check Socket.IO is connected
- Check server logs for errors
- Verify user is in correct room

