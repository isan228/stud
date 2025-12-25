const express = require('express');
const { body, validationResult } = require('express-validator');
const { User, Subscription, BonusTransaction } = require('../models');
const { requireAuth } = require('../middleware/auth');
const { awardReferralBonuses } = require('../utils/referral');
const { Op } = require('sequelize');
const router = express.Router();

// Оформление подписки с использованием бонусов
// Применяем requireAuth только к POST роуту, а не ко всем роутам
router.post('/purchase', requireAuth, [
  body('subscriptionType').isIn(['individual', 'group']).withMessage('Неверный тип подписки'),
  body('subscriptionDuration').isInt({ min: 1, max: 12 }).withMessage('Неверная длительность подписки'),
  body('bonusAmount').optional().isInt({ min: 0 }).withMessage('Неверная сумма бонусов')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.redirect('/subscription?error=' + encodeURIComponent(errors.array()[0].msg));
  }

  try {
    const { subscriptionType, subscriptionDuration, bonusAmount } = req.body;
    const user = await User.findByPk(req.session.userId);

    if (!user) {
      return res.redirect('/auth/login');
    }

    // Расчет стоимости подписки (примерные цены, можно настроить)
    const prices = {
      individual: { 1: 1000, 3: 2700, 6: 5000 },
      group: { 3: 2400, 6: 4500 }
    };

    const basePrice = prices[subscriptionType][subscriptionDuration];
    if (!basePrice) {
      return res.redirect('/subscription?error=Неверная комбинация типа и длительности подписки');
    }

    // Использование бонусов
    const bonusToUse = Math.min(
      parseInt(bonusAmount || 0),
      user.bonusBalance || 0,
      basePrice // Нельзя использовать больше, чем стоит подписка
    );

    const finalPrice = basePrice - bonusToUse;

    // Создание подписки
    const startDate = new Date();
    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() + parseInt(subscriptionDuration));

    const subscription = await Subscription.create({
      userId: user.id,
      type: subscriptionType,
      duration: parseInt(subscriptionDuration),
      startDate: startDate,
      endDate: endDate,
      isActive: true
    });

    // Обновление статуса подписки у пользователя
    user.isSubscribed = true;
    user.subscriptionEndDate = endDate;
    
    // Списываем бонусы, если использованы
    if (bonusToUse > 0) {
      user.bonusBalance = Math.max(0, (user.bonusBalance || 0) - bonusToUse);

      // Создаём транзакцию списания бонусов
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

    // Начисляем реферальные бонусы (только при первой покупке)
    const existingSubscriptions = await Subscription.count({
      where: {
        userId: user.id,
        id: { [Op.ne]: subscription.id }
      }
    });

    if (existingSubscriptions === 0) {
      // Это первая подписка - начисляем реферальные бонусы
      try {
        await awardReferralBonuses(user.id, subscription.id);
      } catch (error) {
        console.error('Ошибка начисления реферальных бонусов:', error);
      }
    }

    res.redirect(`/profile?success=Подписка оформлена!${bonusToUse > 0 ? ' Использовано бонусов: ' + bonusToUse + ' сом.' : ''}`);
  } catch (error) {
    console.error('Ошибка оформления подписки:', error);
    res.redirect('/subscription?error=Ошибка при оформлении подписки');
  }
});

module.exports = router;





