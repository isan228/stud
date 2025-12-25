// Тестовый скрипт для проверки приватного ключа Finik
require('dotenv').config();
const crypto = require('crypto');

console.log('=== Тест приватного ключа Finik ===\n');

// Получаем ключ из переменной окружения
let privateKey = process.env.FINIK_PRIVATE_KEY_PEM;

if (!privateKey) {
  console.error('❌ Ошибка: FINIK_PRIVATE_KEY_PEM не найден в .env');
  process.exit(1);
}

console.log('✓ Ключ найден в переменной окружения');
console.log('Длина ключа:', privateKey.length, 'символов');

// Убираем кавычки, если они есть
privateKey = privateKey.replace(/^["']|["']$/g, '');
console.log('✓ Кавычки удалены');

// Обработка переносов строк
privateKey = privateKey.replace(/\\n/g, '\n');
privateKey = privateKey.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
privateKey = privateKey.trim();

console.log('✓ Переносы строк обработаны');
console.log('Длина после обработки:', privateKey.length, 'символов');

// Проверка формата
if (!privateKey.includes('-----BEGIN')) {
  console.error('❌ Ошибка: Ключ не содержит заголовок BEGIN');
  console.error('Первые 100 символов:', privateKey.substring(0, 100));
  process.exit(1);
}

if (!privateKey.includes('-----END')) {
  console.error('❌ Ошибка: Ключ не содержит заголовок END');
  process.exit(1);
}

console.log('✓ Формат PEM подтвержден');
console.log('Начинается с:', privateKey.substring(0, 50));
console.log('Заканчивается на:', privateKey.substring(privateKey.length - 50));

// Попытка создать ключ объект
try {
  let keyObject;
  
  try {
    // Пробуем PKCS#8
    keyObject = crypto.createPrivateKey({
      key: privateKey,
      format: 'pem'
    });
    console.log('✓ Ключ успешно загружен как PKCS#8');
  } catch (error1) {
    // Пробуем PKCS#1
    keyObject = crypto.createPrivateKey({
      key: privateKey,
      format: 'pem',
      type: 'pkcs1'
    });
    console.log('✓ Ключ успешно загружен как PKCS#1');
  }
  
  // Тест создания подписи
  const testData = 'test data';
  const signer = crypto.createSign('RSA-SHA256');
  signer.update(testData, 'utf8');
  const signature = signer.sign(keyObject, 'base64');
  
  console.log('✓ Подпись успешно создана');
  console.log('Длина подписи:', signature.length, 'символов');
  console.log('\n✅ Все проверки пройдены! Ключ работает корректно.');
  
} catch (error) {
  console.error('❌ Ошибка при работе с ключом:');
  console.error('Тип:', error.code || error.name);
  console.error('Сообщение:', error.message);
  console.error('\nПроверьте формат ключа в .env файле.');
  process.exit(1);
}

