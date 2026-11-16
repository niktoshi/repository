const express = require('express');
const db = require('../config/db');
const { requireAdmin } = require('../middleware/auth');

const router = express.Router();
const ALLOWED_STATUSES = ['new', 'processing', 'completed', 'cancelled'];

let stockColumnReady = false;
async function ensureStockDeductedColumn() {
  if (stockColumnReady) return;
  const [cols] = await db.query("SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'orders'");
  const names = new Set(cols.map(c => c.COLUMN_NAME));
  if (!names.has('stock_deducted')) {
    await db.query('ALTER TABLE orders ADD COLUMN stock_deducted TINYINT(1) NOT NULL DEFAULT 0');
    await db.query("UPDATE orders SET stock_deducted = 1 WHERE payment_status = 'paid'");
  }
  stockColumnReady = true;
}

router.get('/admin', requireAdmin, async (req, res) => {
  try {
    await ensureStockDeductedColumn();
    const [products] = await db.query('SELECT p.*, c.name AS category_name FROM products p LEFT JOIN categories c ON c.id = p.category_id ORDER BY p.id');
    const [categories] = await db.query('SELECT * FROM categories ORDER BY name');
    const [orders] = await db.query('SELECT o.*, u.name AS user_name, u.email AS user_email FROM orders o JOIN users u ON u.id = o.user_id ORDER BY o.created_at DESC');
    res.render('admin', { products, categories, orders, error: req.query.error || null, success: req.query.success || null });
  } catch (err) {
    console.error(err);
    res.status(500).send('Ошибка загрузки админ-панели.');
  }
});

router.post('/admin/products', requireAdmin, async (req, res) => {
  const { name, description, price, stock, category_id } = req.body;
  await db.query('INSERT INTO products (name, description, price, stock, category_id) VALUES (?, ?, ?, ?, ?)', [name, description || null, price, stock, category_id || null]);
  res.redirect('/admin');
});

router.post('/admin/products/:id/stock', requireAdmin, async (req, res) => {
  await db.query('UPDATE products SET stock = ? WHERE id = ?', [req.body.stock, req.params.id]);
  res.redirect('/admin');
});

router.post('/admin/products/:id/delete', requireAdmin, async (req, res) => {
  try { await db.query('DELETE FROM products WHERE id = ?', [req.params.id]); } catch (err) { console.error(err); }
  res.redirect('/admin');
});

router.post('/admin/orders/:id/status', requireAdmin, async (req, res) => {
  const orderId = Number(req.params.id);
  const status = String(req.body.status || '');
  if (!Number.isInteger(orderId) || !ALLOWED_STATUSES.includes(status)) {
    return res.redirect('/admin?error=' + encodeURIComponent('Неверный заказ или статус.'));
  }
  try {
    await ensureStockDeductedColumn();
    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();
      const [rows] = await conn.query('SELECT * FROM orders WHERE id = ? FOR UPDATE', [orderId]);
      if (!rows.length) throw new Error('Заказ не найден.');
      const order = rows[0];
      if (status === 'completed' && !order.stock_deducted) {
        const [items] = await conn.query('SELECT * FROM order_items WHERE order_id = ?', [orderId]);
        for (const item of items) {
          const [prows] = await conn.query('SELECT stock, name FROM products WHERE id = ? FOR UPDATE', [item.product_id]);
          const p = prows[0];
          if (!p || p.stock < item.quantity) throw new Error('Нельзя завершить заказ: недостаточно на складе товара ' + (p ? p.name : item.product_id));
        }
        for (const item of items) {
          await conn.query('UPDATE products SET stock = stock - ? WHERE id = ?', [item.quantity, item.product_id]);
        }
        await conn.query('UPDATE orders SET stock_deducted = 1 WHERE id = ?', [orderId]);
      }
      const [result] = await conn.query('UPDATE orders SET status = ? WHERE id = ?', [status, orderId]);
      if (!result.affectedRows) throw new Error('Статус заказа не обновился.');
      await conn.commit();
      res.redirect('/admin?success=' + encodeURIComponent('Статус заказа #' + orderId + ' сохранён: ' + status));
    } catch (err) {
      await conn.rollback();
      console.error(err);
      res.redirect('/admin?error=' + encodeURIComponent(err.message || 'Ошибка смены статуса заказа.'));
    } finally {
      conn.release();
    }
  } catch (err) {
    console.error(err);
    res.status(500).send('Ошибка смены статуса заказа. Проверьте подключение к MySQL.');
  }
});

module.exports = router;
