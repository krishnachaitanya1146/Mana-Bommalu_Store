const express = require('express');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// GET /api/settings — public (the customer store needs the WhatsApp number)
router.get('/', (req, res) => {
  const rows = db.prepare('SELECT key, value FROM settings').all();
  const out = {};
  rows.forEach((r) => (out[r.key] = r.value));
  res.json(out);
});

// PUT /api/settings — admin only
router.put('/', requireAuth, (req, res) => {
  const b = req.body || {};
  const upsert = db.prepare(`
    INSERT INTO settings (key, value) VALUES (@key, @value)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value
  `);
  const run = db.transaction(() => {
    Object.entries(b).forEach(([key, value]) => upsert.run({ key, value: String(value ?? '') }));
  });
  run();
  const rows = db.prepare('SELECT key, value FROM settings').all();
  const out = {};
  rows.forEach((r) => (out[r.key] = r.value));
  res.json(out);
});

module.exports = router;
