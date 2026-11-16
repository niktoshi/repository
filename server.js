const express = require('express');
const session = require('express-session');
const path = require('path');
const authRoutes = require('./routes/auth');
const productRoutes = require('./routes/products');
const cartRoutes = require('./routes/cart');
const adminRoutes = require('./routes/admin');
const orderRoutes = require('./routes/orders');
const profileRoutes = require('./routes/profile');

const app = express();
const PORT = process.env.PORT || 3000;

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(session({
  secret: 'stroymarket-secret-change-me',
  resave: false,
  saveUninitialized: false
}));
app.use((req, res, next) => {
  if (!Array.isArray(req.session.cart)) req.session.cart = [];
  res.locals.user = req.session.user || null;
  next();
});

app.use(authRoutes);
app.use(productRoutes);
app.use(cartRoutes);
app.use(adminRoutes);
app.use(orderRoutes);
app.use(profileRoutes);

app.get('/', (req, res) => {
  res.render('index', { title: 'СтройМаркет — стройматериалы' });
});

app.listen(PORT, () => {
  console.log(`Сервер запущен: http://localhost:${PORT}`);
});
