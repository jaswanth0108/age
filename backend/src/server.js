require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');
const path = require('path');

const estimateRouter = require('./routes/estimate');
const adminRouter = require('./routes/admin');

const app = express();
const PORT = process.env.PORT || 4000;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

// Security headers
app.use(helmet({
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: false
}));

// CORS - allow frontend across local dev and cloud deployments
const rawFrontendUrl = process.env.FRONTEND_URL || '';
const configuredOrigins = rawFrontendUrl
  .split(',')
  .map(s => s.trim().replace(/\/+$/, ''))
  .filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Allow non-browser requests (e.g. mobile, curl, server-to-server)
    if (!origin) return callback(null, true);
    const cleanOrigin = origin.replace(/\/+$/, '');
    
    // Check configured origins or wildcard
    if (
      configuredOrigins.includes(cleanOrigin) ||
      configuredOrigins.includes('*') ||
      rawFrontendUrl === '*' ||
      cleanOrigin.includes('localhost') ||
      cleanOrigin.includes('127.0.0.1') ||
      cleanOrigin.endsWith('.onrender.com') ||
      cleanOrigin.endsWith('.vercel.app') ||
      cleanOrigin.endsWith('.netlify.app')
    ) {
      return callback(null, true);
    }
    // Permissive fallback
    return callback(null, true);
  },
  credentials: true
}));

app.use(cookieParser());
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

// Global rate limit
const globalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false
});
app.use('/api/', globalLimiter);

// Trust proxy for secure cookies behind proxy
app.set('trust proxy', 1);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'AgeLens API', time: new Date().toISOString() });
});

app.use('/api/estimate', estimateRouter);
app.use('/api/admin', adminRouter);

// Serve frontend in production if built
const frontendBuildPath = path.join(__dirname, '../../frontend/dist');
app.use(express.static(frontendBuildPath));

// Fallback for SPA
app.get('*', (req, res) => {
  if (req.path.startsWith('/api/')) return res.status(404).json({ error: 'Not found' });
  const indexPath = path.join(frontendBuildPath, 'index.html');
  try {
    if (require('fs').existsSync(indexPath)) return res.sendFile(indexPath);
  } catch {}
  res.status(404).json({ error: 'Not found - frontend not built' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err);
  if (err instanceof require('multer').MulterError) {
    return res.status(400).json({ error: err.message });
  }
  res.status(500).json({ error: err.message || 'Internal server error' });
});

if (require.main === module) {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`✅ AgeLens backend running on http://0.0.0.0:${PORT}`);
    console.log(`🔗 Frontend URL allowed: ${FRONTEND_URL}`);
    console.log(`🔐 Admin user: ${process.env.ADMIN_USERNAME || 'admin'} (password: admin123 if not changed)`);
    console.log(`💾 Storage: ${process.env.STORAGE_PATH || path.join(__dirname, '../storage')}`);
  });
}

module.exports = app;
