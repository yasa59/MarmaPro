# MongoDB Setup Guide

## Quick Fix Options

### Option 1: MongoDB Atlas (Cloud - Recommended) ⭐

**Easiest and fastest way to get started:**

1. **Sign up for free**: Go to https://www.mongodb.com/cloud/atlas
2. **Create a cluster**: Click "Build a Database" → Choose "FREE" tier
3. **Get connection string**:
   - Click "Connect" on your cluster
   - Choose "Connect your application"
   - Copy the connection string (looks like: `mongodb+srv://username:password@cluster.mongodb.net/...`)
4. **Create `.env` file** in the `server` folder:
   ```
   MONGO_URI=mongodb+srv://your-username:your-password@cluster.mongodb.net/iMarmaTherapy?retryWrites=true&w=majority
   PORT=5000
   JWT_SECRET=change-this-to-a-random-secret-key
   ```
5. **Restart server**: `npm run dev`

---

### Option 2: Install MongoDB Locally (Windows)

1. **Download**: https://www.mongodb.com/try/download/community
2. **Install**: Run the installer
   - Choose "Complete" installation
   - Check "Install MongoDB as a Service"
   - Use default port (27017)
3. **Verify installation**:
   - Open Command Prompt as Administrator
   - Run: `net start MongoDB`
   - Or check Services (Windows Key + R → `services.msc` → Find "MongoDB")
4. **No `.env` needed** - server will use default: `mongodb://localhost:27017/iMarmaTherapy`
5. **Restart server**: `npm run dev`

---

### Option 3: Docker (If you have Docker installed)

```bash
docker run -d -p 27017:27017 --name mongodb mongo:latest
```

Then restart your server: `npm run dev`

---

## Troubleshooting

### Error: `ECONNREFUSED ::1:27017`

**This means MongoDB is not running.**

**Fix:**
- **If using local MongoDB**: Start the MongoDB service
  - Windows: `net start MongoDB` (as Administrator)
  - Or check Services app → Start "MongoDB" service
- **If using Atlas**: Check your connection string in `.env` file

### Error: `Authentication failed`

**Fix:**
- Check your MongoDB Atlas username/password in the connection string
- Make sure you whitelisted your IP address in Atlas (or use `0.0.0.0/0` for development)

### Server starts but shows warning

**The server will start even without MongoDB, but API won't work.**
- Follow one of the options above to connect MongoDB
- Restart the server after fixing

---

## Verify MongoDB is Working

After setup, you should see in your server console:
```
✅ MongoDB connected successfully
🚀 API server started on http://localhost:5000
✅ Ready to accept requests
```

If you see warnings, MongoDB is not connected yet.

