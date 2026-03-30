require('dotenv').config();
const express   = require('express');
const cors      = require('cors');
const path      = require('path');
const morgan    = require('morgan');
const rateLimit = require('express-rate-limit');
const { seed }  = require('./db');
const logger    = require('./logger');
const fs        = require('fs');

// Ensure logs directory exists
const logsDir = path.join(__dirname, 'logs');
if (!fs.existsSync(logsDir)) fs.mkdirSync(logsDir);

const app    = express();
const BOOT_ID = Date.now().toString();

// ── Rate Limiters ───────────────────────────────────────────
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many login attempts, please try again in 15 minutes.' },
});

// ── Middleware ──────────────────────────────────────────────
app.use(cors());
app.use(express.json());
app.use(morgan('combined', { stream: { write: msg => logger.http(msg.trim()) } }));
app.use('/api', generalLimiter);
app.use('/api/auth/login', authLimiter);

// Serve the frontend
app.use(express.static(path.join(__dirname, '../frontend')));

// ── API Routes ─────────────────────────────────────────────
app.use('/api/auth',          require('./routes/auth'));
app.use('/api/users',         require('./routes/users'));
app.use('/api/departments',   require('./routes/departments'));
app.use('/api/courses',       require('./routes/courses'));
app.use('/api/offerings',     require('./routes/offerings'));
app.use('/api/rooms',         require('./routes/rooms'));
app.use('/api/timetable',     require('./routes/timetable'));
app.use('/api/clashes',       require('./routes/clashes'));
app.use('/api/notifications', require('./routes/notifications'));

// ── Health check ───────────────────────────────────────────
app.get('/api/health', (_req, res) => res.json({ status: 'ok', bootId: BOOT_ID }));

// ── 404 fallback for unknown API routes ────────────────────
app.use('/api', (_req, res) => res.status(404).json({ error: 'Not found' }));

// ── Global error handler ───────────────────────────────────
app.use((err, _req, res, _next) => {
  logger.error(err.message, { stack: err.stack });
  res.status(500).json({ error: 'Internal server error' });
});

// ── Start ──────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
app.listen(PORT, async () => {
  logger.info(`Server running at http://localhost:${PORT}`);
  try { await seed(); } catch (err) { logger.error('Seed error: ' + err.message); }
});
