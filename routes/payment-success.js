const express = require('express');
const { User, Subscription } = require('../models');
const { Op } = require('sequelize');

const router = express.Router();

// Страница успешной оплаты
// Не требует авторизации, так как сессия может быть потеряна после редиректа с Finik
router.get('/success', async (req, res) => {
  try {
    // Пытаемся найти подписку по paymentId из query параметров
    const { paymentId, transactionId } = req.query;
    
    let subscription = null;
    let user = null;
    
    // Если есть paymentId или transactionId, ищем подписку
    if (paymentId || transactionId) {
      const whereCondition = {};
      if (paymentId) whereCondition.paymentId = paymentId;
      if (transactionId) whereCondition.transactionId = transactionId;
      
      subscription = await Subscription.findOne({
        where: whereCondition,
        include: [{
          model: User
        }]
      });
      
      if (subscription) {
        user = subscription.user;
      }
    }
    
    // Если не нашли по paymentId, но есть сессия, используем её
    if (!user && req.session && req.session.userId) {
      user = await User.findByPk(req.session.userId);
      
      if (user) {
        // Ищем последнюю активную подписку
        subscription = await Subscription.findOne({
          where: {
            userId: user.id,
            isActive: true,
            paymentStatus: 'succeeded'
          },
          order: [['createdAt', 'DESC']]
        });
      }
    }
    
    // Если все еще не нашли, проверяем последние подписки (на случай, если вебхук еще не обработался)
    if (!subscription && (paymentId || transactionId)) {
      const whereCondition = {};
      if (paymentId) whereCondition.paymentId = paymentId;
      if (transactionId) whereCondition.transactionId = transactionId;
      
      subscription = await Subscription.findOne({
        where: whereCondition,
        include: [{
          model: User,
          as: 'user'
        }],
        order: [['createdAt', 'DESC']]
      });
      
      if (subscription) {
        user = subscription.user;
      }
    }
    
    // Если пользователь не найден, предлагаем войти
    if (!user) {
      return res.redirect('/auth/login?message=Пожалуйста, войдите в систему для просмотра статуса подписки');
    }
    
    res.render('payment-success', {
      user: {
        nickname: user.nickname,
        id: user.id
      },
      subscription: subscription ? {
        type: subscription.type,
        duration: subscription.duration,
        endDate: subscription.endDate,
        isActive: subscription.isActive,
        paymentStatus: subscription.paymentStatus
      } : null,
      message: subscription && subscription.isActive 
        ? 'Подписка успешно активирована!' 
        : subscription && subscription.paymentStatus === 'pending'
        ? 'Оплата обрабатывается. Подписка будет активирована в ближайшее время.'
        : 'Спасибо за оплату!'
    });
  } catch (error) {
    console.error('Ошибка загрузки страницы успешной оплаты:', error);
    res.redirect('/subscription?error=Ошибка загрузки страницы');
  }
});

// Страница ошибки оплаты
router.get('/error', async (req, res) => {
  try {
    let user = null;
    
    // Пытаемся найти пользователя по сессии
    if (req.session && req.session.userId) {
      user = await User.findByPk(req.session.userId);
    }
    
    // Если не нашли, пытаемся найти по paymentId
    const { paymentId } = req.query;
    if (!user && paymentId) {
      const subscription = await Subscription.findOne({
        where: { paymentId },
        include: [{
          model: User
        }]
      });
      
      if (subscription) {
        user = subscription.user;
      }
    }
    
    res.render('payment-error', {
      user: user ? {
        nickname: user.nickname
      } : null,
      error: req.query.error || 'Ошибка при обработке платежа'
    });
  } catch (error) {
    console.error('Ошибка загрузки страницы ошибки оплаты:', error);
    res.redirect('/subscription?error=Ошибка загрузки страницы');
  }
});

module.exports = router;

