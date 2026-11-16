const express = require('express');
const db = require('../config/db');

const router = express.Router();

router.get('/catalog', async (req, res) => {
  const { search = '', category = '' } = req.query;
  let sql = 'SELECT p.*, c.name AS category_name FROM products p LEFT JOIN categories c ON c.id = p.category_id WHERE 1=1';
  const params = [];
  if (search) { sql += ' AND p.name LIKE ?'; params.push(`%${search}%`); }
  if (category) { sql += ' AND p.category_id = ?'; params.push(category); }
  sql += ' ORDER BY p.id';
  try {
    const [products] = await db.query(sql, params);
    const [categories] = await db.query('SELECT * FROM categories ORDER BY name');
    res.render('catalog', { products, categories, search, categoryId: category, currentUrl: req.originalUrl });
  } catch (err) {
    console.error(err);
    res.status(500).send('Ошибка загрузки каталога. Проверьте подключение к MySQL.');
  }
});

router.get('/product/:id', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT p.*, c.name AS category_name FROM products p LEFT JOIN categories c ON c.id = p.category_id WHERE p.id = ?', [req.params.id]);
    if (!rows.length) return res.status(404).send('Товар не найден');
    res.render('product', { product: rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).send('Ошибка загрузки товара.');
  }
});

module.exports = router;
