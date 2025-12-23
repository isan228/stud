const crypto = require('crypto');
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
  const sortedHeaderKeys = Object.keys(headerMap).sort();
  const headerString = sortedHeaderKeys
    .map(key => `${key}:${headerMap[key]}`)
    .join('&');
  
  // 4. Query параметры (если есть)
  let queryString = '';
  if (queryStringParameters && Object.keys(queryStringParameters).length > 0) {
    const sortedQueryKeys = Object.keys(queryStringParameters).sort();
    queryString = sortedQueryKeys
      .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(queryStringParameters[key] || '')}`)
      .join('&');
  }
  
  // 5. Тело запроса (JSON, отсортированный по ключам)
  let bodyString = '';
  if (body && Object.keys(body).length > 0) {
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

  // Обработка приватного ключа (замена \n на реальные переносы строк)
  privateKey = privateKey.replace(/\\n/g, '\n');

  // Построение канонической строки
  const canonicalString = buildCanonicalStringForSigning(requestData);
  
  // Создание подписи RSA-SHA256
  const signer = crypto.createSign('RSA-SHA256');
  signer.update(canonicalString, 'utf8');
  const signature = signer.sign(privateKey, 'base64');
  
  return signature;
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
  const sortedHeaderKeys = Object.keys(headers).sort();
  const headerString = sortedHeaderKeys
    .map(key => `${key}:${headers[key]}`)
    .join('&');
  
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
  const baseUrl = getBaseUrl();
  const host = new URL(baseUrl).host;
  const apiKey = process.env.FINIK_API_KEY;
  const timestamp = Date.now().toString();
  
  if (!apiKey) {
    throw new Error('FINIK_API_KEY не настроен в .env');
  }
  
  const path = '/v1/payment';
  
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
  
  const signature = createSignature(requestData);
  
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
    throw new Error(`Ошибка создания платежа: ${response.status} - ${errorText}`);
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

