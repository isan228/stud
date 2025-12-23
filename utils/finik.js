const { Signer, RequestData } = require('@mancho.devs/authorizer');
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

// Создание подписи для запроса к Finik
async function createSignature(requestData) {
  const privateKey = process.env.FINIK_PRIVATE_KEY_PEM;
  if (!privateKey) {
    throw new Error('FINIK_PRIVATE_KEY_PEM не настроен в .env');
  }

  const signer = new Signer(requestData);
  return await signer.sign(privateKey);
}

// Верификация подписи от Finik
function verifySignature(canonicalString, signatureBase64) {
  const publicKey = getPublicKey();
  if (!publicKey) {
    throw new Error('Публичный ключ Finik не настроен в .env');
  }

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
  
  const signature = await createSignature(requestData);
  
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

