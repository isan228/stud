const { cleanupExpiredReferrals, expireOldBonuses } = require('../utils/referral');

// Функция для очистки истекших данных
async function runCleanup() {
  try {
    console.log('Запуск очистки истекших данных...');
    
    const expiredReferrals = await cleanupExpiredReferrals();
    const expiredBonuses = await expireOldBonuses();
    
    console.log(`Очищено реферальных связей: ${expiredReferrals}, истекших бонусов: ${expiredBonuses}`);
  } catch (error) {
    console.error('Ошибка при очистке:', error);
  }
}

// Запуск очистки каждые 24 часа
if (require.main === module) {
  runCleanup();
  setInterval(runCleanup, 24 * 60 * 60 * 1000); // 24 часа
}

module.exports = { runCleanup };





