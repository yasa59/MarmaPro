// server/routes/photos.js
const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const sharp = require('sharp');

const Photo = require('../models/Photo');
const Connection = require('../models/Connection'); // <-- for doctor->patient access
const { verifyToken, requireUser } = require('../middleware/auth');
const { runPython } = require('../utils/runPython'); // for Python CLI

// ensure uploads/photos exists
const DIR = path.join(__dirname, '..', 'uploads', 'photos');
fs.mkdirSync(DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, DIR),
  filename: (_req, file, cb) => cb(null, Date.now() + '-' + file.originalname),
});
const upload = multer({ storage });

// Utility: draw rectangles using SVG overlay → returns annotated PNG buffer
async function makeAnnotated(inputAbsPath, rectangles, color = 'lime') {
  const img = sharp(inputAbsPath);
  const meta = await img.metadata();
  const svgRects = (rectangles || []).map(r =>
    `<rect x="${r.x}" y="${r.y}" width="${r.width}" height="${r.height}" fill="none" stroke="${color}" stroke-width="4"/>`
  ).join('');
  const svg = Buffer.from(
    `<svg width="${meta.width}" height="${meta.height}" xmlns="http://www.w3.org/2000/svg">${svgRects}</svg>`
  );
  return img.composite([{ input: svg }]).png().toBuffer();
}

/* ----------------------------------------------------------------------------
 * Helper: pagination
 * --------------------------------------------------------------------------*/
function pageParams(req) {
  const limit = Math.min(48, Math.max(1, Number(req.query.limit) || 12));
  const page  = Math.max(1, Number(req.query.page) || 1);
  const skip  = (page - 1) * limit;
  return { limit, page, skip };
}

/* ============================================================================
 * A) LOCAL PYTHON AI DETECT (RECOMMENDED)
 *    POST /api/photos/ai-detect
 *    form-data: file (image)
 *    - Runs server/py/marma_detect_cli.py
 *    - Saves annotated image + boxes into Photo.meta
 * ========================================================================== */
router.post('/ai-detect', verifyToken, requireUser, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'File required' });

    const absPath = req.file.path;
    const publicPath = `/uploads/photos/${path.basename(absPath)}`;

    // Run Python CLI
    const script = path.join(__dirname, '..', 'py', 'marma_detect_cli.py');
    const { stdout, stderr } = await runPython(script, [absPath]);

    if (stderr) console.log('PY STDERR:', stderr);
    let parsed;
    try {
      parsed = JSON.parse(stdout || '{}');
    } catch {
      parsed = { ok: false, error: 'bad json' };
    }

    if (!parsed.ok) {
      return res.status(500).json({ message: 'Detection failed', detail: parsed.error || 'unknown' });
    }

    // Python saves an annotated image next to the input; make public path
    const annotatedAbs = parsed.annotated_path;
    const annotatedFile = path.basename(annotatedAbs);
    const publicAnnotated = '/uploads/photos/' + annotatedFile;

    // Save record
    const p = await Photo.create({
      userId: req.user.userId,
      filepath: publicPath,
      annotated: publicAnnotated,
      aligned: true,               // set as needed based on your logic
      meta: { boxes: parsed.boxes }
    });

    return res.json({
      message: 'Detection complete',
      photo: {
        id: p._id,
        filepath: p.filepath,
        annotated: p.annotated,
        aligned: p.aligned,
        meta: p.meta
      }
    });
  } catch (e) {
    console.error('ai-detect error', e);
    res.status(500).json({ message: 'Server error' });
  }
});

/* ============================================================================
 * B) LEGACY UPLOAD (+ optional external AI via AI_DETECT_URL)
 *    POST /api/photos/upload
 *    form-data: image (file)
 *    - Keeps your current behavior (Sharp overlay)
 * ========================================================================== */
router.post('/upload', verifyToken, requireUser, upload.single('image'), async (req, res) => {
  try {
    const absPath = req.file.path;
    const publicPath = `/uploads/photos/${path.basename(absPath)}`;

    // 1) Detect rectangles via your external AI (if configured), else mock 4 rectangles
    let rectangles = [];
    if (process.env.AI_DETECT_URL) {
      const { readFile } = require('fs/promises');
      const buf = await readFile(absPath);

      // Node 18+ has global FormData and Blob
      const fd = new FormData();
      const blob = new Blob([buf]);
      fd.append('image', blob, req.file.originalname);

      const r = await fetch(process.env.AI_DETECT_URL, { method: 'POST', body: fd });
      const data = await r.json().catch(() => ({}));
      rectangles = Array.isArray(data?.zones) ? data.zones : (data?.rectangles || []);
    }
    if (!Array.isArray(rectangles) || rectangles.length === 0) {
      rectangles = [
        { x: 40,  y: 40,  width: 120, height: 120 },
        { x: 200, y: 40,  width: 120, height: 120 },
        { x: 40,  y: 200, width: 120, height: 120 },
        { x: 200, y: 200, width: 120, height: 120 },
      ];
    }

    // 2) Create annotated image (green boxes by default)
    const annotatedBuff = await makeAnnotated(absPath, rectangles, 'lime');
    const annotatedName = 'annotated-' + path.basename(absPath).replace(/\.[^.]+$/, '.png');
    const annotatedAbs = path.join(DIR, annotatedName);
    fs.writeFileSync(annotatedAbs, annotatedBuff);
    const annotatedPublic = `/uploads/photos/${annotatedName}`;

    // 3) Save DB record
    const photo = await Photo.create({
      userId: req.user.userId,
      filepath: publicPath,
      rectangles,
      aligned: false,
      annotated: annotatedPublic,
    });

    res.json({
      id: photo._id,
      filepath: publicPath,
      annotated: annotatedPublic,
      rectangles,
    });
  } catch (e) {
    console.error('Upload detect error:', e);
    res.status(500).json({ message: 'Detection failed' });
  }
});

/* ============================================================================
 * C) Latest photo for logged-in user (quick lookup)
 *    GET /api/photos/latest/mine
 * ========================================================================== */
router.get('/latest/mine', verifyToken, requireUser, async (req, res) => {
  const p = await Photo.findOne({ userId: req.user.userId }).sort({ createdAt: -1 });
  if (!p) return res.status(404).json({ message: 'No photo' });
  res.json(p);
});

/* ============================================================================
 * D) Paginated photo history for the current user
 *    GET /api/photos/mine?limit=12&page=1
 *    (verifyToken only so any role can fetch their OWN photos)
 * ========================================================================== */
router.get('/mine', verifyToken, async (req, res) => {
  try {
    const { limit, page, skip } = pageParams(req);
    const userId = req.user.userId;

    const [items, total] = await Promise.all([
      Photo.find({ userId }).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      Photo.countDocuments({ userId })
    ]);

    res.json({
      items,
      total,
      page,
      pages: Math.max(1, Math.ceil(total / limit)),
    });
  } catch (e) {
    console.error('photos/mine error', e);
    res.status(500).json({ message: 'Server error' });
  }
});

/* ============================================================================
 * E) Doctor-only: view a patient's paginated photos
 *    GET /api/photos/by-user/:userId?limit=12&page=1
 *    GET /api/photos/user/:userId?limit=12&page=1 (alias)
 *    - Must have accepted Connection(doctorId: me, userId, status:'accepted')
 * ========================================================================== */
async function getPatientPhotos(req, res) {
  try {
    const { limit, page, skip } = pageParams(req);
    const me   = req.user.userId;
    const role = req.user.role;
    const userId = req.params.userId;

    if (role !== 'doctor') {
      return res.status(403).json({ message: 'Doctor only' });
    }

    const conn = await Connection.findOne({
      doctorId: me,
      userId,
      status: 'accepted',
    }).lean();

    if (!conn) return res.status(403).json({ message: 'Not connected to this patient' });

    const [items, total] = await Promise.all([
      Photo.find({ userId }).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      Photo.countDocuments({ userId })
    ]);

    // Format photos for frontend
    const formattedItems = items.map(p => ({
      _id: String(p._id),
      url: p.filepath || p.annotated || null,
      filepath: p.filepath,
      annotated: p.annotated || null,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
    }));

    res.json({
      photos: formattedItems,
      items: formattedItems, // Also include items for compatibility
      total,
      page,
      pages: Math.max(1, Math.ceil(total / limit)),
    });
  } catch (e) {
    console.error('photos/by-user error', e);
    res.status(500).json({ message: 'Server error' });
  }
}

router.get('/by-user/:userId', verifyToken, getPatientPhotos);
router.get('/user/:userId', verifyToken, getPatientPhotos);

module.exports = router;
