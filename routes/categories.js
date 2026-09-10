const express = require('express');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// GET /api/categories — public
router.get('/', (req, res) => {
  res.json(db.prepare('SELECT * FROM categories ORDER BY name').all());
});

// POST /api/categories — admin only
router.post('/', requireAuth, (req, res) => {
  const name = (req.body && req.body.name || '').trim();
  if (!name) return res.status(400).json({ error: 'Category name is required.' });
  try {
    const info = db.prepare('INSERT INTO categories (name) VALUES (?)').run(name);
    res.status(201).json({ id: info.lastInsertRowid, name });
  } catch (e) {
    res.status(409).json({ error: 'That category already exists.' });
  }
});

// DELETE /api/categories/:id — admin only, blocked if toys still use it
router.delete('/:id', requireAuth, (req, res) => {
  const cat = db.prepare('SELECT * FROM categories WHERE id = ?').get(req.params.id);
  if (!cat) return res.status(404).json({ error: 'Category not found.' });
  const inUse = db.prepare('SELECT COUNT(*) AS n FROM products WHERE category = ?').get(cat.name).n;
  if (inUse > 0) return res.status(409).json({ error: 'Move the toys out of this category before deleting it.' });
  db.prepare('DELETE FROM categories WHERE id = ?').run(cat.id);
  res.json({ ok: true });
});

module.exports = router;
