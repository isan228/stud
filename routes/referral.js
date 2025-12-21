const express = require('express');
const { body, validationResult } = require('express-validator');
const { User, Referral, BonusTransaction, Subscription } = require('../models');
const { requireAuth } = require('../middleware/auth');
const { getOrCreateReferralCode, cleanupExpiredReferrals, expireOldBonuses } = require('../utils/referral');
const { Op } = require('sequelize');
const router = express.Router();

// Все роуты требуют авторизации
router.use(requireAuth);

// Страница реферальной программы
router.get('/', async (req, res) => {
  try {
    const user = await User.findByPk(req.session.userId);
    if (!user) {
      return res.redirect('/auth/login');
    }

    // Получаем или создаём реферальный код
    const referralCode = await getOrCreateReferralCode(user.id);
    const referralLink = `${req.protocol}://${req.get('host')}/register?ref=${referralCode}`;

    // Статистика рефералов
    const activeReferrals = await Referral.count({
      where: {
        referrerId: user.id,
        isActive: true,
        hasPurchased: false
      }
    });

    const completedReferrals = await Referral.count({
      where: {
        referrerId: user.id,
        hasPurchased: true
      }
    });

    // Список рефералов
    const referrals = await Referral.findAll({
      where: {
        referrerId: user.id
      },
      include: [{
        model: User,
        as: 'referred',
        attributes: ['id', 'nickname', 'email', 'createdAt']
      }],
      order: [['createdAt', 'DESC']],
      limit: 50
    });

    // История бонусных транзакций
    const transactions = await BonusTransaction.findAll({
      where: {
        userId: user.id
      },
      order: [['createdAt', 'DESC']],
      limit: 50
    });

    // Активные бонусы (не истекшие)
    const activeBonuses = await BonusTransaction.findAll({
      where: {
        userId: user.id,
        isExpired: false,
        amount: { [Op.gt]: 0 },
        expiresAt: {
          [Op.gte]: new Date()
        }
      },
      order: [['expiresAt', 'ASC']]
    });

    res.render('referral', {
      user: {
        nickname: user.nickname,
        bonusBalance: user.bonusBalance || 0,
        referralCode: referralCode
      },
      referralLink,
      activeReferrals,
      completedReferrals,
      referrals,
      transactions,
      activeBonuses
    });
  } catch (error) {
    console.error('Ошибка загрузки реферальной программы:', error);
    res.render('error', { error: 'Ошибка загрузки реферальной программы' });
  }
});

// Обработка реферальной ссылки при регистрации
router.get('/register', (req, res) => {
  const referralCode = req.query.ref;
  if (referralCode) {
    res.redirect(`/subscription?ref=${referralCode}`);
  } else {
    res.redirect('/subscription');
  }
});

module.exports = router;



