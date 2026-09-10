const express = require('express');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

function attachVariants(product) {
  product.variants = db.prepare('SELECT * FROM variants WHERE product_id = ? ORDER BY id').all(product.id);
  // stock_qty at product level = sum of all variant stock, handy for card badges
  product.stockQty = product.variants.reduce((s, v) => s + (v.stock_qty || 0), 0);
  return product;
}

// GET /api/products — public, used by the customer store
router.get('/', (req, res) => {
  const products = db.prepare('SELECT * FROM products ORDER BY id DESC').all().map(attachVariants);
  res.json(products);
});

// GET /api/products/:id — public
router.get('/:id', (req, res) => {
  const product = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
  if (!product) return res.status(404).json({ error: 'Toy not found.' });
  res.json(attachVariants(product));
});

// POST /api/products — admin only
router.post('/', requireAuth, (req, res) => {
  const b = req.body || {};
  if (!b.name || !b.category || b.price == null) {
    return res.status(400).json({ error: 'Name, category and price are required.' });
  }
  if (!Array.isArray(b.variants) || b.variants.length === 0) {
    return res.status(400).json({ error: 'Add at least one size/colour/stock option for this toy.' });
  }

  const insertProduct = db.prepare(`
    INSERT INTO products (name, category, price, was_price, age, image_url, badge, description)
    VALUES (@name, @category, @price, @was_price, @age, @image_url, @badge, @description)
  `);
  const insertVariant = db.prepare(`
    INSERT INTO variants (product_id, size, colour, price, stock_qty)
    VALUES (@product_id, @size, @colour, @price, @stock_qty)
  `);

  const run = db.transaction(() => {
    const info = insertProduct.run({
      name: b.name.trim(),
      category: b.category,
      price: Number(b.price),
      was_price: b.was_price ? Number(b.was_price) : null,
      age: b.age || '',
      image_url: b.image_url || '',
      badge: b.badge || '',
      description: b.description || ''
    });
    const productId = info.lastInsertRowid;
    b.variants.forEach((v) => {
      insertVariant.run({
        product_id: productId,
        size: v.size || 'Standard',
        colour: v.colour || '',
        price: v.price ? Number(v.price) : null,
        stock_qty: Number(v.stock_qty) || 0
      });
    });
    return productId;
  });

  const id = run();
  res.status(201).json(attachVariants(db.prepare('SELECT * FROM products WHERE id = ?').get(id)));
});

// PUT /api/products/:id — admin only (replaces product fields + variant list)
router.put('/:id', requireAuth, (req, res) => {
  const existing = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Toy not found.' });

  const b = req.body || {};
  if (!b.name || !b.category || b.price == null) {
    return res.status(400).json({ error: 'Name, category and price are required.' });
  }

  const updateProduct = db.prepare(`
    UPDATE products SET name=@name, category=@category, price=@price, was_price=@was_price,
    age=@age, image_url=@image_url, badge=@badge, description=@description WHERE id=@id
  `);
  const deleteVariants = db.prepare('DELETE FROM variants WHERE product_id = ?');
  const insertVariant = db.prepare(`
    INSERT INTO variants (product_id, size, colour, price, stock_qty)
    VALUES (@product_id, @size, @colour, @price, @stock_qty)
  `);

  const run = db.transaction(() => {
    updateProduct.run({
      id: existing.id,
      name: b.name.trim(),
      category: b.category,
      price: Number(b.price),
      was_price: b.was_price ? Number(b.was_price) : null,
      age: b.age || '',
      image_url: b.image_url || '',
      badge: b.badge || '',
      description: b.description || ''
    });
    if (Array.isArray(b.variants)) {
      deleteVariants.run(existing.id);
      b.variants.forEach((v) => {
        insertVariant.run({
          product_id: existing.id,
          size: v.size || 'Standard',
          colour: v.colour || '',
          price: v.price ? Number(v.price) : null,
          stock_qty: Number(v.stock_qty) || 0
        });
      });
    }
  });
  run();

  res.json(attachVariants(db.prepare('SELECT * FROM products WHERE id = ?').get(existing.id)));
});

// DELETE /api/products/:id — admin only
router.delete('/:id', requireAuth, (req, res) => {
  const existing = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Toy not found.' });
  db.prepare('DELETE FROM products WHERE id = ?').run(existing.id); // variants cascade
  res.json({ ok: true });
});

module.exports = router;
