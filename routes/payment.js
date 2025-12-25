const express = require('express');
const { body, validationResult } = require('express-validator');
const { User, Subscription, BonusTransaction, Referral } = require('../models');
const { requireAuth } = require('../middleware/auth');
const { awardReferralBonuses, createReferral } = require('../utils/referral');
const { createPayment } = require('../utils/finik');
const { Op } = require('sequelize');
const crypto = require('crypto');
require('dotenv').config();
const router = express.Router();

// Применяем requireAuth только к конкретным роутам, а не ко всем
// Это позволяет GET /payment обрабатываться правильно

// Цены подписок
const PRICES = {
  individual: { 1: 1000, 3: 2700, 6: 5000 },
  group: { 3: 2400, 6: 4500 }
};

// Страница оплаты - разрешена для новых пользователей после регистрации
router.get('/', async (req, res) => {
  try {
    console.log('=== GET /payment ===');
    console.log('Сессия userId:', req.session?.userId);
    console.log('Query params:', req.query);
    console.log('Original URL:', req.originalUrl);
    console.log('Path:', req.path);
    
    const { type, duration } = req.query;
    
    // Проверяем параметры подписки
    if (!type || !duration) {
      console.log('Отсутствуют type или duration, редирект на /subscription');
      return res.redirect('/subscription?error=Выберите тип и длительность подписки');
    }
    
    // Если пользователь авторизован, получаем его данные
    let user = null;
    if (req.session?.userId) {
      user = await User.findByPk(req.session.userId);
      console.log('Пользователь найден по сессии:', user?.nickname);
    }
    
    // Если пользователь не авторизован, но есть параметры подписки - разрешаем доступ
    // (это может быть после регистрации, когда сессия еще не восстановилась)
    if (!user) {
      console.log('Пользователь не авторизован, но есть параметры подписки - разрешаем доступ');
    }

    const basePrice = PRICES[type]?.[parseInt(duration)];
    if (!basePrice) {
      return res.redirect('/subscription?error=Неверная комбинация типа и длительности подписки');
    }

    const typeText = type === 'individual' ? 'Индивидуальная' : 'Групповая';
    const durationText = duration === '1' ? '1 месяц' : duration === '3' ? '3 месяца' : '6 месяцев';

    res.render('payment', {
      user: user ? {
        nickname: user.nickname,
        bonusBalance: user.bonusBalance || 0
      } : {
        nickname: 'Новый пользователь',
        bonusBalance: 0
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

// Проверка реферального кода (AJAX) - требует авторизации
router.post('/check-referral', requireAuth, async (req, res) => {
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

// Оформление подписки - пытаемся найти пользователя по сессии или по последнему созданному
router.post('/purchase', [
  body('subscriptionType')
    .trim()
    .isIn(['individual', 'group'])
    .withMessage('Неверный тип подписки'),
  body('subscriptionDuration')
    .trim()
    .custom((value) => {
      const num = parseInt(value);
      return !isNaN(num) && num >= 1 && num <= 12;
    })
    .withMessage('Неверная длительность подписки'),
  body('bonusAmount').optional().isInt({ min: 0 }).withMessage('Неверная сумма бонусов'),
  body('referralCode').optional().trim()
], async (req, res) => {
  // Логирование для отладки
  console.log('=== POST /payment/purchase ===');
  console.log('Сессия userId:', req.session?.userId);
  console.log('Session ID:', req.sessionID);
  console.log('Сессия существует:', !!req.session);
  console.log('Content-Type:', req.headers['content-type']);
  console.log('Body (raw):', req.body);
  console.log('Body type:', typeof req.body);
  console.log('Body keys:', Object.keys(req.body || {}));
  console.log('subscriptionType (raw):', req.body.subscriptionType, 'type:', typeof req.body.subscriptionType);
  console.log('subscriptionDuration (raw):', req.body.subscriptionDuration, 'type:', typeof req.body.subscriptionDuration);
  
  // Нормализуем данные перед валидацией
  if (req.body.subscriptionType) {
    req.body.subscriptionType = String(req.body.subscriptionType).trim();
  }
  if (req.body.subscriptionDuration !== undefined && req.body.subscriptionDuration !== null) {
    req.body.subscriptionDuration = parseInt(req.body.subscriptionDuration);
  }
  if (req.body.bonusAmount !== undefined && req.body.bonusAmount !== null) {
    req.body.bonusAmount = parseInt(req.body.bonusAmount) || 0;
  }
  if (req.body.referralCode) {
    req.body.referralCode = String(req.body.referralCode).trim();
  }
  
  console.log('Body (normalized):', req.body);
  console.log('subscriptionType (normalized):', req.body.subscriptionType, 'type:', typeof req.body.subscriptionType);
  console.log('subscriptionDuration (normalized):', req.body.subscriptionDuration, 'type:', typeof req.body.subscriptionDuration);
  
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    console.log('Ошибки валидации:', errors.array());
    console.log('subscriptionType:', req.body.subscriptionType, 'type:', typeof req.body.subscriptionType);
    console.log('subscriptionDuration:', req.body.subscriptionDuration, 'type:', typeof req.body.subscriptionDuration);
    const isAjax = req.headers['x-requested-with'] === 'XMLHttpRequest';
    if (isAjax) {
      return res.status(400).json({ error: errors.array()[0].msg });
    }
    return res.redirect(`/payment?type=${req.body.subscriptionType}&duration=${req.body.subscriptionDuration}&error=${encodeURIComponent(errors.array()[0].msg)}`);
  }

  try {
    const { subscriptionType, subscriptionDuration, bonusAmount, referralCode } = req.body;
    
    // Пытаемся найти пользователя по сессии
    let user = null;
    if (req.session?.userId) {
      user = await User.findByPk(req.session.userId);
      console.log('Пользователь найден по сессии:', user?.nickname);
    }
    
    // Если пользователь не найден по сессии, пытаемся найти последнего созданного пользователя
    // (это может быть после регистрации, когда сессия еще не восстановилась)
    if (!user) {
      console.log('Пользователь не найден по сессии, ищем последнего созданного пользователя');
      // Находим последнего созданного пользователя за последние 5 минут
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
      user = await User.findOne({
        where: {
          createdAt: {
            [Op.gte]: fiveMinutesAgo
          }
        },
        order: [['createdAt', 'DESC']]
      });
      
      if (user) {
        console.log('Найден последний созданный пользователь:', user.nickname);
        // Восстанавливаем сессию
        req.session.userId = user.id;
        req.session.userNickname = user.nickname;
        await new Promise((resolve, reject) => {
          req.session.save((err) => {
            if (err) {
              console.error('Ошибка сохранения сессии:', err);
              reject(err);
            } else {
              console.log('Сессия восстановлена для пользователя:', user.id);
              resolve();
            }
          });
        });
      }
    }
    
    if (!user) {
      console.log('Пользователь не найден, редирект на логин');
      const isAjax = req.headers['x-requested-with'] === 'XMLHttpRequest';
      if (isAjax) {
        return res.status(401).json({ error: 'Необходима авторизация. Пожалуйста, войдите в систему.' });
      }
      return res.redirect('/auth/login?error=Необходима авторизация. Пожалуйста, войдите в систему.');
    }
    
    console.log('Пользователь найден для оформления подписки:', user.id, user.nickname);

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
    // Используем прямой вызов функции вместо HTTP запроса
    const { createPayment } = require('../utils/finik');
    const crypto = require('crypto');
    
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
    // Формируем базовый URL без пробелов
    let baseUrl = (process.env.FINIK_REDIRECT_URL || `${req.protocol}://${req.get('host')}`).trim().replace(/\s+/g, '');
    
    // Убираем путь из baseUrl, оставляя только домен
    try {
      const urlObj = new URL(baseUrl);
      baseUrl = `${urlObj.protocol}//${urlObj.host}`;
    } catch (e) {
      // Если не удалось распарсить, просто убираем путь вручную
      baseUrl = baseUrl.replace(/\/payment\/success.*$/, '').replace(/\/$/, '');
    }
    
    const redirectUrl = `${baseUrl}/payment/success?paymentId=${paymentId}`;
    const webhookUrl = `${baseUrl}${(process.env.FINIK_WEBHOOK_PATH || '/webhooks/finik').trim()}`;
    
    const finikPaymentData = {
      Amount: finalPrice,
      CardType: 'FINIK_QR',
      PaymentId: paymentId,
      RedirectUrl: redirectUrl,
      Data: {
        accountId: process.env.FINIK_ACCOUNT_ID,
        merchantCategoryCode: '0742',
        name_en: `Subscription ${subscriptionType} ${subscriptionDuration} months`,
        webhookUrl: webhookUrl,
        description: `Подписка ${subscriptionType === 'individual' ? 'Индивидуальная' : 'Групповая'} на ${subscriptionDuration} ${subscriptionDuration === 1 ? 'месяц' : 'месяца'}`,
        subscriptionId: subscription.id,
        userId: user.id
      }
    };
    
    // Создание платежа в Finik
    try {
      console.log('Создание платежа Finik для пользователя:', req.session.userId);
      console.log('Payment URL будет:', redirectUrl);
      
      const paymentResult = await createPayment(finikPaymentData);
      
      if (paymentResult.success && paymentResult.paymentUrl) {
        console.log('Платеж создан успешно, paymentUrl:', paymentResult.paymentUrl);
        
        // Проверяем, это AJAX запрос или обычный POST
        const isAjax = req.headers['x-requested-with'] === 'XMLHttpRequest' || 
                       req.headers['content-type']?.includes('application/json') ||
                       req.headers['accept']?.includes('application/json');
        
        if (isAjax) {
          // Возвращаем JSON для AJAX запроса
          return res.json({
            success: true,
            paymentUrl: paymentResult.paymentUrl
          });
        } else {
          // Обычный редирект для обычных POST запросов
          return res.redirect(paymentResult.paymentUrl);
        }
      } else {
        console.error('Платеж не создан, результат:', paymentResult);
        console.error('Ошибка создания платежа, paymentResult:', JSON.stringify(paymentResult, null, 2));
        
        // Удаляем подписку, если платеж не создан
        try {
          await subscription.destroy();
        } catch (destroyError) {
          console.error('Ошибка при удалении подписки:', destroyError);
        }
        
        // Проверяем сессию перед редиректом
        if (!req.session?.userId) {
          console.error('Сессия потеряна при ошибке создания платежа');
          const isAjax = req.headers['x-requested-with'] === 'XMLHttpRequest';
          if (isAjax) {
            return res.status(401).json({ error: 'Сессия истекла. Пожалуйста, войдите снова.' });
          }
          return res.redirect('/auth/login?error=Сессия истекла. Пожалуйста, войдите снова.');
        }
        
        const isAjax = req.headers['x-requested-with'] === 'XMLHttpRequest';
        const errorMessage = paymentResult.error || paymentResult.message || 'Ошибка при создании платежа';
        
        if (isAjax) {
          return res.status(400).json({ error: errorMessage });
        }
        
        // Редиректим на страницу подписки с ошибкой, чтобы пользователь мог попробовать снова
        console.log('Редирект на /subscription с ошибкой:', errorMessage);
        return res.redirect(`/subscription?error=${encodeURIComponent(errorMessage)}`);
      }
    } catch (error) {
      console.error('Ошибка создания платежа Finik:', error);
      console.error('Пользователь:', req.session.userId);
      console.error('Сессия существует:', !!req.session.userId);
      
      // Удаляем подписку при ошибке
      try {
        await subscription.destroy();
      } catch (destroyError) {
        console.error('Ошибка при удалении подписки:', destroyError);
      }
      
      // Проверяем сессию перед редиректом
      if (!req.session.userId) {
        console.error('Сессия потеряна при ошибке');
        const isAjax = req.headers['x-requested-with'] === 'XMLHttpRequest';
        if (isAjax) {
          return res.status(401).json({ error: 'Сессия истекла. Пожалуйста, войдите снова.' });
        }
        return res.redirect('/auth/login?error=Сессия истекла. Пожалуйста, войдите снова.');
      }
      
      const isAjax = req.headers['x-requested-with'] === 'XMLHttpRequest';
      const errorMessage = error.message || 'Ошибка при создании платежа';
      
      if (isAjax) {
        return res.status(500).json({ error: `Ошибка при создании платежа: ${errorMessage}` });
      }
      
      // Редиректим на страницу подписки с ошибкой
      console.log('Редирект на /subscription с ошибкой:', errorMessage);
      return res.redirect(`/subscription?error=${encodeURIComponent(errorMessage)}`);
    }
  } catch (error) {
    console.error('Ошибка оформления подписки:', error);
    console.error('Пользователь:', req.session?.userId);
    console.error('Сессия существует:', !!req.session?.userId);
    
    // Проверяем сессию перед редиректом
    if (!req.session?.userId) {
      console.error('Сессия потеряна при общей ошибке');
      return res.redirect('/auth/login?error=Сессия истекла. Пожалуйста, войдите снова.');
    }
    
    // Редиректим на страницу подписки с ошибкой
    const errorMessage = error.message || 'Ошибка при оформлении подписки';
    console.log('Редирект на /subscription с ошибкой:', errorMessage);
    res.redirect(`/subscription?error=${encodeURIComponent(errorMessage)}`);
  }
});

module.exports = router;

