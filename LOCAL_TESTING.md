# Локальное тестирование интеграции Finik

## Подготовка

### 1. Установка зависимостей

```bash
npm install
```

### 2. Настройка .env для локальной разработки

Создайте файл `.env` в корне проекта:

```env
# Настройки базы данных (локальная PostgreSQL)
DB_NAME=studd
DB_USER=postgres
DB_PASSWORD=ваш_пароль
DB_HOST=localhost
DB_PORT=5432

# Настройки сервера
PORT=5000
NODE_ENV=development

# Секретный ключ для сессий
SESSION_SECRET=ваш_случайный_ключ_32_символа

# Настройки безопасности (для локальной разработки - false)
SECURE_COOKIES=false

# ============================================
# Настройки Finik Payment System (BETA)
# ============================================

FINIK_ENV=beta
FINIK_API_KEY=PSmszIm6XP61H86f1JPay9Mxue84QkiS86kiEJJF
FINIK_ACCOUNT_ID=ваш_account_id

# Приватный ключ (содержимое finik_private.pem)
FINIK_PRIVATE_KEY_PEM="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"

# Публичный ключ для Beta
FINIK_PUBLIC_KEY_BETA="-----BEGIN PUBLIC KEY-----\nMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAwlrlKz/8gLWd1ARWGA/8\no3a3Qy8G+hPifyqiPosiTY6nCHovANMIJXk6DH4qAqqZeLu8pLGxudkPbv8dSyG7\nF9PZEAryMPzjoB/9P/F6g0W46K/FHDtwTM3YIVvstbEbL19m8yddv/xCT9JPPJTb\nLsSTVZq5zCqvKzpupwlGS3Q3oPyLAYe+ZUn4Bx2J1WQrBu3b08fNaR3E8pAkCK27\nJqFnP0eFfa817VCtyVKcFHb5ij/D0eUP519Qr/pgn+gsoG63W4pPHN/pKwQUUiAy\nuLSHqL5S2yu1dffyMcMVi9E/Q2HCTcez5OvOllgOtkNYHSv9pnrMRuws3u87+hNT\nZwIDAQAB\n-----END PUBLIC KEY-----"

# URL для редиректа (будет настроен через ngrok)
FINIK_REDIRECT_URL=https://ваш-ngrok-url.ngrok.io/payment/success
FINIK_ERROR_URL=https://ваш-ngrok-url.ngrok.io/payment/error
FINIK_WEBHOOK_PATH=/webhooks/finik
```

### 3. Настройка ngrok для доступа из интернета

Finik должен иметь доступ к вашему локальному серверу для отправки вебхуков.

**Установка ngrok:**

```bash
# Windows (через Chocolatey)
choco install ngrok

# Или скачайте с https://ngrok.com/download
```

**Запуск ngrok:**

```bash
# Запустите ngrok на порту 5000
ngrok http 5000
```

Вы получите URL вида: `https://xxxx-xx-xx-xx-xx.ngrok.io`

**Обновите .env:**

```env
FINIK_REDIRECT_URL=https://xxxx-xx-xx-xx-xx.ngrok.io/payment/success
FINIK_ERROR_URL=https://xxxx-xx-xx-xx-xx.ngrok.io/payment/error
```

**Важно:** URL ngrok меняется при каждом перезапуске (на бесплатном плане). Используйте статический домен или обновляйте URL в настройках Finik.

### 4. Настройка базы данных

```bash
# Создайте базу данных
createdb studd

# Или через psql
psql -U postgres
CREATE DATABASE studd;
\q

# Синхронизируйте модели
npm run sync-db

# Создайте таблицу для сессий
psql -U postgres -d studd -f create_session_table.sql
```

## Запуск локального сервера

### Вариант 1: Обычный запуск

```bash
npm start
# или
node server.js
```

### Вариант 2: С автоперезагрузкой (для разработки)

```bash
npm run dev
# или установите nodemon глобально
npm install -g nodemon
nodemon server.js
```

Сервер будет доступен по адресу: `http://localhost:5000`

## Тестирование

### 1. Проверка создания платежа

1. Откройте браузер: `http://localhost:5000`
2. Зарегистрируйтесь или войдите
3. Перейдите на страницу подписки: `http://localhost:5000/subscription`
4. Выберите тип и длительность подписки
5. Нажмите "Оформить подписку"

**Что должно произойти:**
- Создается подписка со статусом `pending`
- Отправляется запрос в Finik API (beta)
- Вы получаете редирект на страницу оплаты Finik

### 2. Проверка вебхука

После оплаты Finik отправит вебхук на:
```
https://ваш-ngrok-url.ngrok.io/webhooks/finik
```

**Проверка вебхука:**

```bash
# В другом терминале запустите ngrok web interface
# Откройте http://127.0.0.1:4040 в браузере
# Там вы увидите все входящие запросы, включая вебхуки от Finik
```

### 3. Проверка логов

```bash
# В консоли сервера вы должны увидеть:
# "Вебхук Finik получен: ..."
# "Подписка X успешно активирована для пользователя Y"
```

## Отладка

### Проблема: ngrok не получает запросы

**Решение:**
1. Убедитесь, что ngrok запущен: `ngrok http 5000`
2. Проверьте, что сервер запущен на порту 5000
3. Проверьте URL в `.env` - должен совпадать с URL ngrok

### Проблема: "Invalid signature" в вебхуке

**Решение:**
1. Проверьте правильность `FINIK_PUBLIC_KEY_BETA` в `.env`
2. Убедитесь, что ключ содержит `\n` для переносов строк
3. Проверьте логи - там должна быть каноническая строка для отладки

### Проблема: Сессия теряется после редиректа

**Решение:**
Это нормально для локальной разработки. Страница `/payment/success` работает без сессии, используя `paymentId` из URL.

### Просмотр входящих запросов

**Через ngrok web interface:**
```bash
# Откройте в браузере
http://127.0.0.1:4040
```

Там вы увидите:
- Все HTTP запросы к вашему локальному серверу
- Заголовки и тело запросов
- Ответы сервера

## Альтернатива ngrok

Если ngrok не подходит, можно использовать:

1. **localtunnel:**
   ```bash
   npm install -g localtunnel
   lt --port 5000
   ```

2. **serveo:**
   ```bash
   ssh -R 80:localhost:5000 serveo.net
   ```

3. **Cloudflare Tunnel:**
   ```bash
   cloudflared tunnel --url http://localhost:5000
   ```

## Полезные команды

```bash
# Проверка переменных окружения
node -e "require('dotenv').config(); console.log('FINIK_ENV:', process.env.FINIK_ENV)"

# Проверка подключения к базе данных
npm run sync-db

# Просмотр логов в реальном времени
# (если используете nodemon, логи выводятся в консоль)

# Проверка статуса подписки в базе
psql -U postgres -d studd -c "SELECT id, paymentId, paymentStatus, isActive FROM \"Subscriptions\" ORDER BY \"createdAt\" DESC LIMIT 5;"
```

## Переход на продакшен

Когда будете готовы к продакшену:

1. Измените в `.env`:
   ```env
   FINIK_ENV=prod
   FINIK_API_KEY=ваш_prod_api_key
   FINIK_REDIRECT_URL=https://stud.kg/payment/success
   ```

2. Обновите публичный ключ на production

3. Разверните на сервере согласно `DEPLOY.md`

