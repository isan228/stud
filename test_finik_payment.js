// Тестовый скрипт для проверки создания платежа через Finik API
require('dotenv').config();
const { createPayment } = require('./utils/finik');

async function testFinikPayment() {
  console.log('=== Тест создания платежа через Finik API ===\n');
  
  // Проверяем наличие необходимых переменных окружения
  const requiredVars = [
    'FINIK_ENV',
    'FINIK_API_KEY',
    'FINIK_ACCOUNT_ID',
    'FINIK_PRIVATE_KEY_PEM',
    'FINIK_REDIRECT_URL',
    'FINIK_WEBHOOK_PATH'
  ];
  
  const missingVars = requiredVars.filter(v => !process.env[v]);
  if (missingVars.length > 0) {
    console.error('❌ Отсутствуют переменные окружения:', missingVars.join(', '));
    process.exit(1);
  }
  
  console.log('✅ Все необходимые переменные окружения настроены');
  console.log('Окружение:', process.env.FINIK_ENV);
  console.log('API Key:', process.env.FINIK_API_KEY ? `${process.env.FINIK_API_KEY.substring(0, 10)}...` : 'НЕ НАСТРОЕН');
  console.log('Account ID:', process.env.FINIK_ACCOUNT_ID);
  console.log('Redirect URL:', process.env.FINIK_REDIRECT_URL);
  console.log('Webhook Path:', process.env.FINIK_WEBHOOK_PATH);
  console.log('Private Key:', process.env.FINIK_PRIVATE_KEY_PEM ? 'Настроен' : 'НЕ НАСТРОЕН');
  console.log('\n');
  
  // Формируем базовый URL
  let baseUrl = process.env.FINIK_REDIRECT_URL?.trim().replace(/\s+/g, '') || 'https://stud.kg';
  try {
    const urlObj = new URL(baseUrl);
    baseUrl = `${urlObj.protocol}//${urlObj.host}`;
  } catch (e) {
    baseUrl = baseUrl.replace(/\/payment\/success.*$/, '').replace(/\/$/, '');
  }
  
  const redirectUrl = `${baseUrl}/payment/success?paymentId=test-123`;
  const webhookUrl = `${baseUrl}${(process.env.FINIK_WEBHOOK_PATH || '/webhooks/finik').trim()}`;
  
  // Минимальные данные для теста
  const testPaymentData = {
    Amount: 100, // Минимальная сумма для теста
    CardType: 'FINIK_QR',
    PaymentId: `test-${Date.now()}`, // Уникальный ID для теста
    RedirectUrl: redirectUrl,
    Data: {
      accountId: process.env.FINIK_ACCOUNT_ID,
      merchantCategoryCode: '0742',
      name_en: 'Test Subscription',
      webhookUrl: webhookUrl,
      description: 'Тестовый платеж',
      subscriptionId: 999 // Тестовый ID
    }
  };
  
  console.log('Тестовые данные платежа:');
  console.log(JSON.stringify(testPaymentData, null, 2));
  console.log('\n');
  
  try {
    console.log('Отправка запроса к Finik API...\n');
    const result = await createPayment(testPaymentData);
    
    console.log('✅ Успех! Результат:');
    console.log(JSON.stringify(result, null, 2));
    
    if (result.success && result.paymentUrl) {
      console.log('\n✅ Платеж создан успешно!');
      console.log('Payment URL:', result.paymentUrl);
    }
  } catch (error) {
    console.error('❌ Ошибка при создании платежа:');
    console.error(error.message);
    console.error('\nПолная ошибка:', error);
    process.exit(1);
  }
}

// Запускаем тест
testFinikPayment().catch(error => {
  console.error('Критическая ошибка:', error);
  process.exit(1);
});

