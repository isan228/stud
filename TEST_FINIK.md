# Инструкция по тестированию платежей Finik

## Подготовка

### 1. Установка зависимостей

На сервере выполните:
```bash
cd ~/stud
npm install
```

Это установит:
- `@mancho.devs/authorizer` - для работы с подписями Finik
- `uuid` - для генерации уникальных ID платежей
- `node-fetch` - для HTTP запросов (если Node.js < 18)

### 2. Настройка переменных окружения

Убедитесь, что в `.env` файле настроены все переменные Finik:

```env
FINIK_ENV=beta
FINIK_API_KEY=PSmszIm6XP61H86f1JPay9Mxue84QkiS86kiEJJF
FINIK_ACCOUNT_ID=ваш_account_id
FINIK_PRIVATE_KEY_PEM="-----BEGIN PRIVATE KEY-----\n..."
FINIK_PUBLIC_KEY_BETA="-----BEGIN PUBLIC KEY-----\n..."
FINIK_REDIRECT_URL=https://stud.kg/payment/success
FINIK_ERROR_URL=https://stud.kg/payment/error
FINIK_WEBHOOK_PATH=/webhooks/finik
```

### 3. Обновление базы данных

После изменения модели `Subscription` нужно синхронизировать базу:

```bash
npm run sync-db
```

Это добавит поля:
- `paymentId` - ID платежа в Finik
- `transactionId` - ID транзакции
- `paymentStatus` - статус оплаты (pending, succeeded, failed)

### 4. Перезапуск приложения

```bash
pm2 restart stud-platform
```

## Тестирование

### Шаг 1: Создание платежа

1. Войдите в систему как пользователь
2. Перейдите на страницу подписки: `https://stud.kg/subscription`
3. Выберите тип и длительность подписки
4. Нажмите "Оформить подписку"

**Что должно произойти:**
- Создается подписка со статусом `pending`
- Отправляется запрос в Finik API
- Вы получаете редирект на страницу оплаты Finik (QR-код)

### Шаг 2: Оплата

1. На странице Finik отсканируйте QR-код или используйте тестовую карту
2. Завершите оплату

**Что должно произойти:**
- Finik перенаправит вас на `https://stud.kg/payment/success`
- Finik отправит вебхук на `https://stud.kg/webhooks/finik`
- Подписка активируется автоматически

### Шаг 3: Проверка вебхука

Проверьте логи приложения:
```bash
pm2 logs stud-platform
```

Вы должны увидеть:
```
Вебхук Finik получен: { id: '...', transactionId: '...', status: 'SUCCEEDED', ... }
Подписка X успешно активирована для пользователя Y
```

### Шаг 4: Проверка активации подписки

1. Перейдите в профиль: `https://stud.kg/profile`
2. Проверьте, что подписка активна
3. Проверьте дату окончания подписки

## Отладка

### Проблема: "Ошибка при создании платежа"

**Проверьте:**
1. Правильность `FINIK_API_KEY` в `.env`
2. Правильность `FINIK_PRIVATE_KEY_PEM` (должен быть в формате PEM)
3. Логи приложения: `pm2 logs stud-platform`

### Проблема: "Invalid signature" в вебхуке

**Проверьте:**
1. Правильность `FINIK_PUBLIC_KEY_BETA` в `.env`
2. Что `FINIK_ENV=beta` (для тестирования)
3. Логи вебхука в консоли

### Проблема: Подписка не активируется после оплаты

**Проверьте:**
1. Что вебхук доступен из интернета: `curl https://stud.kg/webhooks/finik`
2. Логи приложения на наличие ошибок
3. Статус подписки в базе данных:
   ```sql
   SELECT id, paymentId, transactionId, paymentStatus, isActive 
   FROM "Subscriptions" 
   ORDER BY "createdAt" DESC LIMIT 5;
   ```

### Тестирование вебхука вручную

Можно протестировать вебхук локально с помощью `ngrok`:

```bash
# На сервере
ngrok http 5000

# Используйте URL от ngrok в настройках Finik для webhookUrl
```

## Полезные команды

```bash
# Просмотр логов
pm2 logs stud-platform

# Проверка статуса
pm2 status

# Перезапуск
pm2 restart stud-platform

# Проверка переменных окружения
node -e "require('dotenv').config(); console.log('FINIK_ENV:', process.env.FINIK_ENV)"
```

## Переход на Production

Когда будете готовы к продакшену:

1. Измените в `.env`:
   ```env
   FINIK_ENV=prod
   FINIK_API_KEY=ваш_prod_api_key
   FINIK_PUBLIC_KEY_PROD="..."
   ```

2. Обновите URL:
   ```env
   FINIK_REDIRECT_URL=https://stud.kg/payment/success
   ```

3. Перезапустите:
   ```bash
   pm2 restart stud-platform
   ```

