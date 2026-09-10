const express = require('express');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

function nextOrderId() {
  const last = db.prepare("SELECT id FROM orders ORDER BY rowid DESC LIMIT 1").get();
  let n = 1000;
  if (last && /^WA-(\d+)$/.test(last.id)) n = parseInt(last.id.split('-')[1], 10);
  return 'WA-' + (n + 1);
}

// POST /api/orders — PUBLIC. Called by the customer site right before it opens
// WhatsApp, so every order placed through the "Buy Now on WhatsApp" button
// automatically shows up in the admin Orders page.
router.post('/', (req, res) => {
  const b = req.body || {};
  if (!Array.isArray(b.items) || b.items.length === 0) {
    return res.status(400).json({ error: 'No items in this order.' });
  }
  const id = nextOrderId();
  const itemsSummary = b.items
    .map((i) => `${i.name}${i.size ? ' (' + i.size : ''}${i.colour ? (i.size ? ', ' : ' (') + i.colour : ''}${i.size || i.colour ? ')' : ''} × ${i.qty}`)
    .join(' · ');
  const total = b.items.reduce((s, i) => s + (Number(i.price) || 0) * (Number(i.qty) || 0), 0);

  db.prepare(`
    INSERT INTO orders (id, customer_name, phone, items, total, status, source)
    VALUES (?, ?, ?, ?, ?, 'New', 'whatsapp')
  `).run(id, b.customer_name || 'WhatsApp customer', b.phone || '', itemsSummary, total);

  res.status(201).json({ id, itemsSummary, total });
});

// GET /api/orders — admin only
router.get('/', requireAuth, (req, res) => {
  res.json(db.prepare('SELECT * FROM orders ORDER BY rowid DESC').all());
});

// PUT /api/orders/:id — admin only (update status / details)
router.put('/:id', requireAuth, (req, res) => {
  const existing = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Order not found.' });
  const b = req.body || {};
  db.prepare(`
    UPDATE orders SET customer_name=@customer_name, phone=@phone, items=@items, total=@total, status=@status WHERE id=@id
  `).run({
    id: existing.id,
    customer_name: b.customer_name ?? existing.customer_name,
    phone: b.phone ?? existing.phone,
    items: b.items ?? existing.items,
    total: b.total != null ? Number(b.total) : existing.total,
    status: b.status ?? existing.status
  });
  res.json(db.prepare('SELECT * FROM orders WHERE id = ?').get(existing.id));
});

module.exports = router;
