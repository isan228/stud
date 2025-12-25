# Настройка Callback URL для Finik Payment System

## Что такое Callback URL (Webhook URL)?

**Callback URL** (также называемый **Webhook URL**) - это адрес вашего сервера, куда Finik будет отправлять уведомления о статусе платежей.

После того, как пользователь завершит оплату, Finik отправит POST запрос на ваш callback URL с информацией о результате платежа (успешно или неудачно).

## Где находится роут для callback?

Роут уже создан и настроен:

- **Файл:** `routes/finik-webhook.js`
- **Путь:** `/webhooks/finik`
- **Метод:** `POST`
- **Подключен в:** `server.js`

## Какой URL нужно указать в Finik?

### Для локального тестирования (через ngrok):

```
https://ваш-ngrok-url.ngrok-free.app/webhooks/finik
```

**Пример:**
```
https://2e1d7ae9a37f.ngrok-free.app/webhooks/finik
```

### Для продакшена:

```
https://stud.kg/webhooks/finik
```

## Настройка в .env файле

В файле `.env` уже есть настройка:

```env
FINIK_WEBHOOK_PATH=/webhooks/finik
```

**Важно:** URL формируется автоматически из `FINIK_REDIRECT_URL` + `FINIK_WEBHOOK_PATH`

## Как это работает?

1. **При создании платежа** в `routes/payment.js` автоматически формируется `webhookUrl`:
   ```javascript
   const webhookUrl = `${baseUrl}/webhooks/finik`;
   ```

2. **Этот URL отправляется в Finik** в поле `Data.webhookUrl` при создании платежа

3. **После оплаты** Finik отправляет POST запрос на этот URL с данными о платеже

4. **Роут `/webhooks/finik`** обрабатывает запрос:
   - Проверяет подпись
   - Обновляет статус подписки
   - Активирует подписку при успешной оплате

## Что нужно указать в Finik?

В настройках вашего аккаунта Finik укажите:

**Callback URL (Webhook URL):**
```
https://stud.kg/webhooks/finik
```

Или для тестирования:
```
https://ваш-ngrok-url.ngrok-free.app/webhooks/finik
```

## Проверка работы webhook

### 1. Локальное тестирование

```bash
# Запустите ngrok
ngrok http 5000

# Обновите .env с новым ngrok URL
FINIK_REDIRECT_URL=https://ваш-ngrok-url.ngrok-free.app/payment/success

# Перезапустите сервер
npm run dev
```

### 2. Проверка доступности

Проверьте, что роут доступен:

```bash
# Должен вернуть ошибку 400 (ожидается POST запрос)
curl https://stud.kg/webhooks/finik

# Или через браузер (должна быть ошибка метода)
https://stud.kg/webhooks/finik
```

### 3. Логирование

При получении webhook в логах сервера вы увидите:

```
Вебхук Finik получен: { id: '...', transactionId: '...', status: 'SUCCEEDED', ... }
Подписка X успешно активирована для пользователя Y
```

## Структура запроса от Finik

Finik отправляет POST запрос с такими данными:

```json
{
  "id": "transaction-id-15423_CREDIT",
  "transactionId": "transaction-id-241234",
  "status": "SUCCEEDED",
  "amount": 1000,
  "accountId": "your-account-id",
  "fields": {
    "amount": 1000,
    "fieldId1": "value1"
  },
  "requestDate": 1737369012345,
  "transactionDate": 1737369012345
}
```

## Заголовки запроса

Finik отправляет следующие заголовки:

- `signature` - подпись запроса (для верификации)
- `x-api-timestamp` - временная метка запроса
- `Content-Type: application/json`

## Безопасность

Роут автоматически:
- ✅ Проверяет подпись запроса (используя публичный ключ Finik)
- ✅ Проверяет временную метку (не старше 5 минут)
- ✅ Валидирует данные запроса
- ✅ Обрабатывает ошибки безопасно

## Важно для ngrok

⚠️ **При локальном тестировании:**

1. URL ngrok меняется при каждом перезапуске (на бесплатном плане)
2. Нужно обновлять URL в `.env` при каждом перезапуске ngrok
3. Или использовать статический домен ngrok (платная функция)

## Резюме

✅ **Роут уже создан:** `/webhooks/finik`  
✅ **Автоматически формируется:** при создании платежа  
✅ **Нужно указать в Finik:** `https://stud.kg/webhooks/finik`  
✅ **Безопасность:** проверка подписи встроена

Вам **не нужно создавать новую страницу** - роут уже работает!

