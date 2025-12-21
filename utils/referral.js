const crypto = require('crypto');
const { User, Referral, BonusTransaction, Subscription } = require('../models');
const { Op } = require('sequelize');

// Генерация уникального реферального кода
function generateReferralCode(userId) {
  const hash = crypto.createHash('md5').update(`${userId}-${Date.now()}`).digest('hex');
  return hash.substring(0, 12).toUpperCase();
}

// Создание или получение реферального кода пользователя
async function getOrCreateReferralCode(userId) {
  const user = await User.findByPk(userId);
  if (!user) {
    throw new Error('Пользователь не найден');
  }

  if (!user.referralCode) {
    let code = generateReferralCode(userId);
    // Проверяем уникальность
    let exists = await User.findOne({ where: { referralCode: code } });
    while (exists) {
      code = generateReferralCode(userId);
      exists = await User.findOne({ where: { referralCode: code } });
    }
    
    user.referralCode = code;
    await user.save();
  }

  return user.referralCode;
}

// Создание реферальной связи
async function createReferral(referrerCode, referredUserId) {
  const referrer = await User.findOne({ where: { referralCode: referrerCode } });
  if (!referrer) {
    throw new Error('Неверный реферальный код');
  }

  if (referrer.id === referredUserId) {
    throw new Error('Нельзя использовать свою собственную реферальную ссылку');
  }

  // Проверяем, не существует ли уже связь
  const existingReferral = await Referral.findOne({
    where: {
      referrerId: referrer.id,
      referredId: referredUserId
    }
  });

  if (existingReferral) {
    return existingReferral;
  }

  // Создаём новую связь
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7); // 7 дней

  const referral = await Referral.create({
    referrerId: referrer.id,
    referredId: referredUserId,
    referralCode: referrerCode,
    expiresAt: expiresAt,
    isActive: true,
    hasPurchased: false,
    bonusPaid: false
  });

  return referral;
}

// Начисление бонусов за покупку подписки
async function awardReferralBonuses(referredUserId, subscriptionId) {
  // Проверяем, не покупал ли уже этот пользователь подписку ранее
  const previousSubscriptions = await Subscription.count({
    where: {
      userId: referredUserId,
      id: { [Op.ne]: subscriptionId || 0 }
    }
  });

  if (previousSubscriptions > 0) {
    return; // Не первая покупка - бонусы не начисляются
  }

  const referral = await Referral.findOne({
    where: {
      referredId: referredUserId,
      hasPurchased: false,
      bonusPaid: false,
      isActive: true
    },
    include: [{
      model: User,
      as: 'referrer'
    }]
  });

  if (!referral) {
    return; // Нет активной реферальной связи
  }

  // Проверяем, не истекла ли связь
  if (new Date() > referral.expiresAt) {
    referral.isActive = false;
    await referral.save();
    return;
  }

  const bonusAmount = 50; // 50 бонусов = 50 сом

  // Начисляем бонусы пригласившему
  const referrer = await User.findByPk(referral.referrerId);
  if (referrer) {
    referrer.bonusBalance = (referrer.bonusBalance || 0) + bonusAmount;
    await referrer.save();

    // Создаём транзакцию
    const expiresAt = new Date();
    expiresAt.setMonth(expiresAt.getMonth() + 6); // 6 месяцев

    await BonusTransaction.create({
      userId: referrer.id,
      amount: bonusAmount,
      type: 'referral_bonus',
      description: `Бонус за приглашение пользователя`,
      referralId: referral.id,
      subscriptionId: subscriptionId,
      expiresAt: expiresAt
    });
  }

  // Начисляем бонусы приглашённому
  const referred = await User.findByPk(referredUserId);
  if (referred) {
    referred.bonusBalance = (referred.bonusBalance || 0) + bonusAmount;
    await referred.save();

    // Создаём транзакцию
    const expiresAt = new Date();
    expiresAt.setMonth(expiresAt.getMonth() + 6); // 6 месяцев

    await BonusTransaction.create({
      userId: referred.id,
      amount: bonusAmount,
      type: 'referral_received',
      description: `Бонус за регистрацию по реферальной ссылке`,
      referralId: referral.id,
      subscriptionId: subscriptionId,
      expiresAt: expiresAt
    });
  }

  // Отмечаем связь как использованную
  referral.hasPurchased = true;
  referral.bonusPaid = true;
  await referral.save();
}

// Удаление истекших реферальных связей
async function cleanupExpiredReferrals() {
  const expiredReferrals = await Referral.findAll({
    where: {
      isActive: true,
      hasPurchased: false,
      expiresAt: {
        [require('sequelize').Op.lt]: new Date()
      }
    }
  });

  for (const referral of expiredReferrals) {
    referral.isActive = false;
    await referral.save();
  }

  return expiredReferrals.length;
}

// Аннулирование истекших бонусов
async function expireOldBonuses() {
  const { Op } = require('sequelize');
  const expiredBonuses = await BonusTransaction.findAll({
    where: {
      isExpired: false,
      amount: { [Op.gt]: 0 }, // Только начисления
      expiresAt: {
        [Op.lt]: new Date()
      }
    }
  });

  for (const bonus of expiredBonuses) {
    const user = await User.findByPk(bonus.userId);
    if (user) {
      // Списываем истекший бонус
      const expiredAmount = Math.min(bonus.amount, user.bonusBalance || 0);
      user.bonusBalance = Math.max(0, (user.bonusBalance || 0) - expiredAmount);
      await user.save();

      // Создаём транзакцию истечения
      await BonusTransaction.create({
        userId: user.id,
        amount: -expiredAmount,
        type: 'expiration',
        description: `Истечение бонуса от ${new Date(bonus.createdAt).toLocaleDateString('ru-RU')}`,
        expiresAt: null
      });

      // Отмечаем бонус как истекший
      bonus.isExpired = true;
      await bonus.save();
    }
  }

  return expiredBonuses.length;
}

module.exports = {
  generateReferralCode,
  getOrCreateReferralCode,
  createReferral,
  awardReferralBonuses,
  cleanupExpiredReferrals,
  expireOldBonuses
};

