# MANA BOMMALU — Store + Admin + Backend

A connected wooden-toys storefront: one Node.js server, one SQLite database,
two front ends (customer store + admin panel) that both talk to the same
data in real time.

```
Admin adds/edits a toy  →  saved in SQLite  →  instantly visible on the
customer store (just refresh the page — no manual syncing).

Customer picks size/colour + quantity → clicks "Buy Now on WhatsApp"
→ order is saved in the database AND WhatsApp opens with the order
prefilled → order shows up in Admin → WhatsApp Orders automatically.
```

## 1. What you need installed

- **Node.js** version 18 or newer. Check with `node -v`. If you don't have
  it, download from https://nodejs.org (choose the LTS version).

That's it — no separate database to install. SQLite lives in one file
inside `data/store.db`, created automatically the first time you run it.

## 2. Run it

Unzip this folder, open a terminal inside it, then:

```bash
npm install
npm start
```

You'll see:

```
MANA BOMMALU store running:
  Customer site  -> http://localhost:3000/
  Admin panel    -> http://localhost:3000/admin
```

Open those two URLs in your browser (or two tabs).

**First-run admin login:** username `admin`, password `admin123`.
Log in, then go to **Store Settings → Change Admin Password** and set your
own password immediately — this default is only meant to get you in the
door.

To stop the server, go back to the terminal and press `Ctrl + C`.
To start it again later, just run `npm start` from inside the folder —
all your toys, orders, and settings are kept in `data/store.db`.

## 3. First things to do in Admin

1. **Store Settings** — enter your real WhatsApp number (digits only,
   with country code, e.g. `919876543210` for an Indian number). This is
   the number every "Buy Now on WhatsApp" button will message.
2. **Categories** — add/remove the categories you want (a few are seeded
   for you, including "Indian Culture").
3. **Products** — click **+ Add Toy** and fill in:
   - Name, category, base price, optional MRP (for a strikethrough price),
     age group, badge (e.g. "Bestseller"), image URL, description.
   - **Sizes / Colours / Price / Stock** — this is the list of options a
     customer chooses from on the toy's page (e.g. Small/Green, Large/Red).
     Each option has its own stock count; leave "Price override" blank to
     just use the base price for that option.
   - Every toy needs at least one option row, even if it's just one size
     and one colour.
4. Open the customer site and confirm the toy shows up correctly.

## 4. How the image works

There's no file upload — you paste an **image URL** (a link to a photo
already hosted somewhere, e.g. an image you've uploaded to Imgur, Google
Drive with public sharing, your own hosting, etc.). The store fetches and
displays that URL directly. If the field is left blank, a toy emoji is
shown instead so the layout never breaks.

## 5. How orders work

There's no online payment or checkout — by design, this mirrors your
original flow. When a customer sends an order:

1. The order is saved to the database immediately (status `New`).
2. WhatsApp opens with the toy list, quantities and an order reference
   number already typed into the message.
3. You see it appear in **Admin → WhatsApp Orders**, confirm availability
   and delivery with the customer over chat, then update its status
   (Confirmed → Packed → Shipped → Delivered) from the **Update** button.

Stock counts are **not** automatically reduced when an order is placed
(since an order isn't guaranteed until you confirm it on WhatsApp) — after
confirming, edit the toy's stock number yourself in Products so the site
stays accurate.

**Customers** page is not a separate list you maintain — it's built
automatically from the phone numbers on your orders.

## 6. Project structure

```
mana-bommalu-store/
├─ server.js            Express server & startup
├─ db.js                SQLite schema + first-run seed data
├─ middleware/auth.js    Login-token check for admin-only routes
├─ routes/
│  ├─ auth.js           Admin login, password change
│  ├─ products.js       Product + variant (size/colour/stock) CRUD
│  ├─ categories.js     Category list management
│  ├─ orders.js         Order creation (public) + admin updates
│  ├─ customers.js      Customer list (derived from orders)
│  └─ settings.js       Store name, tagline, WhatsApp number
├─ public/
│  ├─ index.html        Customer storefront
│  └─ admin.html        Admin panel
└─ data/store.db        Your database (created automatically)
```

## 7. Putting this on real hosting later

When you're ready to go beyond your own PC:

- Any host that runs Node.js works (Railway, Render, a VPS, etc.) — just
  run the same `npm install && npm start`. Set the `PORT` environment
  variable if your host requires a specific port.
- Set a real `JWT_SECRET` environment variable (a long random string) —
  right now it falls back to a development default, which is fine on
  localhost but should be overridden anywhere public.
- The `data/store.db` file needs to live somewhere with **persistent**
  storage — some hosts wipe the filesystem on redeploy, which would lose
  your toys/orders. If that's the case for your host, ask and we can move
  this to a hosted database instead.

## 8. Troubleshooting

- **`npm install` fails on `better-sqlite3`** — this package needs to
  compile a small native module. On Windows, installing "Desktop
  development with C++" via the Visual Studio Build Tools (free) fixes
  it; on Mac, installing Xcode Command Line Tools (`xcode-select
  --install`) fixes it. This is a one-time setup step.
- **Port 3000 already in use** — run `PORT=3001 npm start` (Mac/Linux) or
  set `PORT=3001` before running on Windows, then open
  `http://localhost:3001`.
- **Customer site shows "Couldn't load the store"** — the backend isn't
  running. Make sure the terminal running `npm start` is still open.
