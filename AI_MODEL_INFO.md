# 🤖 AI Model for Marma Point Detection

## ✅ Yes, You Have an AI Model!

Your project includes a **Python-based AI model** that detects and indicates marma points on foot photos.

---

## 🔍 How It Works

### 1. **Python Script** (`server/py/marma_detect_cli.py`)
- Uses **OpenCV** and **NumPy** for image processing
- Detects feet in uploaded images using contour detection
- Calculates 4 marma point positions based on foot bounding boxes
- Draws annotated images with labeled points

### 2. **Marma Points Detected:**
- **Kshipra Marma** - Between first and second toe
- **Kurcha Marma** - Heel region
- **Talahridaya Marma** - Sole center
- **Kurchashira Marma** - Achilles tendon area

### 3. **API Endpoint:**
- **POST** `/api/photos/ai-detect`
- Accepts image file upload
- Returns annotated image with marma points marked

### 4. **Frontend Page:**
- `UserFootPhoto.jsx` - Upload page for users
- Shows original and annotated images
- Displays detected marma points

---

## ⚠️ **IMPORTANT: Deployment Issue**

### Problem:
**Vercel serverless functions CANNOT run Python scripts!**

Vercel limitations:
- ❌ No Python runtime in serverless functions
- ❌ No file system access for saving images
- ❌ No ability to run external scripts

### Solutions:

#### Option 1: Use External AI Service (Recommended)
1. Deploy Python model separately (e.g., on Railway, Render, or Google Cloud Functions)
2. Set `AI_DETECT_URL` environment variable
3. Your API will call the external service

#### Option 2: Deploy Backend Separately
1. **Frontend**: Deploy on Vercel (React/Vite)
2. **Backend**: Deploy on Railway or Render (supports Python + Node.js)
3. Update `VITE_API_BASE` to point to backend URL

#### Option 3: Use Cloud AI Service
- Use a cloud-based image analysis API
- Replace Python script with API calls
- Examples: Google Vision API, AWS Rekognition, etc.

---

## 🚀 How to Deploy with AI Model

### Recommended Setup:

1. **Frontend (Vercel)**
   - Deploy React app
   - Fast, free, perfect for static sites

2. **Backend (Railway/Render)**
   - Deploy Node.js server
   - Install Python dependencies
   - Run Python scripts
   - Handle file uploads

3. **Python Dependencies**
   ```bash
   pip install opencv-python numpy pillow
   ```

4. **Environment Variables**
   - `PYTHON_BIN` - Path to Python (usually `python3` or `python`)
   - `MONGO_URI` - MongoDB connection
   - `FRONTEND_URL` - Your Vercel frontend URL

---

## 📝 Current Implementation

### Backend Route:
```javascript
POST /api/photos/ai-detect
- Uploads image
- Runs Python script: marma_detect_cli.py
- Returns annotated image with marma points
```

### Python Script:
```python
# Detects feet using OpenCV
# Calculates marma point positions
# Draws boxes and labels on image
# Returns JSON with coordinates
```

### Frontend:
```javascript
// UserFootPhoto.jsx
// Uploads photo
// Calls /api/photos/ai-detect
// Displays annotated result
```

---

## ✅ What Works Locally

- ✅ Python script runs on your computer
- ✅ Image detection works
- ✅ Annotated images are saved
- ✅ Marma points are displayed

## ❌ What Won't Work on Vercel

- ❌ Python scripts cannot run
- ❌ File system operations are limited
- ❌ Cannot save annotated images locally

---

## 🎯 Next Steps for Deployment

1. **Choose deployment strategy:**
   - Option A: Separate backend (Railway/Render)
   - Option B: External AI service
   - Option C: Cloud AI API

2. **Update configuration:**
   - Set `AI_DETECT_URL` if using external service
   - Or deploy backend separately

3. **Test deployment:**
   - Verify Python dependencies are installed
   - Test image upload and detection
   - Check annotated images are generated

---

**Your AI model is ready - you just need the right deployment platform! 🚀**

