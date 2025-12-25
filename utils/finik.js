const crypto = require('crypto');
const { Signer } = require('@mancho.devs/authorizer');
require('dotenv').config();

// Получение базового URL в зависимости от окружения
function getBaseUrl() {
  return process.env.FINIK_ENV === 'beta'
    ? 'https://beta.api.acquiring.averspay.kg'
    : 'https://api.acquiring.averspay.kg';
}

// Получение публичного ключа в зависимости от окружения
function getPublicKey() {
  return process.env.FINIK_ENV === 'beta'
    ? process.env.FINIK_PUBLIC_KEY_BETA
    : process.env.FINIK_PUBLIC_KEY_PROD;
}

// Построение канонической строки для создания подписи
function buildCanonicalStringForSigning(requestData) {
  const { httpMethod, path, headers, queryStringParameters, body } = requestData;
  
  // 1. HTTP метод в нижнем регистре
  const method = httpMethod.toLowerCase();
  
  // 2. Путь (абсолютный, без query параметров)
  const uriPath = path;
  
  // 3. Заголовки (Host + все x-api-*), отсортированные по имени
  const headerMap = {};
  if (headers.Host) {
    headerMap.host = headers.Host;
  }
  
  // Добавляем все заголовки, начинающиеся с x-api-
  Object.keys(headers).forEach(key => {
    if (key.toLowerCase().startsWith('x-api-')) {
      headerMap[key.toLowerCase()] = headers[key];
    }
  });
  
  // Сортируем и формируем строку заголовков
  // Согласно документации Finik: заголовки соединяются через &, последний БЕЗ & в конце
  const sortedHeaderKeys = Object.keys(headerMap).sort();
  const headerString = sortedHeaderKeys
    .map((key, index) => {
      const value = headerMap[key];
      // Последний заголовок без & в конце
      return index === sortedHeaderKeys.length - 1 
        ? `${key}:${value}`
        : `${key}:${value}&`;
    })
    .join('');
  
  // 4. Query параметры (если есть)
  let queryString = '';
  if (queryStringParameters && Object.keys(queryStringParameters).length > 0) {
    const sortedQueryKeys = Object.keys(queryStringParameters).sort();
    queryString = sortedQueryKeys
      .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(queryStringParameters[key] || '')}`)
      .join('&');
  }
  
  // 5. Тело запроса (JSON, отсортированный по ключам, компактный формат)
  let bodyString = '';
  if (body && Object.keys(body).length > 0) {
    // Используем компактный JSON без пробелов (как в документации Finik)
    bodyString = JSON.stringify(sortObjectKeys(body));
  }
  
  // Собираем каноническую строку
  const parts = [
    method,
    uriPath,
    headerString,
    queryString,
    bodyString
  ];
  
  // Если нет query параметров, не добавляем пустую строку
  return parts.filter((part, index) => {
    if (index === 3 && !queryString) return false; // Пропускаем пустую query строку
    return true;
  }).join('\n');
}

// Создание подписи для запроса к Finik
function createSignature(requestData) {
  let privateKey = process.env.FINIK_PRIVATE_KEY_PEM;
  if (!privateKey) {
    throw new Error('FINIK_PRIVATE_KEY_PEM не настроен в .env');
  }

  // Убираем кавычки, если они есть (dotenv может их сохранить)
  privateKey = privateKey.replace(/^["']|["']$/g, '');
  
  // Обработка приватного ключа (замена \n на реальные переносы строк)
  privateKey = privateKey.replace(/\\n/g, '\n');
  
  // Нормализуем переносы строк
  privateKey = privateKey.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  
  // Убираем лишние пробелы в начале и конце
  privateKey = privateKey.trim();
  
  // Проверяем, что ключ содержит заголовки PEM
  if (!privateKey.includes('-----BEGIN')) {
    console.error('Ошибка: Приватный ключ не содержит заголовок BEGIN');
    console.error('Первые 100 символов ключа:', privateKey.substring(0, 100));
    throw new Error('Приватный ключ должен быть в формате PEM с заголовками -----BEGIN PRIVATE KEY----- или -----BEGIN RSA PRIVATE KEY-----');
  }
  
  // Проверяем, что ключ содержит закрывающий заголовок
  if (!privateKey.includes('-----END')) {
    console.error('Ошибка: Приватный ключ не содержит заголовок END');
    throw new Error('Приватный ключ должен содержать закрывающий заголовок -----END PRIVATE KEY----- или -----END RSA PRIVATE KEY-----');
  }
  
  // Отладочная информация (только первые и последние символы)
  if (process.env.NODE_ENV === 'development') {
    console.log('Ключ загружен. Начинается с:', privateKey.substring(0, 50));
    console.log('Заканчивается на:', privateKey.substring(privateKey.length - 50));
  }

  // Построение канонической строки
  const canonicalString = buildCanonicalStringForSigning(requestData);
  
  try {
    // Создание подписи RSA-SHA256
    const signer = crypto.createSign('RSA-SHA256');
    signer.update(canonicalString, 'utf8');
    
    // Пытаемся создать ключ объект, пробуя разные форматы
    let keyObject;
    let signature;
    
    try {
      // Сначала пробуем создать ключ объект (более надежный способ)
      try {
        // Пробуем как PKCS#8 (-----BEGIN PRIVATE KEY-----)
        keyObject = crypto.createPrivateKey({
          key: privateKey,
          format: 'pem'
        });
        signature = signer.sign(keyObject, 'base64');
        return signature;
      } catch (error2) {
        // Если не получилось, пробуем как PKCS#1 (-----BEGIN RSA PRIVATE KEY-----)
        keyObject = crypto.createPrivateKey({
          key: privateKey,
          format: 'pem',
          type: 'pkcs1'
        });
        signature = signer.sign(keyObject, 'base64');
        return signature;
      }
    } catch (error1) {
      // Если создание ключ-объекта не сработало, пробуем напрямую
      try {
        signature = signer.sign(privateKey, 'base64');
        return signature;
      } catch (error2) {
        // Если все варианты не сработали, выбрасываем ошибку с детальной информацией
        console.error('=== Ошибка при создании подписи ===');
        console.error('Тип ошибки:', error2.code || error2.name);
        console.error('Сообщение:', error2.message);
        console.error('Первые 100 символов ключа:', privateKey.substring(0, 100));
        console.error('Последние 50 символов ключа:', privateKey.substring(privateKey.length - 50));
        console.error('');
        console.error('Проверьте:');
        console.error('1. Ключ должен быть в формате PEM');
        console.error('2. Ключ должен начинаться с -----BEGIN PRIVATE KEY----- или -----BEGIN RSA PRIVATE KEY-----');
        console.error('3. Ключ должен заканчиваться на -----END PRIVATE KEY----- или -----END RSA PRIVATE KEY-----');
        console.error('4. В .env файле ключ должен быть в кавычках с \\n для переносов строк');
        throw new Error(`Ошибка создания подписи (${error2.code || error2.name}): ${error2.message}`);
      }
    }
  } catch (error) {
    console.error('Ошибка при создании подписи:', error.message);
    throw error;
  }
}

// Верификация подписи от Finik
function verifySignature(canonicalString, signatureBase64) {
  let publicKey = getPublicKey();
  if (!publicKey) {
    throw new Error('Публичный ключ Finik не настроен в .env');
  }

  // Обработка публичного ключа (замена \n на реальные переносы строк)
  publicKey = publicKey.replace(/\\n/g, '\n');

  try {
    const verifier = crypto.createVerify('RSA-SHA256');
    verifier.update(canonicalString, 'utf8');
    return verifier.verify(publicKey, signatureBase64, 'base64');
  } catch (error) {
    console.error('Ошибка верификации подписи:', error);
    return false;
  }
}

// Построение канонической строки для верификации вебхука
function buildCanonicalString(req) {
  const method = req.method.toLowerCase();
  const path = req.originalUrl.split('?')[0]; // Путь без query параметров
  
  // Собираем заголовки (Host + все x-api-*)
  const headers = {};
  if (req.headers.host) {
    headers.host = req.headers.host;
  }
  
  // Добавляем все заголовки, начинающиеся с x-api-
  Object.keys(req.headers).forEach(key => {
    if (key.toLowerCase().startsWith('x-api-')) {
      headers[key.toLowerCase()] = req.headers[key];
    }
  });
  
  // Сортируем заголовки по имени
  // Согласно документации Finik: заголовки соединяются через &, последний БЕЗ & в конце
  const sortedHeaderKeys = Object.keys(headers).sort();
  const headerString = sortedHeaderKeys
    .map((key, index) => {
      const value = headers[key];
      // Последний заголовок без & в конце
      return index === sortedHeaderKeys.length - 1 
        ? `${key}:${value}`
        : `${key}:${value}&`;
    })
    .join('');
  
  // Query параметры (если есть)
  const queryParams = req.query;
  let queryString = '';
  if (Object.keys(queryParams).length > 0) {
    const sortedQueryKeys = Object.keys(queryParams).sort();
    queryString = sortedQueryKeys
      .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(queryParams[key] || '')}`)
      .join('&');
  }
  
  // Тело запроса (JSON, отсортированный по ключам)
  let bodyString = '';
  if (req.body && Object.keys(req.body).length > 0) {
    bodyString = JSON.stringify(sortObjectKeys(req.body));
  }
  
  // Собираем каноническую строку
  const parts = [
    method,
    path,
    headerString,
    queryString,
    bodyString
  ];
  
  // Если нет query параметров, не добавляем пустую строку
  return parts.filter((part, index) => {
    if (index === 3 && !queryString) return false; // Пропускаем пустую query строку
    return true;
  }).join('\n');
}

// Сортировка ключей объекта рекурсивно
function sortObjectKeys(obj) {
  if (obj === null || typeof obj !== 'object' || Array.isArray(obj)) {
    return obj;
  }
  
  const sorted = {};
  Object.keys(obj).sort().forEach(key => {
    sorted[key] = sortObjectKeys(obj[key]);
  });
  
  return sorted;
}

// Создание платежа в Finik
async function createPayment(paymentData) {
  // КРИТИЧЕСКОЕ ЛОГИРОВАНИЕ - должно выводиться ВСЕГДА
  console.error('\n\n╔═══════════════════════════════════════════════════════════════╗');
  console.error('║  НАЧАЛО СОЗДАНИЯ ПЛАТЕЖА FINIK - ЛОГИРОВАНИЕ АКТИВНО        ║');
  console.error('╚═══════════════════════════════════════════════════════════════╝\n');
  
  const baseUrl = getBaseUrl();
  // IMPORTANT: Host header must match the URL host exactly (according to Finik docs)
  const urlObj = new URL(baseUrl);
  const host = urlObj.host; // Используем host (как в документации), который может включать порт
  const apiKey = process.env.FINIK_API_KEY;
  const timestamp = Date.now().toString();
  
  console.error('🔍 Base URL:', baseUrl);
  console.error('🔍 Host:', host);
  console.error('🔍 API Key (первые 10):', apiKey ? `${apiKey.substring(0, 10)}...` : 'НЕ НАСТРОЕН!');
  console.error('🔍 Timestamp:', timestamp);
  
  if (!apiKey) {
    throw new Error('FINIK_API_KEY не настроен в .env');
  }
  
  const path = '/v1/payment';
  
  const requestData = {
    httpMethod: 'POST',
    path: path,
    headers: {
      Host: host, // Используем hostname без порта
      'x-api-key': apiKey,
      'x-api-timestamp': timestamp
    },
    queryStringParameters: undefined,
    body: paymentData
  };
  
  console.error('🔍 Request Data подготовлен');
  console.error('🔍 Headers:', JSON.stringify(requestData.headers, null, 2));
  
  // Используем библиотеку @mancho.devs/authorizer для создания подписи
  // Это гарантирует правильный формат канонической строки согласно документации Finik
  let privateKey = process.env.FINIK_PRIVATE_KEY_PEM;
  if (!privateKey) {
    throw new Error('FINIK_PRIVATE_KEY_PEM не настроен в .env');
  }
  
  // Обработка приватного ключа
  privateKey = privateKey.replace(/^["']|["']$/g, '');
  privateKey = privateKey.replace(/\\n/g, '\n');
  privateKey = privateKey.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  privateKey = privateKey.trim();
  
  console.error('\n=== Использование библиотеки @mancho.devs/authorizer ===');
  console.error('Base URL:', baseUrl);
  console.error('Host:', host);
  console.error('API Key:', apiKey ? `${apiKey.substring(0, 10)}...` : 'НЕ НАСТРОЕН!');
  console.error('Timestamp:', timestamp);
  console.error('Path:', path);
  
  // Создаем подпись с помощью библиотеки
  const signer = new Signer(requestData);
  const signature = await signer.sign(privateKey);
  
  console.error('✅ Подпись создана с помощью библиотеки @mancho.devs/authorizer');
  console.error('Длина подписи:', signature.length, 'символов');
  
  console.log('\n========================================');
  console.log('=== ОТЛАДКА ЗАПРОСА К FINIK API ===');
  console.log('========================================');
  console.log('Окружение:', process.env.FINIK_ENV || 'не указано');
  console.log('Base URL:', baseUrl);
  console.log('URL:', `${baseUrl}${path}`);
  console.log('Host:', host);
  console.log('API Key:', apiKey ? `${apiKey.substring(0, 10)}...` : 'НЕ НАСТРОЕН!');
  console.log('Timestamp:', timestamp);
  console.log('Используется библиотека: @mancho.devs/authorizer');
  console.log('Подпись (первые 50 символов):', signature.substring(0, 50) + '...');
  console.log('Длина подписи:', signature.length, 'символов');
  console.log('\n--- ТЕЛО ЗАПРОСА (форматированное) ---');
  console.log(JSON.stringify(paymentData, null, 2));
  console.log('\n--- ТЕЛО ЗАПРОСА (компактный формат, как отправляется) ---');
  console.log(JSON.stringify(sortObjectKeys(paymentData)));
  console.log('\n--- ЗАГОЛОВКИ ЗАПРОСА ---');
  console.log(JSON.stringify({
    'content-type': 'application/json',
    'x-api-key': apiKey,
    'x-api-timestamp': timestamp,
    'signature': signature.substring(0, 20) + '...'
  }, null, 2));
  console.log('\n========================================\n');
  
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
    // Получаем URL платежа из заголовка Location
    const paymentUrl = response.headers.get('location');
    return {
      success: true,
      paymentUrl: paymentUrl,
      status: response.status
    };
  } else if (response.status === 201) {
    // Прямой JSON ответ (если API вернет)
    const data = await response.json();
    return {
      success: true,
      paymentUrl: data.paymentUrl,
      paymentId: data.paymentId,
      status: response.status
    };
  } else {
    const errorText = await response.text();
    let errorDetails = errorText;
    
    // Пытаемся распарсить JSON ошибки
    try {
      const errorJson = JSON.parse(errorText);
      errorDetails = JSON.stringify(errorJson, null, 2);
      
      // Логируем детали ошибки
      console.error('\n=== Ошибка от Finik API ===');
      console.error('Статус:', response.status);
      console.error('Ответ:', errorDetails);
      console.error('URL:', url);
      console.error('Заголовки запроса:', {
        'x-api-key': apiKey ? `${apiKey.substring(0, 10)}...` : 'НЕ НАСТРОЕН',
        'x-api-timestamp': timestamp,
        'signature': '...'
      });
      
      // Если это 403, выводим дополнительные детали
      if (response.status === 403) {
        console.error('\nВозможные причины 403 Forbidden:');
        console.error('1. Неправильная подпись (проверьте приватный ключ)');
        console.error('2. Неправильный API ключ');
        console.error('3. Неправильный формат канонической строки');
        console.error('4. Неправильный формат тела запроса');
        console.error('5. Проблемы с заголовками (Host, x-api-key, x-api-timestamp)');
      }
    } catch (e) {
      // Если не JSON, просто выводим текст
      errorDetails = errorText;
    }
    
    throw new Error(`Ошибка создания платежа: ${response.status} - ${errorDetails}`);
  }
}

module.exports = {
  getBaseUrl,
  getPublicKey,
  createSignature,
  verifySignature,
  buildCanonicalString,
  createPayment,
  sortObjectKeys
};

