const express = require('express');
const { User, Subscription } = require('../models');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// Страница успешной оплаты
router.get('/success', requireAuth, async (req, res) => {
  try {
    const user = await User.findByPk(req.session.userId);
    
    if (!user) {
      return res.redirect('/auth/login');
    }
    
    // Проверяем, есть ли активная подписка
    const activeSubscription = await Subscription.findOne({
      where: {
        userId: user.id,
        isActive: true,
        paymentStatus: 'succeeded'
      },
      order: [['createdAt', 'DESC']]
    });
    
    res.render('payment-success', {
      user: {
        nickname: user.nickname
      },
      subscription: activeSubscription ? {
        type: activeSubscription.type,
        duration: activeSubscription.duration,
        endDate: activeSubscription.endDate
      } : null
    });
  } catch (error) {
    console.error('Ошибка загрузки страницы успешной оплаты:', error);
    res.redirect('/subscription?error=Ошибка загрузки страницы');
  }
});

// Страница ошибки оплаты
router.get('/error', requireAuth, async (req, res) => {
  try {
    const user = await User.findByPk(req.session.userId);
    
    if (!user) {
      return res.redirect('/auth/login');
    }
    
    res.render('payment-error', {
      user: {
        nickname: user.nickname
      },
      error: req.query.error || 'Ошибка при обработке платежа'
    });
  } catch (error) {
    console.error('Ошибка загрузки страницы ошибки оплаты:', error);
    res.redirect('/subscription?error=Ошибка загрузки страницы');
  }
});

module.exports = router;

