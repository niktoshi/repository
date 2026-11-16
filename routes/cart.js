const express = require('express');
const db = require('../config/db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

function getCart(req) {
  if (!Array.isArray(req.session.cart)) req.session.cart = [];
  return req.session.cart;
}

function isValidReturnTo(value) {
  return typeof value === 'string' && value.startsWith('/') && !value.startsWith('//');
}

async function loadItems(cart) {
  if (!cart.length) return { items: [], total: 0 };
  const ids = cart.map(i => i.product_id);
  const placeholders = ids.map(() => '?').join(',');
  const [rows] = await db.query('SELECT * FROM products WHERE id IN (' + placeholders + ')', ids);
  const items = cart.map(ci => {
    const p = rows.find(r => r.id === ci.product_id);
    return p ? { ...p, quantity: ci.quantity } : null;
  }).filter(Boolean);
  const total = items.reduce((s, i) => s + Number(i.price) * i.quantity, 0);
  return { items, total };
}


function detectCardBrand(num) {
  if (/^4/.test(num)) return { id: 'visa', name: 'Visa' };
  if (/^(5[1-5]|2[2-7])/.test(num)) return { id: 'mastercard', name: 'Mastercard' };
  if (/^220[0-4]/.test(num)) return { id: 'mir', name: 'Мир' };
  if (/^3[47]/.test(num)) return { id: 'amex', name: 'American Express' };
  if (/^6/.test(num)) return { id: 'discover', name: 'Discover' };
  return { id: 'card', name: 'Банковская карта' };
}

let paymentColumnsReady = false;
async function ensurePaymentColumns() {
  if (paymentColumnsReady) return;
  const [cols] = await db.query("SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'orders'");
  const names = new Set(cols.map(c => c.COLUMN_NAME));
  const wanted = [
    ['payment_status', "VARCHAR(20) NOT NULL DEFAULT 'unpaid'"],
    ['payment_method', 'VARCHAR(30) NULL'],
    ['card_last4', 'VARCHAR(4) NULL']
  ];
  for (const [name, def] of wanted) {
    if (!names.has(name)) await db.query('ALTER TABLE orders ADD COLUMN ' + name + ' ' + def);
  }
  paymentColumnsReady = true;
}

router.get('/cart', async (req, res) => {
  try {
    const { items, total } = await loadItems(getCart(req));
    res.render('cart', { items, total, error: req.query.error || null });
  } catch (err) {
    console.error(err);
    res.status(500).send('Ошибка загрузки корзины.');
  }
});

router.post('/cart/add', async (req, res) => {
  const productId = Number(req.body.product_id);
  const quantity = Math.max(1, Number(req.body.quantity) || 1);
  const fallback = isValidReturnTo(req.body.return_to) ? req.body.return_to : '/cart';
  try {
    const [rows] = await db.query('SELECT stock FROM products WHERE id = ?', [productId]);
    if (!rows.length) return res.redirect('/catalog');
    if (rows[0].stock < 1) return res.redirect(fallback);
    const cart = getCart(req);
    const item = cart.find(i => i.product_id === productId);
    if (item) item.quantity = Math.min(rows[0].stock, item.quantity + quantity);
    else cart.push({ product_id: productId, quantity: Math.min(rows[0].stock, quantity) });
    res.redirect(fallback);
  } catch (err) {
    console.error(err);
    res.redirect('/catalog');
  }
});

router.post('/cart/update', async (req, res) => {
  const productId = Number(req.body.product_id);
  const quantity = Number(req.body.quantity);
  const cart = getCart(req);
  if (!Number.isFinite(quantity) || quantity <= 0) {
    req.session.cart = cart.filter(i => i.product_id !== productId);
    return res.redirect('/cart');
  }
  try {
    const [rows] = await db.query('SELECT stock, name FROM products WHERE id = ?', [productId]);
    if (!rows.length) return res.redirect('/cart');
    if (quantity > rows[0].stock) {
      return res.redirect('/cart?error=' + encodeURIComponent('На складе только ' + rows[0].stock + ' шт. товара «' + rows[0].name + '»'));
    }
    const item = cart.find(i => i.product_id === productId);
    if (item) item.quantity = quantity;
    res.redirect('/cart');
  } catch (err) {
    console.error(err);
    res.redirect('/cart');
  }
});

router.post('/cart/remove', (req, res) => {
  const productId = Number(req.body.product_id);
  req.session.cart = getCart(req).filter(i => i.product_id !== productId);
  res.redirect('/cart');
});

router.post('/cart/clear', (req, res) => {
  req.session.cart = [];
  res.redirect('/cart');
});

router.get('/payment', requireAuth, async (req, res) => {
  const cart = getCart(req);
  if (!cart.length) return res.redirect('/cart');
  try {
    const { items, total } = await loadItems(cart);
    res.render('payment', { items, total, error: null, form: {} });
  } catch (err) {
    console.error(err);
    res.status(500).send('Ошибка загрузки страницы оплаты.');
  }
});

router.post('/checkout', (req, res) => res.redirect('/payment'));

router.post('/payment', requireAuth, async (req, res) => {
  const cart = getCart(req);
  if (!cart.length) return res.redirect('/cart');
  const cardName = String(req.body.card_name || '').trim();
  const cardNumber = String(req.body.card_number || '').replace(/\D/g, '');
  const expiry = String(req.body.expiry || '').trim();
  const cvc = String(req.body.cvc || '').trim();
  const form = { card_name: cardName, expiry };
  async function fail(message) {
    const { items, total } = await loadItems(cart);
    return res.status(400).render('payment', { items, total, error: message, form });
  }
  if (cardName.length < 3) return fail('Укажите имя владельца карты.');
  if (cardNumber.length < 13 || cardNumber.length > 19) return fail('Неверный номер карты. Введите номер вашей карты — от 13 до 19 цифр.');
  const m = expiry.match(/^(\d{2})\/(\d{2})$/);
  if (!m) return fail('Срок действия укажите в формате ММ/ГГ.');
  const expMonth = Number(m[1]);
  const expYear = 2000 + Number(m[2]);
  const now = new Date();
  if (expMonth < 1 || expMonth > 12 || expYear < now.getFullYear() || (expYear === now.getFullYear() && expMonth < now.getMonth() + 1)) return fail('Срок действия карты истёк.');
  if (!/^\d{3,4}$/.test(cvc)) return fail('CVC — 3 цифры с обратной стороны карты.');
  try {
    await ensurePaymentColumns();
    await new Promise(r => setTimeout(r, 900));
    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();
      let total = 0;
      const items = [];
      for (const ci of cart) {
        const [rows] = await conn.query('SELECT * FROM products WHERE id = ? FOR UPDATE', [ci.product_id]);
        const p = rows[0];
        if (!p || p.stock < ci.quantity) throw new Error('Недостаточно на складе: ' + (p ? p.name : 'товар'));
        total += Number(p.price) * ci.quantity;
        items.push({ ...p, quantity: ci.quantity });
      }
      const brand = detectCardBrand(cardNumber);
      const last4 = cardNumber.slice(-4);
      const [order] = await conn.query("INSERT INTO orders (user_id, total, status, payment_status, payment_method, card_last4) VALUES (?, ?, 'new', 'paid', ?, ?)", [req.session.user.id, total, brand.id, last4]);
      for (const item of items) {
        await conn.query('INSERT INTO order_items (order_id, product_id, quantity, price) VALUES (?, ?, ?, ?)', [order.insertId, item.id, item.quantity, item.price]);
      }
      await conn.commit();
      req.session.cart = [];
      res.render('order-success', { orderId: order.insertId, total, payment: { status: 'Оплачено', method: brand.name, last4 } });
    } catch (err) {
      await conn.rollback();
      console.error(err);
      return fail(err.message || 'Ошибка оформления заказа.');
    } finally {
      conn.release();
    }
  } catch (err) {
    console.error(err);
    res.status(500).send('Ошибка фейковой оплаты. Проверьте подключение к MySQL.');
  }
});

module.exports = router;
