const express = require('express');
const bcrypt = require('bcryptjs');
const rateLimit = require('express-rate-limit');
const fs = require('fs');
const path = require('path');
const { signToken, authMiddleware } = require('../middleware/auth');
const { getCaptures, deleteCapture, getStats, addAudit, getAuditLogs } = require('../db/store');

const router = express.Router();

// Rate limiting for login: 5 attempts per 15 min per IP
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    addAudit({ action: 'login_rate_limited', ip: req.ip, username: req.body?.username });
    res.status(429).json({ error: 'Too many login attempts. Try again in 15 minutes.' });
  }
});

function getAdminCredentials() {
  const username = process.env.ADMIN_USERNAME || 'admin';
  // If ADMIN_PASSWORD_HASH not set, generate hash for admin123
  let hash = process.env.ADMIN_PASSWORD_HASH;
  if (!hash) {
    // generate synchronous hash for admin123 on the fly
    hash = bcrypt.hashSync('admin123', 12);
  }
  return { username, hash };
}

router.post('/login', loginLimiter, async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password required' });
  }
  const creds = getAdminCredentials();
  const isUserValid = username === creds.username;
  // Always do bcrypt compare to prevent timing leaks, use dummy hash if user invalid
  const hashToCompare = isUserValid ? creds.hash : bcrypt.hashSync('dummy', 10);
  const isPassValid = await bcrypt.compare(password, hashToCompare);

  if (!isUserValid || !isPassValid) {
    addAudit({ action: 'login_failed', ip: req.ip, username });
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const token = signToken({ username, role: 'admin' });
  addAudit({ action: 'login_success', ip: req.ip, username });

  // Secure cookie
  const isProd = process.env.NODE_ENV === 'production';
  res.cookie('token', token, {
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax',
    maxAge: 2 * 60 * 60 * 1000, // 2h
    path: '/'
  });

  res.json({ success: true, username, token }); // token also returned for non-cookie clients
});

router.post('/logout', (req, res) => {
  const username = req.admin?.username || 'unknown';
  res.clearCookie('token', { path: '/' });
  addAudit({ action: 'logout', ip: req.ip, username });
  res.json({ success: true });
});

router.get('/me', authMiddleware, (req, res) => {
  res.json({ username: req.admin.username, role: req.admin.role });
});

// Protected routes
router.get('/stats', authMiddleware, (req, res) => {
  res.json(getStats());
});

router.get('/captures', authMiddleware, (req, res) => {
  const { search, filterAge, sort, page, limit } = req.query;
  const result = getCaptures({
    search: search || '',
    filterAge: filterAge || '',
    sort: sort || 'newest',
    page: parseInt(page) || 1,
    limit: Math.min(parseInt(limit) || 20, 100)
  });
  // Don't expose imagePath directly, map to id-based URL
  const sanitized = result.items.map(c => ({
    id: c.id,
    timestamp: c.timestamp,
    estimatedAge: c.estimatedAge,
    range: c.range,
    confidence: c.confidence,
    consent: c.consent,
    hasImage: !!c.imagePath,
    brightness: c.brightness
  }));
  res.json({ ...result, items: sanitized });
});

router.get('/images/:id', authMiddleware, (req, res) => {
  const { loadDB, STORAGE_PATH } = require('../db/store');
  const db = loadDB();
  const cap = db.captures.find(c => c.id === req.params.id);
  if (!cap) return res.status(404).json({ error: 'Capture not found' });

  // Locate image across possible saved paths or storage directory
  const candidatePaths = [
    cap.imagePath,
    cap.imagePath ? path.join(STORAGE_PATH, path.basename(cap.imagePath)) : null,
    path.join(STORAGE_PATH, `${cap.id}.jpg`),
    path.join(STORAGE_PATH, `${cap.id}.jpeg`),
    path.join(STORAGE_PATH, `${cap.id}.png`),
    path.join(STORAGE_PATH, `${cap.id}.webp`),
    path.join(__dirname, '../../storage', `${cap.id}.jpg`),
    path.join(__dirname, '../storage', `${cap.id}.jpg`)
  ].filter(Boolean);

  let targetFile = candidatePaths.find(p => fs.existsSync(p));

  if (!targetFile) {
    return res.status(404).json({ error: 'Image file not found on server disk' });
  }

  // Infer content type
  const ext = path.extname(targetFile).toLowerCase();
  const mime = ext === '.png' ? 'image/png' : ext === '.webp' ? 'image/webp' : 'image/jpeg';

  res.setHeader('Content-Type', mime);
  res.setHeader('Cache-Control', 'private, no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  if (req.headers.origin) {
    res.setHeader('Access-Control-Allow-Origin', req.headers.origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  }

  fs.createReadStream(targetFile).pipe(res);
  addAudit({ action: 'view_image', ip: req.ip, username: req.admin.username, targetId: req.params.id });
});

router.delete('/images/:id', authMiddleware, (req, res) => {
  const ok = deleteCapture(req.params.id);
  if (!ok) return res.status(404).json({ error: 'Not found' });
  addAudit({ action: 'delete_image', ip: req.ip, username: req.admin.username, targetId: req.params.id });
  res.json({ success: true });
});

router.get('/audit', authMiddleware, (req, res) => {
  res.json(getAuditLogs(100));
});

module.exports = router;
