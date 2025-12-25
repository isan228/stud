const express = require('express');
const { body, validationResult } = require('express-validator');
const { User } = require('../models');
const { Op } = require('sequelize');
const router = express.Router();

// Страница регистрации (редирект на подписку)
router.get('/register', (req, res) => {
  if (req.session.userId) {
    return res.redirect('/profile');
  }
  // Редирект на страницу подписки
  res.redirect('/subscription');
});

// Обработка регистрации
router.post('/register', [
  body('nickname').trim().isLength({ min: 3 }).withMessage('Никнейм должен быть не менее 3 символов'),
  body('email').isEmail().withMessage('Некорректный email'),
  body('password').isLength({ min: 6 }).withMessage('Пароль должен быть не менее 6 символов'),
  body('confirmPassword').custom((value, { req }) => {
    if (value !== req.body.password) {
      throw new Error('Пароли не совпадают');
    }
    return true;
  })
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.redirect('/subscription?error=' + encodeURIComponent(errors.array()[0].msg));
  }

  try {
    const { nickname, email, password, publicOffer, dataConsent, subscriptionType, subscriptionDuration } = req.body;

    if (!publicOffer || !dataConsent) {
      return res.redirect('/subscription?error=' + encodeURIComponent('Необходимо согласиться с условиями'));
    }

    const existingUser = await User.findOne({
      where: {
        [Op.or]: [
          { nickname },
          { email }
        ]
      }
    });

    if (existingUser) {
      return res.redirect('/subscription?error=' + encodeURIComponent('Пользователь с таким никнеймом или email уже существует'));
    }

    const user = await User.create({
      nickname,
      email,
      password
    });

    req.session.userId = user.id;
    req.session.userNickname = user.nickname;
    
    console.log('=== Регистрация успешна ===');
    console.log('User ID:', user.id);
    console.log('Session ID:', req.sessionID);
    console.log('Session userId после установки:', req.session.userId);
    
    // Сохраняем сессию и устанавливаем cookie явно
    req.session.save((err) => {
      if (err) {
        console.error('Ошибка сохранения сессии после регистрации:', err);
        return res.redirect('/subscription?error=' + encodeURIComponent('Ошибка при сохранении сессии. Попробуйте войти.'));
      }
      
      console.log('Сессия сохранена, userId:', req.session.userId);
      console.log('Session ID после сохранения:', req.sessionID);
      
      // НЕ устанавливаем cookie явно - express-session делает это автоматически
      // Явная установка может конфликтовать с подписью express-session
      
      console.log('Cookie перед редиректом:', req.headers.cookie);
      console.log('Set-Cookie заголовки:', res.getHeader('Set-Cookie'));
      
      // Если указана подписка, переходим на страницу оплаты
      if (subscriptionType && subscriptionDuration) {
        const paymentUrl = `/payment?type=${encodeURIComponent(subscriptionType)}&duration=${encodeURIComponent(subscriptionDuration)}`;
        console.log('Редирект на /payment с параметрами:', subscriptionType, subscriptionDuration);
        console.log('Полный URL редиректа:', paymentUrl);
        res.redirect(paymentUrl);
      } else {
        res.redirect('/profile');
      }
    });
  } catch (error) {
    console.error('Ошибка регистрации:', error);
    res.redirect('/subscription?error=' + encodeURIComponent('Ошибка при регистрации. Попробуйте позже.'));
  }
});

// Страница входа
router.get('/login', (req, res) => {
  if (req.session.userId) {
    return res.redirect('/profile');
  }
  res.render('login', { error: null });
});

// Обработка входа
router.post('/login', async (req, res) => {
  try {
    const { nickname, password } = req.body;

    const user = await User.findOne({ where: { nickname } });

    if (!user) {
      return res.render('login', { error: 'Неверный никнейм или пароль' });
    }

    const isPasswordValid = await user.comparePassword(password);

    if (!isPasswordValid) {
      return res.render('login', { error: 'Неверный никнейм или пароль' });
    }

    // Проверка на множественный вход (можно расширить логику)
    req.session.userId = user.id;
    req.session.userNickname = user.nickname;
    req.session.isAdmin = user.isAdmin;
    req.session.isModerator = user.isModerator;
    req.session.loginTime = new Date();
    
    console.log('=== Вход успешен ===');
    console.log('User ID:', user.id);
    console.log('Session ID:', req.sessionID);
    console.log('Session userId после установки:', req.session.userId);
    
    // Сохраняем сессию перед редиректом
    req.session.save((err) => {
      if (err) {
        console.error('Ошибка сохранения сессии после входа:', err);
        return res.render('login', { error: 'Ошибка при сохранении сессии. Попробуйте еще раз.' });
      }
      
      console.log('Сессия сохранена, userId:', req.session.userId);
      
      // Редирект администратора в админку
      if (user.isAdmin) {
        res.redirect('/admin');
      } else {
        res.redirect('/profile');
      }
    });
  } catch (error) {
    console.error('Ошибка входа:', error);
    res.render('login', { error: 'Ошибка при входе. Попробуйте позже.' });
  }
});

// Выход
router.get('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/auth/login');
});

module.exports = router;

