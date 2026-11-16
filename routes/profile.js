const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../config/db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

function passwordErrors(password) {
  const errors = [];
  if (!password || password.length < 8) errors.push('минимум 8 символов');
  if (!/[a-zа-я]/.test(password || '')) errors.push('строчную букву');
  if (!/[A-ZА-Я]/.test(password || '')) errors.push('заглавную букву');
  if (!/\d/.test(password || '')) errors.push('цифру');
  if (!/[^A-Za-zА-Яа-я0-9]/.test(password || '')) errors.push('спецсимвол (!, @, # и т. п.)');
  return errors;
}

async function renderProfile(req, res, extra = {}) {
  const [rows] = await db.query('SELECT id, name, email, role, created_at FROM users WHERE id = ?', [req.session.user.id]);
  const profile = rows[0];
  if (!profile) return res.redirect('/login');
  const [countRows] = await db.query('SELECT COUNT(*) AS count FROM orders WHERE user_id = ?', [req.session.user.id]);
  res.render('profile', { profile, ordersCount: countRows[0].count, error: null, success: null, ...extra });
}

router.get('/profile', requireAuth, async (req, res) => {
  try {
    await renderProfile(req, res);
  } catch (err) {
    console.error(err);
    res.status(500).send('Ошибка загрузки профиля.');
  }
});

router.post('/profile', requireAuth, async (req, res) => {
  const { name, email } = req.body;
  try {
    if (!name || !name.trim() || !email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return renderProfile(req, res, { error: 'Укажите корректные имя и email.' });
    }
    const [exists] = await db.query('SELECT id FROM users WHERE email = ? AND id != ?', [email, req.session.user.id]);
    if (exists.length) return renderProfile(req, res, { error: 'Пользователь с таким email уже существует.' });
    await db.query('UPDATE users SET name = ?, email = ? WHERE id = ?', [name.trim(), email.trim(), req.session.user.id]);
    req.session.user.name = name.trim();
    req.session.user.email = email.trim();
    await renderProfile(req, res, { success: 'Данные профиля обновлены.' });
  } catch (err) {
    console.error(err);
    res.status(500).send('Ошибка сохранения профиля.');
  }
});

router.post('/profile/password', requireAuth, async (req, res) => {
  const { current_password, new_password, confirm_password } = req.body;
  try {
    const [rows] = await db.query('SELECT password_hash FROM users WHERE id = ?', [req.session.user.id]);
    if (!rows.length || !(await bcrypt.compare(current_password || '', rows[0].password_hash))) {
      return renderProfile(req, res, { error: 'Неверный текущий пароль.' });
    }
    if (new_password !== confirm_password) {
      return renderProfile(req, res, { error: 'Новый пароль и подтверждение не совпадают.' });
    }
    const weak = passwordErrors(new_password);
    if (weak.length) {
      return renderProfile(req, res, { error: 'Слабый пароль. Добавьте: ' + weak.join(', ') + '.' });
    }
    const hash = await bcrypt.hash(new_password, 10);
    await db.query('UPDATE users SET password_hash = ? WHERE id = ?', [hash, req.session.user.id]);
    await renderProfile(req, res, { success: 'Пароль изменён.' });
  } catch (err) {
    console.error(err);
    res.status(500).send('Ошибка смены пароля.');
  }
});

module.exports = router;
