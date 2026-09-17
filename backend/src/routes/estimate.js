const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const { estimateAge, validateFaces } = require('../services/ai');
const { addCapture, STORAGE_PATH } = require('../db/store');

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) return cb(new Error('Only images allowed'), false);
    cb(null, true);
  }
});

router.post('/', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No image provided' });

    const buffer = req.file.buffer;
    const consent = String(req.body.consent || 'false').toLowerCase() === 'true';

    // Basic image validation via sharp
    let brightness = 120;
    try {
      const sharp = require('sharp');
      const { data } = await sharp(buffer).resize(50, 50).grayscale().raw().toBuffer({ resolveWithObject: true });
      let sum = 0; for (let i=0;i<data.length;i++) sum+=data[i];
      brightness = sum / data.length;
      if (brightness < 35) {
        return res.status(422).json({ error: 'Poor lighting detected. Please improve lighting and try again.', code: 'poor_lighting', brightness: Math.round(brightness) });
      }
    } catch (e) {
      // ignore sharp errors
    }

    // Validate faces (mock but still enforce)
    const faceCheck = await validateFaces(buffer);
    // Allow override for testing via header
    const force = req.headers['x-force-face'];
    if (!force && !faceCheck.valid) {
      if (faceCheck.reason === 'no_face') {
        return res.status(422).json({ error: 'No face detected. Please center your face and try again.', code: 'no_face' });
      } else if (faceCheck.reason === 'multiple_faces') {
        return res.status(422).json({ error: 'Multiple faces detected. Only one face should be visible.', code: 'multiple_faces' });
      }
    }

    const result = await estimateAge(buffer);

    // Store if consent given
    let imageId = null;
    let imagePath = null;
    if (consent) {
      const id = uuidv4();
      imageId = id;
      const ext = path.extname(req.file.originalname) || '.jpg';
      const safeExt = ['.jpg', '.jpeg', '.png', '.webp'].includes(ext.toLowerCase()) ? ext.toLowerCase() : '.jpg';
      if (!fs.existsSync(STORAGE_PATH)) fs.mkdirSync(STORAGE_PATH, { recursive: true });
      // Simple "encryption" at rest: store with random UUID, not original name, and restrict permissions
      const filename = `${id}${safeExt}`;
      imagePath = path.join(STORAGE_PATH, filename);
      fs.writeFileSync(imagePath, buffer, { mode: 0o600 });

      const capture = {
        id,
        timestamp: new Date().toISOString(),
        estimatedAge: result.age,
        range: result.range,
        confidence: result.confidence,
        consent: true,
        imagePath,
        brightness: result.metadata.brightness,
        ip: req.ip
      };
      addCapture(capture);
    }

    res.json({
      success: true,
      estimatedAge: result.age,
      range: result.range,
      confidence: result.confidence,
      model: result.model,
      imageId,
      consentStored: consent,
      brightness: Math.round(brightness)
    });
  } catch (err) {
    console.error('Estimate error', err);
    res.status(500).json({ error: 'Failed to estimate age. Please try again.' });
  }
});

module.exports = router;
