# Quick Debug Steps - Notifications Issue

## Step 1: Open Browser Developer Tools
Press `F12` on your keyboard (or `Ctrl+Shift+I` on Windows, `Cmd+Option+I` on Mac)

## Step 2: Go to CONSOLE Tab (NOT Elements/Inspector)
- Click on the **"Console"** tab at the top
- This is where JavaScript logs appear
- You should see logs like: `📬 Notifications loaded:`

## Step 3: Check Network Tab
- Click on the **"Network"** tab
- Clear it (click the 🚫 icon)
- Go to `/notifications` page in your app
- Look for a request called `notifications` or `notifications?limit=50`
- Click on it
- Go to **"Response"** tab to see the data

## Step 4: What to Look For

### In Console Tab:
✅ Good: `📬 Notifications loaded: { role: 'doctor', count: 1, items: [...] }`
❌ Bad: `❌ Failed to load notifications:` or no logs at all

### In Network Tab:
✅ Good: Status `200`, Response shows `{ items: [...] }` with notification data
❌ Bad: Status `401`, `403`, `500`, or empty `{ items: [] }`

## Step 5: Check Server Console
- Look at your terminal where the server is running
- When a user sends a request, you should see:
  - `📥 Received therapy request`
  - `📬 Created notification for new request`
  - `📡 Emitted connect_request to doctor:...`

