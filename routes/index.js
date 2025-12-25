const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
  res.render('index');
});

router.get('/help', (req, res) => {
  res.render('help');
});

router.get('/subscription', (req, res) => {
  console.log('=== GET /subscription (публичный роут) ===');
  console.log('Session ID:', req.sessionID);
  console.log('Session userId:', req.session?.userId);
  console.log('Error query:', req.query.error);
  
  const error = req.query.error || null;
  res.render('subscription', { error });
});

// Редирект для обратной совместимости
router.get('/login', (req, res) => {
  res.redirect('/auth/login');
});

module.exports = router;

