// db.js — opens (or creates) the SQLite database, builds the schema if it
// doesn't exist yet, and seeds it with starter data ONLY the very first time
// the app runs (so your real edits are never overwritten on restart).

const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const Database = require('better-sqlite3');

const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const db = new Database(path.join(dataDir, 'store.db'));
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
CREATE TABLE IF NOT EXISTS categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT UNIQUE NOT NULL
);

CREATE TABLE IF NOT EXISTS products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  price REAL NOT NULL,
  was_price REAL,
  age TEXT,
  image_url TEXT,
  badge TEXT,
  description TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS variants (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  size TEXT,
  colour TEXT,
  price REAL,
  stock_qty INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  customer_name TEXT,
  phone TEXT,
  items TEXT NOT NULL,
  total REAL NOT NULL,
  status TEXT DEFAULT 'New',
  source TEXT DEFAULT 'whatsapp',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT
);

CREATE TABLE IF NOT EXISTS admin_users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL
);
`);

// ---- first-run seed -------------------------------------------------
const categoryCount = db.prepare('SELECT COUNT(*) AS n FROM categories').get().n;
if (categoryCount === 0) {
  const insertCat = db.prepare('INSERT INTO categories (name) VALUES (?)');
  const seedCats = ['Indian Culture', 'Educational Toys', 'Baby Toys', 'Dolls', 'Outdoor Toys'];
  const insertMany = db.transaction((cats) => cats.forEach((c) => insertCat.run(c)));
  insertMany(seedCats);

  const insertProduct = db.prepare(`
    INSERT INTO products (name, category, price, was_price, age, image_url, badge, description)
    VALUES (@name, @category, @price, @was_price, @age, @image_url, @badge, @description)
  `);
  const insertVariant = db.prepare(`
    INSERT INTO variants (product_id, size, colour, price, stock_qty)
    VALUES (@product_id, @size, @colour, @price, @stock_qty)
  `);

  const seed = db.transaction(() => {
    const p1 = insertProduct.run({
      name: 'Farmer With Kavidi (Etikoppaka)',
      category: 'Indian Culture',
      price: 299,
      was_price: null,
      age: '3+ yrs',
      image_url: '',
      badge: 'Handmade',
      description: 'A beautifully handcrafted traditional village-life figurine from Etikoppaka, made using eco-friendly wood and natural dyes. Captures the timeless charm of Indian folk tradition — perfect for cultural displays, gifting, or ethnic decor.'
    });
    insertVariant.run({ product_id: p1.lastInsertRowid, size: 'Standard', colour: 'Natural', price: null, stock_qty: 12 });

    const p2 = insertProduct.run({
      name: 'Sanded Beech Building Blocks',
      category: 'Educational Toys',
      price: 899,
      was_price: 1199,
      age: '1–4 yrs',
      image_url: '',
      badge: 'Bestseller',
      description: '32 hand-sanded beech blocks in soft geometric shapes, finished with child-safe natural oil.'
    });
    insertVariant.run({ product_id: p2.lastInsertRowid, size: '32-piece Set', colour: 'Natural Wood', price: null, stock_qty: 20 });

    const p3 = insertProduct.run({
      name: 'Marigold Rag Doll',
      category: 'Dolls',
      price: 749,
      was_price: null,
      age: '2+ yrs',
      image_url: '',
      badge: 'Handmade',
      description: 'A soft cotton rag doll stitched by hand with embroidered features.'
    });
    insertVariant.run({ product_id: p3.lastInsertRowid, size: 'Small (25cm)', colour: 'Yellow', price: null, stock_qty: 15 });
    insertVariant.run({ product_id: p3.lastInsertRowid, size: 'Large (40cm)', colour: 'Red', price: 999, stock_qty: 8 });
  });
  seed();
}

const settingsCount = db.prepare('SELECT COUNT(*) AS n FROM settings').get().n;
if (settingsCount === 0) {
  const insertSetting = db.prepare('INSERT INTO settings (key, value) VALUES (?, ?)');
  const insertMany = db.transaction((rows) => rows.forEach(([k, v]) => insertSetting.run(k, v)));
  insertMany([
    ['store_name', 'MANA BOMMALU'],
    ['tagline', 'Toys made to be loved'],
    ['whatsapp_number', ''] // digits only, e.g. 919876543210 — set this from Admin > Store Settings
  ]);
}

const adminCount = db.prepare('SELECT COUNT(*) AS n FROM admin_users').get().n;
if (adminCount === 0) {
  const hash = bcrypt.hashSync('admin123', 10);
  db.prepare('INSERT INTO admin_users (username, password_hash) VALUES (?, ?)').run('admin', hash);
  console.log('\n[first run] Created default admin login -> username: admin  password: admin123');
  console.log('[first run] Please log in and change this immediately from a real account flow before going live.\n');
}

module.exports = db;
