// Скрипт для проверки нового API ключа и приватного ключа
require('dotenv').config();
const crypto = require('crypto');

console.log('=== Проверка нового API ключа и приватного ключа ===\n');

const apiKey = process.env.FINIK_API_KEY;
let privateKey = process.env.FINIK_PRIVATE_KEY_PEM;

if (!apiKey) {
  console.error('❌ FINIK_API_KEY не найден в .env');
  process.exit(1);
}

if (!privateKey) {
  console.error('❌ FINIK_PRIVATE_KEY_PEM не найден в .env');
  process.exit(1);
}

console.log('✅ API Key найден:', apiKey);
console.log('✅ Приватный ключ найден\n');

// Обработка приватного ключа
privateKey = privateKey.replace(/^["']|["']$/g, '');
privateKey = privateKey.replace(/\\n/g, '\n');
privateKey = privateKey.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
privateKey = privateKey.trim();

try {
  // Загружаем приватный ключ
  let keyObject;
  try {
    keyObject = crypto.createPrivateKey({
      key: privateKey,
      format: 'pem'
    });
    console.log('✅ Приватный ключ загружен как PKCS#8');
  } catch (error1) {
    try {
      keyObject = crypto.createPrivateKey({
        key: privateKey,
        format: 'pem',
        type: 'pkcs1'
      });
      console.log('✅ Приватный ключ загружен как PKCS#1');
    } catch (error2) {
      console.error('❌ Ошибка загрузки приватного ключа:', error2.message);
      process.exit(1);
    }
  }
  
  // Извлекаем публичный ключ из приватного
  const publicKeyObject = crypto.createPublicKey(keyObject);
  const publicKeyPEM = publicKeyObject.export({
    type: 'spki',
    format: 'pem'
  });
  
  console.log('✅ Публичный ключ извлечен из приватного\n');
  
  // Создаем тестовую подпись
  const testData = 'test data for signature verification';
  const signer = crypto.createSign('RSA-SHA256');
  signer.update(testData, 'utf8');
  const signature = signer.sign(keyObject, 'base64');
  
  console.log('✅ Тестовая подпись создана');
  console.log('Длина подписи:', signature.length, 'символов\n');
  
  // Проверяем подпись с помощью публичного ключа
  const verifier = crypto.createVerify('RSA-SHA256');
  verifier.update(testData, 'utf8');
  const isValid = verifier.verify(publicKeyPEM, signature, 'base64');
  
  if (isValid) {
    console.log('✅ Подпись успешно проверена публичным ключом');
  } else {
    console.error('❌ Подпись НЕ прошла проверку!');
    process.exit(1);
  }
  
  console.log('\n=== Информация о ключах ===');
  console.log('API Key:', apiKey);
  console.log('\nПубличный ключ (извлеченный из приватного):');
  console.log(publicKeyPEM);
  
  console.log('\n=== ВАЖНО ===');
  console.log('1. Убедитесь, что этот публичный ключ был отправлен в Finik');
  console.log('2. Убедитесь, что API ключ соответствует этому публичному ключу');
  console.log('3. Если API ключ новый, возможно, он еще не активирован в системе Finik');
  console.log('4. Обратитесь в поддержку Finik, если проблема сохраняется');
  console.log('');
  
} catch (error) {
  console.error('❌ Ошибка при работе с ключами:');
  console.error('Тип:', error.code || error.name);
  console.error('Сообщение:', error.message);
  process.exit(1);
}

