const express = require('express');
const crypto = require('crypto');
const { User, Subscription } = require('../models');
const { requireAuth } = require('../middleware/auth');
const { createPayment } = require('../utils/finik');
require('dotenv').config();

const router = express.Router();

// Цены подписок (в сомах)
const PRICES = {
  individual: { 1: 1000, 3: 2700, 6: 5000 },
  group: { 3: 2400, 6: 4500 }
};

// Создание платежа через Finik
router.post('/create', requireAuth, async (req, res) => {
  try {
    const { subscriptionType, subscriptionDuration, bonusAmount, referralCode } = req.body;
    const userId = req.session.userId;
    
    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(401).json({ error: 'Пользователь не найден' });
    }
    
    // Проверка параметров
    if (!subscriptionType || !subscriptionDuration) {
      return res.status(400).json({ error: 'Укажите тип и длительность подписки' });
    }
    
    const basePrice = PRICES[subscriptionType]?.[parseInt(subscriptionDuration)];
    if (!basePrice) {
      return res.status(400).json({ error: 'Неверная комбинация типа и длительности подписки' });
    }
    
    // Расчет финальной цены (учитывая бонусы и скидки)
    // TODO: Добавить логику расчета скидок и бонусов
    const finalPrice = basePrice;
    
    // Генерируем уникальный ID платежа
    const paymentId = crypto.randomUUID ? crypto.randomUUID() : require('uuid').v4();
    
    // Создаем временную подписку со статусом pending
    const startDate = new Date();
    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() + parseInt(subscriptionDuration));
    
    const subscription = await Subscription.create({
      userId: user.id,
      type: subscriptionType,
      duration: parseInt(subscriptionDuration),
      startDate: startDate,
      endDate: endDate,
      isActive: false, // Не активна до подтверждения оплаты
      paymentId: paymentId,
      paymentStatus: 'pending'
    });
    
    // Подготовка данных для Finik
    const finikPaymentData = {
      Amount: finalPrice,
      CardType: 'FINIK_QR',
      PaymentId: paymentId,
      RedirectUrl: `${process.env.FINIK_REDIRECT_URL || 'https://stud.kg/payment/success'}?paymentId=${paymentId}`,
      Data: {
        accountId: process.env.FINIK_ACCOUNT_ID,
        merchantCategoryCode: '0742',
        name_en: `Subscription ${subscriptionType} ${subscriptionDuration} months`,
        webhookUrl: `${process.env.FINIK_REDIRECT_URL?.replace('/payment/success', '') || 'https://stud.kg'}${process.env.FINIK_WEBHOOK_PATH || '/webhooks/finik'}`,
        description: `Подписка ${subscriptionType === 'individual' ? 'Индивидуальная' : 'Групповая'} на ${subscriptionDuration} ${subscriptionDuration === 1 ? 'месяц' : 'месяца'}`,
        subscriptionId: subscription.id,
        userId: user.id
      }
    };
    
    // Создание платежа в Finik
    const paymentResult = await createPayment(finikPaymentData);
    
    if (paymentResult.success && paymentResult.paymentUrl) {
      // Обновляем подписку с paymentId
      await subscription.update({
        paymentId: paymentId
      });
      
      return res.json({
        success: true,
        paymentUrl: paymentResult.paymentUrl,
        paymentId: paymentId,
        subscriptionId: subscription.id
      });
    } else {
      // Удаляем подписку, если платеж не создан
      await subscription.destroy();
      return res.status(500).json({ error: 'Не удалось создать платеж' });
    }
  } catch (error) {
    console.error('Ошибка создания платежа Finik:', error);
    return res.status(500).json({ 
      error: 'Ошибка при создании платежа',
      message: error.message 
    });
  }
});

module.exports = router;

