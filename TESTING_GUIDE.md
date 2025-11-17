# Testing Guide: Connect Button Feature

This guide will help you test the new doctor-user interaction feature with Connect button and real-time notifications.

## Prerequisites

1. **MongoDB** must be running
   ```bash
   # Check if MongoDB is running
   mongosh
   # or
   mongo
   ```

2. **Node.js** installed (v16+)

3. **Environment Variables** set up in `server/.env`:
   ```env
   MONGO_URI=mongodb://localhost:27017/iMarmaTherapy
   JWT_SECRET=your-secret-key
   PORT=5000
   ```

## Step 1: Start the Servers

### Terminal 1: Start Backend Server
```bash
cd server
npm install  # if not already done
npm run dev  # or npm start
```

You should see:
```
✅ MongoDB connected
🚀 API on http://localhost:5000
```

### Terminal 2: Start Frontend Client
```bash
cd client
npm install  # if not already done
npm run dev
```

You should see:
```
VITE v5.x.x  ready in xxx ms
➜  Local:   http://localhost:5173/
```

## Step 2: Create Test Accounts

### Option A: Use Existing Accounts
If you already have user and doctor accounts, skip to Step 3.

### Option B: Create New Accounts

1. **Create a Doctor Account:**
   - Go to http://localhost:5173/signup
   - Register as a doctor
   - Wait for admin approval (or use seed script)

2. **Create a User/Patient Account:**
   - Go to http://localhost:5173/signup
   - Register as a user

3. **Or Use Seed Scripts:**
   ```bash
   cd server
   npm run seed:admin
   npm run seed:doctor
   ```

## Step 3: Test the Complete Flow

### Test Scenario: User Requests Therapy → Doctor Accepts → Both Connect

#### Step 3.1: User Requests Therapy

1. **Login as User:**
   - Go to http://localhost:5173/login
   - Login with user credentials
   - Navigate to doctor list (e.g., `/user/doctors`)

2. **Select a Doctor:**
   - Click on a doctor's profile
   - Click "Request Therapy" button
   - You should see: "Request sent to the doctor."

3. **Check User's Sessions:**
   - Go to `/user/sessions`
   - You should see a new session with status "pending"

#### Step 3.2: Doctor Accepts Request

1. **Login as Doctor (in a different browser or incognito):**
   - Open http://localhost:5173/login in another browser/incognito
   - Login with doctor credentials
   - Go to `/doctor/therapy-requests` or `/doctor/alerts`

2. **Accept the Request:**
   - You should see the therapy request from the user
   - Click "Accept" button
   - Session status should change to "accepted"

3. **Check Doctor's Session:**
   - Go to `/doctor/session/{sessionId}` (click on the session)
   - You should see the session detail page

#### Step 3.3: User Submits Intake Form (Optional)

1. **As User:**
   - Go to `/user/session/{sessionId}`
   - You should see an "Intake Form"
   - Fill in the form (name, age, gender, etc.)
   - Click "Submit"
   - Status should change to "intake_submitted"

#### Step 3.4: Doctor Sends Instructions (Optional)

1. **As Doctor:**
   - Go to `/doctor/session/{sessionId}`
   - You should see the intake form (read-only)
   - Fill in "Instructions to patient"
   - Add medicines if needed
   - Click "Save instructions + plan"
   - Status should change to "responded"

#### Step 3.5: Test Connect Button - User Side

1. **As User:**
   - Go to `/user/session/{sessionId}`
   - You should see a **"Connect"** button in the header
   - Click the "Connect" button
   - Button should change to "✓ Ready (Click to Cancel)"
   - Status indicator should show "You: Ready"
   - Status should show "Doctor: Waiting..."

2. **Check Browser Console:**
   - Open Developer Tools (F12)
   - Go to Console tab
   - You should see: `✅ Socket connected`
   - Check Network tab → WS (WebSocket) → Should see connection

#### Step 3.6: Test Connect Button - Doctor Side

1. **As Doctor:**
   - Go to `/doctor/session/{sessionId}`
   - You should see a **"Connect"** button
   - You should see notification: "✅ Patient is ready to connect!" (if Socket.IO is working)
   - Status indicator should show "Patient: Ready"
   - Click the "Connect" button
   - Button should change to "✓ Ready (Click to Cancel)"
   - Status should show "🎉 Connected!"

2. **Check Real-time Update:**
   - As User, you should see: "🎉 Both parties are ready! You can now start the session."
   - Status should show "🎉 Connected!" on both sides

#### Step 3.7: Test Disconnect

1. **As User or Doctor:**
   - Click the "Connect" button again (when it shows "✓ Ready")
   - Status should change back to "Not Ready"
   - Other party should see the status update

## Step 4: Test Socket.IO Real-time Notifications

### Check Server Logs

In your server terminal, you should see:
```
📡 Emitted session:connect to user:{userId} for session {sessionId}
```

### Check Browser Console

1. **Open Developer Tools (F12)**
2. **Go to Console tab**
3. **Look for:**
   - `✅ Socket connected`
   - Socket events being received

4. **Go to Network tab**
5. **Filter by WS (WebSocket)**
6. **You should see:**
   - WebSocket connection established
   - Messages being sent/received

### Test Real-time Updates

1. **Open two browsers:**
   - Browser 1: User session
   - Browser 2: Doctor session

2. **Click Connect in Browser 1:**
   - Browser 2 should immediately show "Patient: Ready" (no page refresh needed)

3. **Click Connect in Browser 2:**
   - Browser 1 should immediately show "🎉 Connected!" (no page refresh needed)

## Step 5: Verify Database

### Check Sessions Collection

```bash
mongosh
use iMarmaTherapy
db.sessions.find().pretty()
```

You should see:
```json
{
  "_id": "...",
  "userId": "...",
  "doctorId": "...",
  "status": "accepted",
  "connectionState": {
    "userReady": true,
    "doctorReady": true,
    "connectedAt": ISODate("...")
  },
  ...
}
```

### Check Notifications Collection

```bash
db.notifications.find().pretty()
```

You should see notifications with types:
- `connect_request`
- `connect_accepted`
- `user_connect`
- `doctor_connect`

## Step 6: Troubleshooting

### Issue: Connect Button Not Appearing

**Check:**
1. Session status must be "accepted", "intake_submitted", or "responded"
2. Check browser console for errors
3. Verify session data: `GET /api/sessions/{id}`

### Issue: Socket.IO Not Connecting

**Check:**
1. Server is running on port 5000
2. Client is connecting to correct URL (check `client/src/lib/socket.js`)
3. JWT token is valid
4. CORS is configured correctly
5. Check browser console for WebSocket errors

### Issue: Notifications Not Received

**Check:**
1. Socket.IO is connected (check browser console)
2. User is in correct room: `user:{userId}`
3. Server logs show: `📡 Emitted session:connect to user:{userId}`
4. Check Notification model has correct types

### Issue: Connection State Not Updating

**Check:**
1. Database has `connectionState` field
2. API endpoint returns `connectionState`
3. Frontend is reading `connectionState` from response
4. Socket.IO events are being received

## Step 7: API Testing (Optional)

### Test Connect Endpoint

```bash
# Get session ID first
curl -X GET http://localhost:5000/api/sessions/{sessionId} \
  -H "Authorization: Bearer {token}"

# Click Connect
curl -X POST http://localhost:5000/api/sessions/{sessionId}/connect \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json"
```

Expected Response:
```json
{
  "ok": true,
  "connectionState": {
    "userReady": true,
    "doctorReady": false,
    "connectedAt": null
  },
  "message": "You are ready. Waiting for doctor..."
}
```

## Step 8: Visual Testing Checklist

- [ ] Connect button appears after session is accepted
- [ ] Connect button changes to "Ready" when clicked
- [ ] Status indicators show correct state
- [ ] Real-time updates work without page refresh
- [ ] Both parties see "Connected!" when both are ready
- [ ] Disconnect works (click again to cancel)
- [ ] Socket.IO connection established (check console)
- [ ] Notifications are received in real-time
- [ ] Database is updated correctly
- [ ] No console errors

## Step 9: Test Edge Cases

1. **Multiple Sessions:**
   - Create multiple sessions
   - Test Connect button on different sessions
   - Verify correct session is updated

2. **Page Refresh:**
   - Click Connect
   - Refresh page
   - Status should persist

3. **Disconnect/Reconnect:**
   - Disconnect Socket.IO
   - Reconnect
   - Status should sync

4. **Network Issues:**
   - Disconnect network
   - Try to connect
   - Should show error message

## Additional Notes

- Socket.IO uses WebSocket protocol for real-time communication
- Connection state is persisted in database
- Notifications are sent via both Socket.IO and database
- Status updates are real-time (no page refresh needed)
- Connect button is only available after session is accepted

## Success Criteria

✅ User can request therapy
✅ Doctor can accept therapy request
✅ Session is created with "pending" status
✅ Session status changes to "accepted" when doctor accepts
✅ Connect button appears after session is accepted
✅ User can click Connect and doctor is notified
✅ Doctor can click Connect and user is notified
✅ Both parties see "Connected!" when both are ready
✅ Real-time updates work without page refresh
✅ Database is updated correctly
✅ Socket.IO connection is established
✅ No console errors

## Need Help?

If you encounter issues:
1. Check server logs for errors
2. Check browser console for errors
3. Verify MongoDB is running
4. Verify environment variables are set
5. Check Socket.IO connection status
6. Verify JWT tokens are valid

