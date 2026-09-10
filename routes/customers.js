const express = require('express');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// GET /api/customers — admin only
// Customers are derived live from orders.
// If a phone number exists, it is used as the customer key.
// Otherwise, the customer name is used so WhatsApp orders without
// a phone number still appear in the Customers page.
router.get('/', requireAuth, (req, res) => {
  const rows = db.prepare(`
    SELECT
      CASE
        WHEN phone IS NOT NULL AND phone != '' THEN phone
        ELSE 'name:' || COALESCE(customer_name, 'WhatsApp customer')
      END AS customer_key,

      MAX(customer_name) AS name,

      CASE
        WHEN MAX(phone) IS NULL OR MAX(phone) = '' THEN ''
        ELSE MAX(phone)
      END AS phone,

      COUNT(*) AS orders,

      MAX(created_at) AS last

    FROM orders

    GROUP BY
      CASE
        WHEN phone IS NOT NULL AND phone != '' THEN phone
        ELSE 'name:' || COALESCE(customer_name, 'WhatsApp customer')
      END

    ORDER BY last DESC
  `).all();

  res.json(rows);
});

module.exports = router;