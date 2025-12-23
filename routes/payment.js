const express = require('express');
const { body, validationResult } = require('express-validator');
const { User, Subscription, BonusTransaction, Referral } = require('../models');
const { requireAuth } = require('../middleware/auth');
const { awardReferralBonuses, createReferral } = require('../utils/referral');
const { Op } = require('sequelize');
const router = express.Router();

// Все роуты требуют авторизации
router.use(requireAuth);

// Цены подписок
const PRICES = {
  individual: { 1: 1000, 3: 2700, 6: 5000 },
  group: { 3: 2400, 6: 4500 }
};

// Страница оплаты
router.get('/', async (req, res) => {
  try {
    const { type, duration } = req.query;
    const user = await User.findByPk(req.session.userId);

    if (!user) {
      return res.redirect('/auth/login');
    }

    if (!type || !duration) {
      return res.redirect('/subscription?error=Выберите тип и длительность подписки');
    }

    const basePrice = PRICES[type]?.[parseInt(duration)];
    if (!basePrice) {
      return res.redirect('/subscription?error=Неверная комбинация типа и длительности подписки');
    }

    const typeText = type === 'individual' ? 'Индивидуальная' : 'Групповая';
    const durationText = duration === '1' ? '1 месяц' : duration === '3' ? '3 месяца' : '6 месяцев';

    res.render('payment', {
      user: {
        nickname: user.nickname,
        bonusBalance: user.bonusBalance || 0
      },
      subscription: {
        type,
        duration: parseInt(duration),
        typeText,
        durationText,
        basePrice
      },
      error: req.query.error || null,
      success: req.query.success || null
    });
  } catch (error) {
    console.error('Ошибка загрузки страницы оплаты:', error);
    res.redirect('/subscription?error=Ошибка загрузки страницы оплаты');
  }
});

// Проверка реферального кода (AJAX)
router.post('/check-referral', async (req, res) => {
  try {
    const { referralCode } = req.body;
    const user = await User.findByPk(req.session.userId);

    if (!user) {
      return res.json({ error: 'Необходима авторизация' });
    }

    if (!referralCode || !referralCode.trim()) {
      return res.json({ error: 'Введите реферальный код' });
    }

    const referrer = await User.findOne({
      where: {
        referralCode: referralCode.toUpperCase().trim()
      }
    });

    if (!referrer) {
      return res.json({ error: 'Реферальный код не найден' });
    }

    if (referrer.id === user.id) {
      return res.json({ error: 'Нельзя использовать свой собственный реферальный код' });
    }

    // Проверяем, не существует ли уже связь
    const existingReferral = await Referral.findOne({
      where: {
        referrerId: referrer.id,
        referredId: user.id
      }
    });

    if (existingReferral) {
      if (existingReferral.hasPurchased) {
        return res.json({ error: 'Реферальный код уже был использован при предыдущей покупке' });
      }
      return res.json({
        success: true,
        message: 'Реферальный код подтвержден. Применена скидка 50 сом. После покупки подписки вы и пригласивший получите по 50 бонусов.',
        bonus: 50,
        discount: 50
      });
    }

    res.json({
      success: true,
      message: 'Реферальный код подтвержден. Применена скидка 50 сом. После покупки подписки вы и пригласивший получите по 50 бонусов.',
      bonus: 50,
      discount: 50
    });
  } catch (error) {
    console.error('Ошибка проверки реферального кода:', error);
    res.json({ error: 'Ошибка при проверке реферального кода' });
  }
});

// Оформление подписки
router.post('/purchase', [
  body('subscriptionType').isIn(['individual', 'group']).withMessage('Неверный тип подписки'),
  body('subscriptionDuration').isInt({ min: 1, max: 12 }).withMessage('Неверная длительность подписки'),
  body('bonusAmount').optional().isInt({ min: 0 }).withMessage('Неверная сумма бонусов'),
  body('referralCode').optional().trim()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.redirect(`/payment?type=${req.body.subscriptionType}&duration=${req.body.subscriptionDuration}&error=${encodeURIComponent(errors.array()[0].msg)}`);
  }

  try {
    const { subscriptionType, subscriptionDuration, bonusAmount, referralCode } = req.body;
    const user = await User.findByPk(req.session.userId);

    if (!user) {
      return res.redirect('/auth/login');
    }

    const basePrice = PRICES[subscriptionType][parseInt(subscriptionDuration)];
    if (!basePrice) {
      return res.redirect(`/payment?type=${subscriptionType}&duration=${subscriptionDuration}&error=Неверная комбинация типа и длительности подписки`);
    }

    // Обработка реферального кода (если не был использован при регистрации)
    let referralDiscount = 0;
    if (referralCode && referralCode.trim()) {
      try {
        // Проверяем, нет ли уже активной связи
        const existingReferral = await Referral.findOne({
          where: {
            referredId: user.id,
            hasPurchased: false
          }
        });

        if (!existingReferral) {
          // Создаем реферальную связь
          await createReferral(referralCode.trim(), user.id);
        }
        
        // Реферальный код дает скидку 50 сом
        referralDiscount = 50;
      } catch (error) {
        console.error('Ошибка создания реферальной связи:', error);
        // Не блокируем покупку, если реферальный код неверный
      }
    }

    // Использование бонусов
    const bonusToUse = Math.min(
      parseInt(bonusAmount || 0),
      user.bonusBalance || 0,
      basePrice - referralDiscount // Нельзя использовать больше, чем стоит подписка после скидки
    );

    const finalPrice = Math.max(0, basePrice - referralDiscount - bonusToUse);

    // Если финальная цена 0 (оплачено бонусами), активируем подписку сразу
    if (finalPrice === 0) {
      const startDate = new Date();
      const endDate = new Date();
      endDate.setMonth(endDate.getMonth() + parseInt(subscriptionDuration));

      const subscription = await Subscription.create({
        userId: user.id,
        type: subscriptionType,
        duration: parseInt(subscriptionDuration),
        startDate: startDate,
        endDate: endDate,
        isActive: true,
        paymentStatus: 'succeeded'
      });

      user.isSubscribed = true;
      user.subscriptionEndDate = endDate;
      
      if (bonusToUse > 0) {
        user.bonusBalance = Math.max(0, (user.bonusBalance || 0) - bonusToUse);
        await BonusTransaction.create({
          userId: user.id,
          amount: -bonusToUse,
          type: 'subscription_payment',
          description: `Оплата подписки бонусами (${subscriptionType}, ${subscriptionDuration} мес.)`,
          subscriptionId: subscription.id,
          expiresAt: null
        });
      }

      await user.save();

      try {
        await awardReferralBonuses(user.id, subscription.id);
      } catch (error) {
        console.error('Ошибка начисления реферальных бонусов:', error);
      }

      let successMsg = 'Подписка оформлена!';
      if (referralDiscount > 0) successMsg += ` Применена скидка по реферальному коду: ${referralDiscount} сом.`;
      if (bonusToUse > 0) successMsg += ` Использовано бонусов: ${bonusToUse} сом.`;

      return res.redirect(`/profile?success=${encodeURIComponent(successMsg)}`);
    }

    // Если нужна оплата, создаем платеж через Finik
    // Сохраняем данные в сессии для использования после оплаты
    req.session.pendingPayment = {
      subscriptionType,
      subscriptionDuration,
      bonusAmount: bonusToUse,
      referralDiscount,
      basePrice,
      finalPrice
    };

    // Создаем платеж через Finik API
    const fetch = require('node-fetch');
    const finikResponse = await fetch(`${req.protocol}://${req.get('host')}/payment/finik/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': req.headers.cookie
      },
      body: JSON.stringify({
        subscriptionType,
        subscriptionDuration,
        bonusAmount: bonusToUse,
        referralCode
      })
    });

    const finikData = await finikResponse.json();

    if (finikData.success && finikData.paymentUrl) {
      // Редиректим пользователя на страницу оплаты Finik
      return res.redirect(finikData.paymentUrl);
    } else {
      return res.redirect(`/payment?type=${subscriptionType}&duration=${subscriptionDuration}&error=Ошибка при создании платежа`);
    }
  } catch (error) {
    console.error('Ошибка оформления подписки:', error);
    res.redirect(`/payment?type=${req.body.subscriptionType}&duration=${req.body.subscriptionDuration}&error=Ошибка при оформлении подписки`);
  }
});

module.exports = router;

