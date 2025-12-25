# Инструкция по обновлению .env на сервере

## Что нужно обновить:

### 1. Обновить API ключ

**Старый ключ:**
```
FINIK_API_KEY=PSmszIm6XP61H86f1JPay9Mxue84QkiS86kiEJJF
```

**Новый ключ:**
```
FINIK_API_KEY=qWj8xhhOPt8YE4NnW1QB566NTW7S5xPS22DKHxm4
```

### 2. Проверить приватный ключ

Убедитесь, что `FINIK_PRIVATE_KEY_PEM` содержит **полный** ключ, а не обрезанный. Должен быть:

```
FINIK_PRIVATE_KEY_PEM="-----BEGIN PRIVATE KEY-----\nMIIEvAIBADANBgkqhkiG9w0BAQEFAASCBKYwggSiAgEAAoIBAQC10M+ecgVUVxpn\n...\n-----END PRIVATE KEY-----"
```

**Важно:** Ключ должен заканчиваться на `-----END PRIVATE KEY-----`

### 3. Проверить публичные ключи

Убедитесь, что публичные ключи полные (не обрезаны на `>`).

## Как обновить на сервере:

### Вариант 1: Через SSH и nano

```bash
# Подключитесь к серверу
ssh root@ваш_сервер_IP

# Перейдите в директорию проекта
cd ~/stud

# Откройте .env
nano .env

# Найдите строку FINIK_API_KEY и замените значение
# Сохраните: Ctrl+O, Enter, Ctrl+X
```

### Вариант 2: Автоматически через скрипт

```bash
# На сервере
cd ~/stud

# Скачайте скрипт (если еще не скачали)
git pull origin master

# Сделайте исполняемым
chmod +x update_finik_api_key.sh

# Запустите
./update_finik_api_key.sh
```

### Вариант 3: Через sed (одна команда)

```bash
# На сервере
cd ~/stud
sed -i 's/^FINIK_API_KEY=.*/FINIK_API_KEY=qWj8xhhOPt8YE4NnW1QB566NTW7S5xPS22DKHxm4/' .env
```

## После обновления:

1. **Проверьте изменения:**
   ```bash
   grep "FINIK_API_KEY" .env
   ```

2. **Перезапустите приложение:**
   ```bash
   pm2 restart stud-platform
   ```

3. **Проверьте логи:**
   ```bash
   pm2 logs stud-platform --lines 50
   ```

4. **Попробуйте создать платеж снова**

## Проверка всех настроек Finik:

Убедитесь, что в `.env` есть все необходимые переменные:

```env
FINIK_ENV=beta
FINIK_API_KEY=qWj8xhhOPt8YE4NnW1QB566NTW7S5xPS22DKHxm4
FINIK_ACCOUNT_ID=9f1641eb-29e3-4375-bc23-832c28d8abd1
FINIK_PRIVATE_KEY_PEM="-----BEGIN PRIVATE KEY-----\n...полный ключ...\n-----END PRIVATE KEY-----"
FINIK_PUBLIC_KEY_BETA="-----BEGIN PUBLIC KEY-----\n...полный ключ...\n-----END PUBLIC KEY-----"
FINIK_PUBLIC_KEY_PROD="-----BEGIN PUBLIC KEY-----\n...полный ключ...\n-----END PUBLIC KEY-----"
FINIK_REDIRECT_URL=https://stud.kg/payment/success
FINIK_ERROR_URL=https://stud.kg/payment/error
FINIK_WEBHOOK_PATH=/webhooks/finik
```

## Важные замечания:

1. **Приватный ключ** должен быть полным (не обрезанным)
2. **Публичные ключи** должны быть полными
3. **URL без пробелов** после знака `=`
4. **SESSION_SECRET** должен быть сгенерирован (не "ваш_случайный_секретный_ключ_минимум_32_символа")

## Генерация SESSION_SECRET:

Если нужно сгенерировать новый SESSION_SECRET:

```bash
openssl rand -base64 32
```

Затем замените в `.env`:
```env
SESSION_SECRET=сгенерированная_строка
```

