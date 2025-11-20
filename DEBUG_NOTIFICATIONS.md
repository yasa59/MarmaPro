# How to Debug Notifications - Step by Step Guide

## 1. Check Browser Console (Client-Side Logs)

### Steps:
1. **Open your browser** (Chrome, Firefox, Edge, etc.)
2. **Open Developer Tools:**
   - **Chrome/Edge:** Press `F12` or `Ctrl+Shift+I` (Windows) / `Cmd+Option+I` (Mac)
   - **Firefox:** Press `F12` or `Ctrl+Shift+I` (Windows) / `Cmd+Option+I` (Mac)
   - **Or right-click** on the page → Select "Inspect" or "Inspect Element"

3. **Go to the Console tab:**
   - Click on the "Console" tab at the top of the Developer Tools window

4. **What to look for:**
   - Look for logs that start with:
     - `📬 Notifications loaded:` - Shows how many notifications were loaded
     - `📬 Unread notifications:` - Shows unread count
     - `❌ Failed to load notifications:` - Shows errors
     - `📋 Doctor alerts loaded:` - Shows alerts count

5. **Clear console and reload:**
   - Click the "Clear console" button (🚫 icon) or press `Ctrl+L`
   - Refresh the page (`F5` or `Ctrl+R`)
   - Navigate to the Notifications page
   - Watch for new logs appearing

---

## 2. Check Server Console (Backend Logs)

### Steps:
1. **Open your terminal/command prompt** where the server is running
2. **Look for these logs when a user sends a request:**
   ```
   📥 Received therapy request: { userId: '...', doctorId: '...', hasIntake: true }
   🧩 Created connection: { _id: '...', userId: '...', doctorId: '...', status: 'pending' }
   📋 Created session for therapy request: ...
   📬 Created notification for new request: { notificationId: '...', recipientId: '...', sessionId: '...' }
   📡 Emitted connect_request to doctor:...
   ✅ Therapy request processed successfully: { connectionId: '...', sessionId: '...' }
   ```

3. **If you see errors:**
   - `❌ Notification create failed:` - Notification creation failed
   - `⚠️ Socket.IO emission failed:` - Real-time update failed
   - `❌ POST /doctors/request error:` - Request processing failed

4. **To see all logs:**
   - Make sure your server is running (`npm start` or `node server.js`)
   - Keep the terminal window open and visible
   - Watch it while testing

---

## 3. Check Network Tab (API Calls)

### Steps:
1. **Open Developer Tools** (same as step 1)
2. **Go to the Network tab:**
   - Click on the "Network" tab at the top

3. **Clear existing requests:**
   - Click the "Clear" button (🚫 icon) or press `Ctrl+Shift+E`

4. **Navigate to Notifications page:**
   - Go to `/notifications` page in your app
   - Watch the Network tab for new requests

5. **Find the notifications API call:**
   - Look for a request named `notifications` or `notifications?limit=50`
   - Click on it to see details

6. **Check the Response:**
   - Click on the request
   - Go to the "Response" tab
   - You should see JSON like:
     ```json
     {
       "items": [
         {
           "_id": "...",
           "type": "connect_request",
           "message": "A patient sent a therapy request...",
           "read": false,
           "meta": {
             "connectionId": "...",
             "sessionId": "...",
             "userId": "..."
           },
           "createdAt": "..."
         }
       ]
     }
     ```

7. **Check Status Code:**
   - Look at the status column (should be `200` for success)
   - If it's `401`, `403`, or `500`, there's an authentication or server error

8. **Check Request Headers:**
   - Click on the request → "Headers" tab
   - Verify `Authorization: Bearer <token>` is present
   - This confirms you're logged in

---

## 4. Quick Test Checklist

### As a User (Patient):
1. ✅ Login as a user
2. ✅ Go to a doctor's profile
3. ✅ Click "Request Therapy"
4. ✅ Fill out the intake form
5. ✅ Click "Save and Send Request"
6. ✅ Check browser console for success message

### As a Doctor:
1. ✅ Login as a doctor
2. ✅ Open browser console (`F12`)
3. ✅ Go to `/notifications` page
4. ✅ Check console for: `📬 Notifications loaded: { role: 'doctor', count: X }`
5. ✅ Check Network tab for `/notifications` request
6. ✅ Verify response contains notification items
7. ✅ Check server console for notification creation logs

---

## 5. Common Issues and Solutions

### Issue: No notifications in browser console
**Solution:** 
- Make sure you're on the `/notifications` page
- Check if the page loaded (look for loading state)
- Verify you're logged in as a doctor

### Issue: Network request returns empty array `{ items: [] }`
**Solution:**
- Check server console - was notification created?
- Verify the `recipientId` in notification matches doctor's `userId`
- Check if notification was created with correct `type: 'connect_request'`

### Issue: Network request returns 401 or 403
**Solution:**
- You're not authenticated - logout and login again
- Check if token is expired
- Verify token is being sent in request headers

### Issue: Server console shows notification created but browser doesn't show it
**Solution:**
- Check if `recipientId` matches doctor's `userId` exactly
- Verify notification `type` is `'connect_request'`
- Check if notification was marked as read (should be `read: false`)
- Try refreshing the notifications page

---

## 6. Screenshots Guide

### Browser Console:
- Should show: `📬 Notifications loaded: { role: 'doctor', count: 1, items: [...] }`

### Network Tab:
- Request: `GET /api/notifications?limit=50`
- Status: `200 OK`
- Response: JSON with `items` array containing notifications

### Server Console:
- Should show: `📬 Created notification for new request: { notificationId: '...', recipientId: '...', sessionId: '...' }`

---

## Need More Help?

If you still see issues, share:
1. Screenshot of browser console
2. Screenshot of Network tab (the `/notifications` request)
3. Screenshot of server console logs
4. What you expected vs what you see

