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

    // Если указана подписка, переходим на страницу оплаты
    if (subscriptionType && subscriptionDuration) {
      res.redirect(`/payment?type=${subscriptionType}&duration=${subscriptionDuration}`);
    } else {
      res.redirect('/profile');
    }
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

    // Редирект администратора в админку
    if (user.isAdmin) {
      res.redirect('/admin');
    } else {
      res.redirect('/profile');
    }
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

