const express = require('express');
const db = require('../config/db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.get('/orders', requireAuth, async (req, res) => {
  try {
    const [orders] = await db.query('SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC, id DESC', [req.session.user.id]);
    if (!orders.length) return res.render('orders', { orders: [] });
    const ids = orders.map(o => o.id);
    const placeholders = ids.map(() => '?').join(',');
    const [items] = await db.query('SELECT oi.*, p.name AS product_name, p.image_url FROM order_items oi LEFT JOIN products p ON p.id = oi.product_id WHERE oi.order_id IN (' + placeholders + ') ORDER BY oi.id', ids);
    const withItems = orders.map(o => ({ ...o, items: items.filter(i => i.order_id === o.id) }));
    res.render('orders', { orders: withItems });
  } catch (err) {
    console.error(err);
    res.status(500).send('Ошибка загрузки заказов.');
  }
});

module.exports = router;
