# Инструкция по деплою на удаленный сервер

## Требования

- Ubuntu/Debian сервер (или другой Linux)
- Node.js 16+ и npm
- PostgreSQL 12+
- Git
- PM2 (менеджер процессов для Node.js)
- Nginx (для проксирования)

## Шаг 1: Подготовка сервера

### 1.1 Обновление системы
```bash
sudo apt update && sudo apt upgrade -y
```

### 1.2 Установка Node.js
```bash
# Установка Node.js 18.x
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Проверка версии
node -v
npm -v
```

### 1.3 Установка PostgreSQL
```bash
sudo apt install -y postgresql postgresql-contrib

# Запуск PostgreSQL
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

### 1.4 Настройка PostgreSQL
```bash
# Переключение на пользователя postgres
sudo -u postgres psql

# В консоли PostgreSQL выполните:
CREATE DATABASE studd;
CREATE USER postgres WITH PASSWORD 'ваш_надежный_пароль';
ALTER ROLE postgres SET client_encoding TO 'utf8';
ALTER ROLE postgres SET default_transaction_isolation TO 'read committed';
ALTER ROLE postgres SET timezone TO 'UTC';
GRANT ALL PRIVILEGES ON DATABASE studd TO postgres;
\q
```

### 1.5 Установка PM2
```bash
sudo npm install -g pm2
```

### 1.6 Установка Nginx
```bash
sudo apt install -y nginx
sudo systemctl start nginx
sudo systemctl enable nginx
```

## Шаг 2: Клонирование проекта

```bash
# Переход в домашнюю директорию
cd ~

# Клонирование репозитория
git clone https://github.com/isan228/stud.git
cd stud

# Установка зависимостей
npm install
```

## Шаг 3: Настройка переменных окружения

```bash
# Создание файла .env
nano .env
```

Добавьте следующее содержимое (замените значения на свои):
```env
# Настройки базы данных PostgreSQL
DB_NAME=studd
DB_USER=postgres
DB_PASSWORD=ваш_надежный_пароль
DB_HOST=localhost
DB_PORT=5432

# Настройки сервера
PORT=5000
NODE_ENV=production

# Секретный ключ для сессий (сгенерируйте случайную строку!)
SESSION_SECRET=ваш_случайный_секретный_ключ_минимум_32_символа

# Настройки безопасности (для HTTPS)
SECURE_COOKIES=false
```

**Важно:** Сгенерируйте безопасный SESSION_SECRET:
```bash
openssl rand -base64 32
```

## Шаг 4: Синхронизация базы данных

```bash
# Синхронизация структуры БД
npm run sync-db

# Опционально: загрузка тестовых данных
npm run seed
```

## Шаг 5: Создание директорий для логов и загрузок

```bash
mkdir -p logs uploads
chmod 755 logs uploads
```

## Шаг 6: Запуск приложения через PM2

```bash
# Запуск приложения
pm2 start ecosystem.config.js

# Сохранение конфигурации PM2 для автозапуска
pm2 save
pm2 startup

# Проверка статуса
pm2 status
pm2 logs stud-platform
```

## Шаг 7: Настройка Nginx как reverse proxy

```bash
# Создание конфигурации Nginx
sudo nano /etc/nginx/sites-available/stud-platform
```

Добавьте следующую конфигурацию:
```nginx
server {
    listen 80;
    server_name ваш_домен.com www.ваш_домен.com;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Увеличение размера загружаемых файлов
    client_max_body_size 50M;
}
```

Активация конфигурации:
```bash
# Создание символической ссылки
sudo ln -s /etc/nginx/sites-available/stud-platform /etc/nginx/sites-enabled/

# Проверка конфигурации
sudo nginx -t

# Перезагрузка Nginx
sudo systemctl reload nginx
```

## Шаг 8: Настройка файрвола (опционально)

```bash
# Разрешение HTTP и HTTPS
sudo ufw allow 'Nginx Full'
sudo ufw allow ssh
sudo ufw enable
```

## Шаг 9: Настройка SSL (HTTPS) с Let's Encrypt

```bash
# Установка Certbot
sudo apt install -y certbot python3-certbot-nginx

# Получение SSL сертификата
sudo certbot --nginx -d ваш_домен.com -d www.ваш_домен.com

# Автоматическое обновление сертификата
sudo certbot renew --dry-run
```

После установки SSL обновите `.env`:
```env
SECURE_COOKIES=true
```

И перезапустите приложение:
```bash
pm2 restart stud-platform
```

## Полезные команды PM2

```bash
# Просмотр статуса
pm2 status

# Просмотр логов
pm2 logs stud-platform

# Перезапуск приложения
pm2 restart stud-platform

# Остановка приложения
pm2 stop stud-platform

# Удаление из PM2
pm2 delete stud-platform

# Мониторинг
pm2 monit
```

## Обновление приложения

```bash
cd ~/stud
git pull origin master
npm install
npm run sync-db  # Если были изменения в моделях
pm2 restart stud-platform
```

## Резервное копирование базы данных

```bash
# Создание бэкапа
pg_dump -U postgres studd > backup_$(date +%Y%m%d_%H%M%S).sql

# Восстановление из бэкапа
psql -U postgres studd < backup_20250101_120000.sql
```

## Решение проблем

### Приложение не запускается
```bash
# Проверка логов
pm2 logs stud-platform --lines 100

# Проверка подключения к БД
psql -U postgres -d studd -c "SELECT 1;"
```

### Проблемы с правами доступа
```bash
# Проверка прав на директории
ls -la ~/stud
chmod -R 755 ~/stud
```

### Nginx не проксирует запросы
```bash
# Проверка конфигурации
sudo nginx -t

# Проверка статуса
sudo systemctl status nginx

# Просмотр логов
sudo tail -f /var/log/nginx/error.log
```

## Безопасность

1. **Измените пароль администратора** после первого входа
2. **Используйте сильные пароли** для базы данных
3. **Настройте файрвол** для ограничения доступа
4. **Регулярно обновляйте** систему и зависимости
5. **Настройте автоматические бэкапы** базы данных

## Контакты

При возникновении проблем проверьте логи:
- PM2: `pm2 logs stud-platform`
- Nginx: `sudo tail -f /var/log/nginx/error.log`
- PostgreSQL: `sudo tail -f /var/log/postgresql/postgresql-*.log`

