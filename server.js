require('dotenv').config();
const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const path = require('path');
const { sequelize } = require('./models');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware безопасности
app.use((req, res, next) => {
  // Заголовки безопасности для защиты от скриншотов и записи экрана
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // Content Security Policy - строгая политика безопасности
  res.setHeader('Content-Security-Policy', 
    "default-src 'self'; " +
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net; " +
    "style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; " +
    "font-src 'self' https://cdn.jsdelivr.net data:; " +
    "img-src 'self' data: blob:; " +
    "connect-src 'self'; " +
    "media-src 'none'; " +
    "object-src 'none'; " +
    "frame-src 'none'; " +
    "frame-ancestors 'none';"
  );
  
  // Запрет на кэширование страниц с контентом
  if (req.path.startsWith('/tests/') || req.path.startsWith('/profile') || req.path.startsWith('/referral')) {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
  }
  
  next();
});

// Middleware
app.use(cookieParser());
app.use(bodyParser.urlencoded({ extended: true }));

// Сохранение raw body для верификации подписи Finik
app.use(bodyParser.json({
  verify: (req, res, buf) => {
    req.rawBody = buf.toString('utf8');
  }
}));
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Настройка сессий
app.use(session({
  secret: process.env.SESSION_SECRET || 'stud-platform-secret-key-2025',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.SECURE_COOKIES === 'true' || false,
    maxAge: 24 * 60 * 60 * 1000 // 24 часа
  }
}));

// Установка EJS как шаблонизатора
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Импорт middleware
const { requireAuth } = require('./middleware/auth');
const { trackSecurityViolation } = require('./middleware/security');

// Middleware для передачи user в шаблоны
app.use((req, res, next) => {
  if (req.session.userId) {
    res.locals.user = { 
      id: req.session.userId, 
      nickname: req.session.userNickname,
      isAdmin: req.session.isAdmin || false,
      isModerator: req.session.isModerator || false
    };
  }
  next();
});

// Роуты безопасности (до других роутов)
app.use('/api/security', require('./routes/security'));

// Применение защиты безопасности к защищенным роутам
app.use('/profile', trackSecurityViolation);
app.use('/tests', trackSecurityViolation);
app.use('/referral', trackSecurityViolation);
app.use('/subscription', trackSecurityViolation);
app.use('/payment', trackSecurityViolation);

// Роуты
app.use('/', require('./routes/index'));
app.use('/auth', require('./routes/auth'));
app.use('/profile', requireAuth, require('./routes/profile'));
app.use('/tests', requireAuth, require('./routes/tests'));
app.use('/api', requireAuth, require('./routes/api'));
app.use('/admin', require('./routes/admin'));
app.use('/admin', require('./routes/admin-direct-questions'));
app.use('/admin', require('./routes/admin-pdf'));
app.use('/referral', require('./routes/referral'));
app.use('/subscription', require('./routes/subscription'));
app.use('/payment', require('./routes/payment'));
app.use('/payment', require('./routes/payment-success'));
app.use('/payment/finik', require('./routes/finik-payment'));
app.use('/webhooks/finik', require('./routes/finik-webhook'));

// Обработка ошибок
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).render('error', { error: err.message });
});

// Запуск сервера
sequelize.authenticate()
  .then(() => {
    console.log('Подключение к базе данных установлено.');
    
    // Запуск периодической очистки истекших данных
    const { runCleanup } = require('./cron/cleanup');
    runCleanup(); // Запуск сразу
    setInterval(runCleanup, 24 * 60 * 60 * 1000); // Затем каждые 24 часа
    
    app.listen(PORT, () => {
      console.log(`Сервер запущен на http://localhost:${PORT}`);
    });
  })
  .catch(err => {
    console.error('Ошибка подключения к базе данных:', err);
  });
