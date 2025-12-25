// Альтернативная версия с использованием библиотеки @mancho.devs/authorizer
// Используйте эту версию, если собственная реализация не работает
const { Signer } = require('@mancho.devs/authorizer');
require('dotenv').config();

// Получение базового URL в зависимости от окружения
function getBaseUrl() {
  return process.env.FINIK_ENV === 'beta'
    ? 'https://beta.api.acquiring.averspay.kg'
    : 'https://api.acquiring.averspay.kg';
}

// Создание платежа в Finik с использованием библиотеки @mancho.devs/authorizer
async function createPaymentWithLibrary(paymentData) {
  const baseUrl = getBaseUrl();
  const host = new URL(baseUrl).host;
  const apiKey = process.env.FINIK_API_KEY;
  const timestamp = Date.now().toString();
  let privateKey = process.env.FINIK_PRIVATE_KEY_PEM;
  
  if (!apiKey) {
    throw new Error('FINIK_API_KEY не настроен в .env');
  }
  
  if (!privateKey) {
    throw new Error('FINIK_PRIVATE_KEY_PEM не настроен в .env');
  }
  
  // Обработка приватного ключа
  privateKey = privateKey.replace(/^["']|["']$/g, '');
  privateKey = privateKey.replace(/\\n/g, '\n');
  privateKey = privateKey.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  privateKey = privateKey.trim();
  
  const path = '/v1/payment';
  
  // Формируем requestData для библиотеки
  const requestData = {
    httpMethod: 'POST',
    path: path,
    headers: {
      Host: host,
      'x-api-key': apiKey,
      'x-api-timestamp': timestamp
    },
    queryStringParameters: undefined,
    body: paymentData
  };
  
  console.log('\n=== Использование библиотеки @mancho.devs/authorizer ===');
  console.log('Base URL:', baseUrl);
  console.log('Host:', host);
  console.log('API Key:', apiKey ? `${apiKey.substring(0, 10)}...` : 'НЕ НАСТРОЕН!');
  console.log('Timestamp:', timestamp);
  console.log('Path:', path);
  console.log('Body:', JSON.stringify(paymentData, null, 2));
  
  try {
    // Используем библиотеку для создания подписи
    const signer = new Signer(requestData);
    const signature = await signer.sign(privateKey);
    
    console.log('Подпись создана (первые 50 символов):', signature.substring(0, 50) + '...');
    console.log('Длина подписи:', signature.length);
    
    // Используем встроенный fetch (Node 18+) или node-fetch
    let fetch;
    try {
      fetch = globalThis.fetch;
      if (!fetch) {
        fetch = require('node-fetch');
      }
    } catch (e) {
      fetch = require('node-fetch');
    }
    
    const url = `${baseUrl}${path}`;
    
    console.log('\nОтправка запроса к:', url);
    console.log('Заголовки:', {
      'content-type': 'application/json',
      'x-api-key': apiKey,
      'x-api-timestamp': timestamp,
      'signature': signature.substring(0, 20) + '...'
    });
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': apiKey,
        'x-api-timestamp': timestamp,
        signature: signature
      },
      body: JSON.stringify(paymentData),
      redirect: 'manual' // Не следовать за 302 редиректом
    });
    
    if (response.status === 302 || response.status === 301) {
      const paymentUrl = response.headers.get('location');
      console.log('\n✅ Успех! Payment URL:', paymentUrl);
      return {
        success: true,
        paymentUrl: paymentUrl,
        status: response.status
      };
    } else if (response.status === 201) {
      const data = await response.json();
      console.log('\n✅ Успех! Payment ID:', data.paymentId);
      return {
        success: true,
        paymentUrl: data.paymentUrl,
        paymentId: data.paymentId,
        status: response.status
      };
    } else {
      const errorText = await response.text();
      let errorDetails = errorText;
      
      try {
        const errorJson = JSON.parse(errorText);
        errorDetails = JSON.stringify(errorJson, null, 2);
      } catch (e) {
        // Оставляем как текст
      }
      
      console.error('\n❌ Ошибка от Finik API:');
      console.error('Статус:', response.status);
      console.error('Ответ:', errorDetails);
      
      throw new Error(`Ошибка создания платежа: ${response.status} - ${errorDetails}`);
    }
  } catch (error) {
    console.error('\n❌ Ошибка при создании платежа:', error.message);
    throw error;
  }
}

module.exports = {
  createPaymentWithLibrary,
  getBaseUrl
};

