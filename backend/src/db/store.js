const fs = require('fs');
const path = require('path');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '../../data/db.json');
const STORAGE_PATH = process.env.STORAGE_PATH || path.join(__dirname, '../../storage');

function ensureDirs() {
  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(STORAGE_PATH)) fs.mkdirSync(STORAGE_PATH, { recursive: true });
  if (!fs.existsSync(DB_PATH)) {
    fs.writeFileSync(DB_PATH, JSON.stringify({ captures: [], auditLogs: [] }, null, 2));
  }
}

function loadDB() {
  ensureDirs();
  try {
    const raw = fs.readFileSync(DB_PATH, 'utf-8');
    return JSON.parse(raw);
  } catch (e) {
    return { captures: [], auditLogs: [] };
  }
}

function saveDB(data) {
  ensureDirs();
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
}

function addCapture(capture) {
  const db = loadDB();
  db.captures.unshift(capture);
  saveDB(db);
  return capture;
}

function getCaptures({ search = '', filterAge = '', sort = 'newest', page = 1, limit = 20 } = {}) {
  const db = loadDB();
  let items = [...db.captures];

  if (search) {
    const s = search.toLowerCase();
    items = items.filter(c =>
      String(c.estimatedAge).includes(s) ||
      String(c.id).toLowerCase().includes(s) ||
      String(c.timestamp).toLowerCase().includes(s)
    );
  }
  if (filterAge) {
    const [min, max] = filterAge.split('-').map(Number);
    if (!isNaN(min) && !isNaN(max)) {
      items = items.filter(c => c.estimatedAge >= min && c.estimatedAge <= max);
    }
  }
  if (sort === 'oldest') {
    items.reverse();
  } else if (sort === 'confidence') {
    items.sort((a, b) => b.confidence - a.confidence);
  } else if (sort === 'age-asc') {
    items.sort((a, b) => a.estimatedAge - b.estimatedAge);
  } else if (sort === 'age-desc') {
    items.sort((a, b) => b.estimatedAge - a.estimatedAge);
  }

  const total = items.length;
  const start = (page - 1) * limit;
  const paginated = items.slice(start, start + limit);

  // auto retention delete
  const retentionDays = parseInt(process.env.RETENTION_DAYS || '30', 10);
  const cutoff = Date.now() - retentionDays * 24 * 60 * 60 * 1000;
  const expired = db.captures.filter(c => new Date(c.timestamp).getTime() < cutoff);
  if (expired.length > 0) {
    expired.forEach(c => {
      try {
        if (c.imagePath && fs.existsSync(c.imagePath)) fs.unlinkSync(c.imagePath);
      } catch {}
    });
    db.captures = db.captures.filter(c => new Date(c.timestamp).getTime() >= cutoff);
    saveDB(db);
  }

  return { items: paginated, total, page, limit, retentionDays };
}

function deleteCapture(id) {
  const db = loadDB();
  const idx = db.captures.findIndex(c => c.id === id);
  if (idx === -1) return false;
  const cap = db.captures[idx];
  try {
    if (cap.imagePath && fs.existsSync(cap.imagePath)) fs.unlinkSync(cap.imagePath);
  } catch {}
  db.captures.splice(idx, 1);
  saveDB(db);
  return true;
}

function getStats() {
  const db = loadDB();
  const total = db.captures.length;
  const avgAge = total ? Math.round(db.captures.reduce((s, c) => s + c.estimatedAge, 0) / total) : 0;
  const avgConf = total ? Math.round(db.captures.reduce((s, c) => s + c.confidence, 0) / total) : 0;
  const recent = db.captures.slice(0, 5);
  return { total, avgAge, avgConf, recent };
}

function addAudit(entry) {
  const db = loadDB();
  db.auditLogs.unshift({ ...entry, timestamp: new Date().toISOString(), id: require('uuid').v4() });
  if (db.auditLogs.length > 500) db.auditLogs = db.auditLogs.slice(0, 500);
  saveDB(db);
}

function getAuditLogs(limit = 50) {
  const db = loadDB();
  return db.auditLogs.slice(0, limit);
}

module.exports = { loadDB, saveDB, addCapture, getCaptures, deleteCapture, getStats, addAudit, getAuditLogs, DB_PATH, STORAGE_PATH };
