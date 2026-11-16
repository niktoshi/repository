const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../config/db');

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

router.get('/register', (req, res) => {
  if (req.session.user) return res.redirect('/');
  res.render('register', { error: null });
});

router.post('/register', async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) {
    return res.render('register', { error: 'Заполните все поля.' });
  }
  const weak = passwordErrors(password);
  if (weak.length) {
    return res.render('register', { error: 'Слабый пароль. Добавьте: ' + weak.join(', ') + '.' });
  }
  try {
    const [exists] = await db.query('SELECT id FROM users WHERE email = ?', [email]);
    if (exists.length) return res.render('register', { error: 'Пользователь с таким email уже существует.' });
    const hash = await bcrypt.hash(password, 10);
    const [result] = await db.query('INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)', [name, email, hash]);
    req.session.user = { id: result.insertId, name, email, role: 'user' };
    res.redirect('/');
  } catch (err) {
    console.error(err);
    res.render('register', { error: 'Ошибка регистрации. Проверьте подключение к MySQL.' });
  }
});

router.get('/login', (req, res) => {
  if (req.session.user) return res.redirect('/');
  res.render('login', { error: null });
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const [rows] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
    const user = rows[0];
    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      return res.render('login', { error: 'Неверный email или пароль.' });
    }
    req.session.user = { id: user.id, name: user.name, email: user.email, role: user.role };
    res.redirect(user.role === 'admin' ? '/admin' : '/');
  } catch (err) {
    console.error(err);
    res.render('login', { error: 'Ошибка входа. Проверьте подключение к MySQL.' });
  }
});

router.get('/logout', (req, res) => {
  req.session.destroy(() => res.redirect('/'));
});

module.exports = router;
