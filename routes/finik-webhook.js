const express = require('express');
const { User, Subscription, BonusTransaction, Referral } = require('../models');

// Добавляем связь для include
Subscription.belongsTo(User, { foreignKey: 'userId', as: 'user' });
const { verifySignature, buildCanonicalString } = require('../utils/finik');
const { awardReferralBonuses } = require('../utils/referral');
const { Op } = require('sequelize');

const router = express.Router();

// GET endpoint для проверки доступности webhook (для тестирования)
router.get('/', (req, res) => {
  res.json({
    status: 'ok',
    message: 'Finik webhook endpoint is available',
    method: 'POST',
    path: '/webhooks/finik',
    description: 'Этот endpoint принимает POST запросы от Finik для уведомлений о статусе платежей',
    timestamp: new Date().toISOString(),
    server: process.env.NODE_ENV || 'development'
  });
});

// Вебхук для обработки статусов платежей от Finik
router.post('/', async (req, res) => {
  try {
    // Получаем подпись из заголовков
    const signature = req.headers['signature'] || req.headers['Signature'];
    const timestamp = req.headers['x-api-timestamp'] || req.headers['X-Api-Timestamp'];
    
    if (!signature || !timestamp) {
      console.error('Отсутствует подпись или timestamp в вебхуке Finik');
      return res.status(400).send('Missing signature or timestamp');
    }
    
    // Проверка временной метки (не старше 5 минут)
    const timestampMs = parseInt(timestamp);
    const now = Date.now();
    const timeDiff = Math.abs(now - timestampMs);
    
    if (timeDiff > 5 * 60 * 1000) { // 5 минут
      console.error('Вебхук Finik: timestamp слишком старый');
      return res.status(408).send('Timestamp too old');
    }
    
    // Построение канонической строки для верификации
    const canonicalString = buildCanonicalString(req);
    
    // Верификация подписи
    const isValid = verifySignature(canonicalString, signature);
    
    if (!isValid) {
      console.error('Неверная подпись в вебхуке Finik');
      console.error('Canonical string:', canonicalString);
      console.error('Signature:', signature);
      return res.status(401).send('Invalid signature');
    }
    
    // Извлекаем данные из тела запроса
    const {
      id,
      transactionId,
      status,
      amount,
      accountId,
      fields,
      requestDate,
      transactionDate
    } = req.body;
    
    console.log('Вебхук Finik получен:', {
      id,
      transactionId,
      status,
      amount,
      accountId
    });
    
    // Ищем подписку по paymentId или transactionId
    const subscription = await Subscription.findOne({
      where: {
        [Op.or]: [
          { paymentId: id },
          { paymentId: transactionId },
          { transactionId: transactionId }
        ]
      },
      include: [{
        model: User,
        as: 'user'
      }]
    });
    
    if (!subscription) {
      console.error('Подписка не найдена для платежа:', id, transactionId);
      return res.status(404).send('Subscription not found');
    }
    
    // Обновляем статус платежа
    await subscription.update({
      transactionId: transactionId || id,
      paymentStatus: status === 'SUCCEEDED' ? 'succeeded' : status === 'FAILED' ? 'failed' : 'pending'
    });
    
    // Обработка успешного платежа
    if (status === 'SUCCEEDED') {
      const user = subscription.user || await User.findByPk(subscription.userId);
      
      if (!user) {
        console.error('Пользователь не найден для подписки:', subscription.id);
        return res.status(404).send('User not found');
      }
      
      // Активируем подписку
      await subscription.update({
        isActive: true
      });
      
      // Обновляем статус подписки у пользователя
      user.isSubscribed = true;
      user.subscriptionEndDate = subscription.endDate;
      await user.save();
      
      // Начисляем реферальные бонусы (только при первой покупке)
      try {
        const existingSubscriptions = await Subscription.count({
          where: {
            userId: user.id,
            id: { [Op.ne]: subscription.id },
            isActive: true
          }
        });
        
        if (existingSubscriptions === 0) {
          // Это первая активная подписка - начисляем реферальные бонусы
          await awardReferralBonuses(user.id, subscription.id);
        }
      } catch (error) {
        console.error('Ошибка начисления реферальных бонусов:', error);
        // Не блокируем обработку платежа из-за ошибки бонусов
      }
      
      console.log(`Подписка ${subscription.id} успешно активирована для пользователя ${user.id}`);
    } else if (status === 'FAILED') {
      console.log(`Платеж для подписки ${subscription.id} не прошел`);
      // Подписка остается неактивной
    }
    
    // Отвечаем быстро, чтобы Finik знал, что мы получили вебхук
    res.status(200).send('OK');
  } catch (error) {
    console.error('Ошибка обработки вебхука Finik:', error);
    // Все равно отвечаем 200, чтобы Finik не повторял запрос
    res.status(200).send('Error processed');
  }
});

module.exports = router;

