const express = require('express');
const { body, validationResult } = require('express-validator');
const { User } = require('../models');
const router = express.Router();

// Личный кабинет
router.get('/', async (req, res) => {
  try {
    const user = await User.findByPk(req.session.userId);
    if (!user) {
      return res.redirect('/auth/login');
    }

    // Получаем или создаём реферальный код (если нужно)
    if (!user.referralCode) {
      const { getOrCreateReferralCode } = require('../utils/referral');
      await getOrCreateReferralCode(user.id);
      await user.reload();
    }

    res.render('profile', {
      user: {
        nickname: user.nickname,
        email: user.email,
        createdAt: user.createdAt,
        isSubscribed: user.isSubscribed,
        subscriptionEndDate: user.subscriptionEndDate,
        bonusBalance: user.bonusBalance || 0
      },
      query: req.query
    });
  } catch (error) {
    console.error('Ошибка загрузки профиля:', error);
    res.redirect('/auth/login');
  }
});

// Смена пароля
router.post('/change-password', [
  body('currentPassword').notEmpty().withMessage('Введите текущий пароль'),
  body('newPassword').isLength({ min: 6 }).withMessage('Новый пароль должен быть не менее 6 символов'),
  body('confirmPassword').custom((value, { req }) => {
    if (value !== req.body.newPassword) {
      throw new Error('Пароли не совпадают');
    }
    return true;
  })
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const user = await User.findByPk(req.session.userId);
    return res.render('profile', {
      user: {
        nickname: user.nickname,
        email: user.email,
        createdAt: user.createdAt
      },
      passwordError: errors.array()[0].msg
    });
  }

  try {
    const user = await User.findByPk(req.session.userId);
    const isPasswordValid = await user.comparePassword(req.body.currentPassword);

    if (!isPasswordValid) {
      return res.render('profile', {
        user: {
          nickname: user.nickname,
          email: user.email,
          createdAt: user.createdAt
        },
        passwordError: 'Неверный текущий пароль'
      });
    }

    user.password = req.body.newPassword;
    await user.save();

    res.render('profile', {
      user: {
        nickname: user.nickname,
        email: user.email,
        createdAt: user.createdAt
      },
      passwordSuccess: 'Пароль успешно изменен'
    });
  } catch (error) {
    console.error('Ошибка смены пароля:', error);
    res.render('profile', {
      user: {
        nickname: user.nickname,
        email: user.email,
        createdAt: user.createdAt
      },
      passwordError: 'Ошибка при смене пароля'
    });
  }
});

module.exports = router;

