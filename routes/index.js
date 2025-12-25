const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
  res.render('index');
});

router.get('/help', (req, res) => {
  res.render('help');
});

router.get('/subscription', async (req, res) => {
  console.log('=== GET /subscription (публичный роут) ===');
  console.log('Session ID:', req.sessionID);
  console.log('Session userId:', req.session?.userId);
  console.log('Error query:', req.query.error);
  
  const error = req.query.error || null;
  
  // Если пользователь авторизован, получаем его данные
  let user = null;
  if (req.session?.userId) {
    try {
      const { User } = require('../models');
      user = await User.findByPk(req.session.userId, {
        attributes: ['id', 'nickname', 'email', 'bonusBalance']
      });
      console.log('Пользователь найден:', user?.nickname);
    } catch (err) {
      console.error('Ошибка получения пользователя:', err);
    }
  }
  
  res.render('subscription', { error, user });
});

// Редирект для обратной совместимости
router.get('/login', (req, res) => {
  res.redirect('/auth/login');
});

module.exports = router;

