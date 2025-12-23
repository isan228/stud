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
        where: whereCondition
      });
      
      if (subscription) {
        // Получаем пользователя отдельным запросом
        user = await User.findByPk(subscription.userId);
        console.log('Найдена подписка по paymentId:', paymentId, 'userId:', subscription.userId);
      } else {
        console.log('Подписка не найдена по paymentId:', paymentId, 'transactionId:', transactionId);
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
    
    // Если все еще не нашли подписку, но есть paymentId, ищем по частичному совпадению
    if (!subscription && paymentId) {
      subscription = await Subscription.findOne({
        where: {
          paymentId: { [Op.like]: `%${paymentId}%` }
        },
        order: [['createdAt', 'DESC']]
      });
      
      if (subscription) {
        user = await User.findByPk(subscription.userId);
        console.log('Найдена подписка по частичному paymentId:', paymentId);
      }
    }
    
    // Если пользователь не найден, но есть paymentId, показываем страницу с информацией
    if (!user && paymentId) {
      console.log('Пользователь не найден, но есть paymentId:', paymentId);
      // Показываем страницу успеха даже без пользователя, но с сообщением
      return res.render('payment-success', {
        user: null,
        subscription: null,
        message: 'Оплата получена! Подписка будет активирована в ближайшее время. Пожалуйста, войдите в систему для проверки статуса.',
        paymentId: paymentId
      });
    }
    
    // Если пользователь не найден и нет paymentId, предлагаем войти
    if (!user) {
      console.log('Пользователь не найден и нет paymentId, редирект на логин');
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
        user = await User.findByPk(subscription.userId);
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

