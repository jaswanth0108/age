# AgeLens — AI Age Estimation (Modern Full-Stack)

> Live camera → Face validation → Secure AI age estimation → Consent-based encrypted storage → Hidden Admin Portal

A production-ready, responsive full-stack app built with **React + TypeScript + Tailwind** (frontend) and **Node.js + Express** (backend). Replaceable AI model, PostgreSQL-ready, private S3-compatible storage, secure sessions, rate limiting, helmet, audit logs, and Docker.

---

## ✨ Features

### User Side
- Modern homepage with logo, **Start Camera** button, clean gradient UI
- Camera permission + live webcam preview (mirrored, HD)
- Real-time validation: **1 face required**, rejects **no face / multiple faces / poor lighting**
  - Uses `FaceDetector` API when available, fallback heuristic + backend re-validation via `sharp` brightness & mock face check
- Capture → sends JPEG to `POST /api/estimate` (multipart)
- Display: **AI Estimated Age, Range, Confidence**, plus disclaimer: *“This is an AI estimate, not a verified exact age.”*
- Consent toggle (default ON) controls whether image is stored
- **Retake / Try Again** buttons, fully responsive (mobile/tablet/desktop)
- Privacy note, lighting/face status, and shimmer/processing states

### Privacy & Storage
- If consent is given, image stored in **private encrypted storage** (`backend/storage/` with 0600, UUID filename) — never public
- Metadata only in DB: `id, timestamp, estimatedAge, range, confidence, consent, brightness`
- Automatic retention/deletion after **30 days** (configurable via `RETENTION_DAYS`, cleanup on read + Postgres `cleanup_expired_captures()` function)
- Image served only via authenticated `GET /api/admin/images/:id` (stream, `private, no-store`)

### Hidden Admin Portal
- **Double-click** the logo → `/admin/login`
- Login with `admin` / `admin123` (hash stored in env via `ADMIN_PASSWORD_HASH`, bcrypt, never in frontend)
- Dashboard: total captures, avg age/confidence, recent captures table, searchable/filterable gallery
- Filters: search (id/age/timestamp), age buckets, sort (newest/oldest/confidence/age)
- View private gallery, delete images, audit logs
- Protected routes via `httpOnly` JWT cookie (`secure` in prod) or `Authorization: Bearer`
- Rate limiting: global 60 req/min, login 5/15min
- Audit logs for login success/fail, view, delete, logout, rate-limit

---

## 🧱 Stack

| Layer | Tech |
|-------|------|
| Frontend | React 18, TypeScript, Tailwind CSS 3, Vite, React Router |
| Backend | Node.js 20, Express 4, Helmet, CORS, Multer, Sharp, bcryptjs, JWT, cookie-parser, rate-limit, dotenv |
| DB | PostgreSQL (prod via Docker) + JSON file fallback (`backend/data/db.json`) for zero-config local run |
| Storage | Private filesystem (0600 UUID files) + S3-compatible interface ready to swap |
| Auth | Secure server-side sessions (JWT httpOnly), bcrypt, helmet, audit |
| AI | Replaceable `services/ai.js` — currently deterministic mock (hash-based) with 78-97% confidence; swap with AWS Rekognition / Azure Face / custom model |

---

## 📁 Project Structure

```
age-lens/
├── backend/
│   ├── src/
│   │   ├── server.js              # Express app, helmet, cors, static frontend, error handler
│   │   ├── routes/
│   │   │   ├── estimate.js        # POST /api/estimate (multer, lighting, face check, AI, consent storage)
│   │   │   └── admin.js           # /api/admin/* (login, logout, stats, captures, images, audit)
│   │   ├── services/ai.js         # estimateAge(), validateFaces() — replaceable
│   │   ├── middleware/auth.js     # JWT verify, signToken
│   │   └── db/store.js            # JSON file DB + retention logic (mirrors Postgres schema)
│   ├── storage/                   # private encrypted images (gitignored)
│   ├── data/db.json               # metadata (gitignored)
│   ├── Dockerfile
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── pages/Home.tsx         # hero, how it works, privacy
│   │   ├── pages/CameraPage.tsx   # live preview, face/lighting loop, capture, result card
│   │   ├── pages/AdminLogin.tsx   # hidden login
│   │   ├── pages/AdminDashboard.tsx # stats, table, gallery, audit, delete
│   │   └── App.tsx                # header with double-click logo, routes, footer
│   ├── Dockerfile + nginx.conf
│   └── vite.config.ts (proxy /api → localhost:4000)
├── db/init.sql                    # Postgres schema, indexes, retention function, seed admin
├── docker-compose.yml             # postgres + backend + frontend
├── .env.example
└── README.md
```

---

## 🚀 Quick Start (Local, No Docker)

### 1. Backend
```bash
cd backend
cp .env.example .env  # or copy from root .env.example
npm install
npm run dev           # http://localhost:4000
# Health: curl http://localhost:4000/api/health
```

### 2. Frontend
```bash
cd frontend
npm install
npm run dev           # http://localhost:5173 (proxies /api to backend)
```

Visit `http://localhost:5173` → **Start Camera** → allow permission → capture.

### 3. Admin
- Double-click **AgeLens** logo (header) → `/admin/login`
- User: `admin` / Pass: `admin123`
- Or navigate directly to `http://localhost:5173/admin/login` (also proxied in dev)

> **Note:** Backend falls back to `backend/data/db.json` if `DATABASE_URL` not set — no Postgres needed for demo.

---

## 🐳 Production with Docker (Postgres + HTTPS-ready)

```bash
cp .env.example .env
# Edit .env: set JWT_SECRET (32+ random chars), ADMIN_PASSWORD_HASH (bcrypt of your password)
docker-compose up --build -d
# Frontend: http://localhost:5173
# Backend:  http://localhost:4000/api/health
# Postgres: localhost:5432 (user: agelens / pass: agelens / db: agelens)
```

To set a new admin password:
```bash
node -e "console.log(require('bcryptjs').hashSync('yourNewPass',12))"
# paste hash into .env as ADMIN_PASSWORD_HASH
docker-compose restart backend
```

### HTTPS
- Set `NODE_ENV=production` (enables `secure: true` cookies)
- Terminate TLS at reverse proxy (nginx/Traefik/Cloudflare) → forward to backend with `X-Forwarded-Proto: https` and `trust proxy: 1` already set
- Add `Strict-Transport-Security` via Helmet or proxy

---

## 🔌 API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/health` | — | Health check |
| POST | `/api/estimate` | — | `multipart/form-data: image (5MB), consent (bool)` → `{estimatedAge, range, confidence, imageId, consentStored}`. Rejects 422 for `no_face`, `multiple_faces`, `poor_lighting` |
| POST | `/api/admin/login` | — | `{username,password}` → sets `httpOnly` JWT cookie + returns token. Rate 5/15min |
| POST | `/api/admin/logout` | JWT | Clears cookie, audit logs |
| GET | `/api/admin/me` | JWT | Current admin |
| GET | `/api/admin/stats` | JWT | `{total, avgAge, avgConf, recent}` |
| GET | `/api/admin/captures?search=&filterAge=&sort=&page=&limit=` | JWT | Paginated sanitized captures |
| GET | `/api/admin/images/:id` | JWT | Stream private image (`private, no-store`) |
| DELETE | `/api/admin/images/:id` | JWT | Delete capture + file |
| GET | `/api/admin/audit` | JWT | Last 100 audit logs |

All admin routes accept JWT via `Cookie: token=...` or `Authorization: Bearer ...`.

**Curl examples:**
```bash
# Estimate (no consent)
curl -F image=@face.jpg -F consent=false http://localhost:4000/api/estimate

# Login
curl -c cookies.txt -H "Content-Type: application/json" -d '{"username":"admin","password":"admin123"}' http://localhost:4000/api/admin/login

# Authenticated captures (cookie)
curl -b cookies.txt http://localhost:4000/api/admin/captures

# Or with Bearer token from login response
curl -H "Authorization: Bearer <token>" http://localhost:4000/api/admin/captures
```

---

## 🔒 Security

- **Helmet** headers, **CORS** allowlist (`FRONTEND_URL`), `X-Content-Type-Options: nosniff`
- **Rate limiting** (global + login), **input validation**, **multer** limits (5MB, image only)
- **bcryptjs** (12 rounds) for password, never hardcoded in frontend (hash in env/backend)
- **JWT** httpOnly cookie (`sameSite: lax`, `secure` in prod, 2h expiry)
- **Audit logs** persisted
- Storage: `0600` perms, UUID filenames, private stream only
- Frontend: no exposure of hashes/tokens except optional Bearer for SPA (also httpOnly)
- **.env** never committed; `.env.example` provided

---

## 🤖 AI Integration (Replaceable)

Current `backend/src/services/ai.js`:

```js
async function estimateAge(buffer) {
  // deterministic mock based on sha256 hash → age 5-78, confidence 78-97, range ±2-5
  // uses sharp to compute avgBrightness for confidence adjustment
}
async function validateFaces(buffer) { /* mock 95% single face */ }
```

**To plug real model:**

- **Option A — Cloud API (recommended for accuracy):**
  ```js
  // in estimateAge()
  const res = await fetch('https://api.aws.rekognition...', { method:'POST', body: buffer })
  // map response to { age, range, confidence }
  ```
  Configure via env: `AI_PROVIDER=aws|azure|custom`, `AI_API_KEY=...`

- **Option B — Local model (TensorFlow/ONNX):**
  ```js
  const tf = require('@tensorflow/tfjs-node');
  const model = await tf.loadGraphModel('file://./model/model.json');
  ```

Both keep the same return shape so frontend needs no change. Also swap `validateFaces` to use Blazeface/Mediapipe for robust face count.

---

## 🗄️ Database

- **Dev:** `backend/data/db.json` (`{captures:[], auditLogs:[]}`) — zero setup, retention cleanup on each `getCaptures()`
- **Prod:** Postgres (`db/init.sql`) with `captures`, `audit_logs`, `admin_users`, indexes, `expires_at`, `cleanup_expired_captures()` — connect via `DATABASE_URL`. App currently reads/writes JSON file; to switch to Postgres, replace `store.js` calls with `pg` queries (schema already provided).

---

## 🧪 Tests

```bash
cd backend
npm test   # jest + supertest: health, login fail/success, estimate rejects without image
```

---

## ⚙️ Environment Variables

See `.env.example` (also `backend/.env.example`):

```
PORT, NODE_ENV, JWT_SECRET, ADMIN_USERNAME, ADMIN_PASSWORD_HASH,
FRONTEND_URL, STORAGE_PATH, DB_PATH, RETENTION_DAYS, DATABASE_URL
```

---

## 🛠️ Troubleshooting

- **Camera not showing:** Ensure `https` or `localhost` (required for `getUserMedia`), check browser permissions, try Chrome/Edge (FaceDetector support best).
- **Poor lighting rejection:** Improve lighting (>75 avg brightness) — status shows live `GOOD/DIM/POOR`.
- **Admin 401:** Clear cookies, re-login, ensure `JWT_SECRET` same across restarts, check `Authorization` header if using Bearer.
- **Rate limited:** Wait 15 min after 5 failed logins.
- **Port in use:** Change `PORT` / `FRONTEND_URL` in `.env` and `vite.config.ts` proxy.
- **Sharp install fails:** On Alpine, `npm install --include=optional` may be needed; Dockerfile already handles.

---

## 📄 License

MIT — Demo prototype. Change `JWT_SECRET` and `ADMIN_PASSWORD_HASH` before production. Add real AI model, S3 (e.g., MinIO/AWS), and Postgres wiring for scale.

---

**Made for demo — “This is an AI estimate, not a verified exact age.”**
