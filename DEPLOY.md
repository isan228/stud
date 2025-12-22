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

**Вариант 1: Автоматический скрипт (рекомендуется)**
```bash
# Переход в директорию проекта
cd ~/stud

# Сделать скрипт исполняемым (если еще не сделано)
chmod +x fix_db_auth.sh

# Запуск скрипта для создания пользователя (потребуется ввести пароль)
sudo bash fix_db_auth.sh

# После выполнения скрипта обновите файл .env с новыми учетными данными
```

**Вариант 2: Использование SQL скрипта**
```bash
# Отредактируйте create_db_user.sql и замените 'ваш_надежный_пароль' на свой пароль
nano create_db_user.sql

# Выполнение SQL скрипта
sudo -u postgres psql -f create_db_user.sql
```

**Вариант 3: Ручная настройка**
```bash
# Переключение на пользователя postgres
sudo -u postgres psql

# В консоли PostgreSQL выполните:
CREATE DATABASE studd;

# Создание нового пользователя для приложения (замените 'ваш_надежный_пароль' на свой пароль)
CREATE USER studd_user WITH PASSWORD 'ваш_надежный_пароль';

# Настройка параметров пользователя
ALTER ROLE studd_user SET client_encoding TO 'utf8';
ALTER ROLE studd_user SET default_transaction_isolation TO 'read committed';
ALTER ROLE studd_user SET timezone TO 'UTC';

# Назначение прав на базу данных
GRANT ALL PRIVILEGES ON DATABASE studd TO studd_user;

# Выход из консоли PostgreSQL
\q

# Подключение к базе данных studd для назначения прав на схему
sudo -u postgres psql -d studd

# В консоли PostgreSQL выполните:
-- Даем права на использование и создание объектов в схеме public
GRANT USAGE ON SCHEMA public TO studd_user;
GRANT CREATE ON SCHEMA public TO studd_user;
GRANT ALL ON SCHEMA public TO studd_user;

-- Делаем пользователя владельцем схемы (для полного доступа)
ALTER SCHEMA public OWNER TO studd_user;

-- Настройка прав по умолчанию для будущих объектов
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO studd_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO studd_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO studd_user;
\q
```

**Альтернативный вариант:** Если вы хотите использовать существующего пользователя `postgres`, измените его пароль:
```bash
sudo -u postgres psql
ALTER USER postgres WITH PASSWORD 'ваш_новый_пароль';
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
DB_USER=studd_user
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

### Автоматическая настройка (рекомендуется)

```bash
# Переход в директорию проекта
cd ~/stud

# Сделать скрипт исполняемым
chmod +x setup_nginx.sh

# Запуск скрипта (потребуется ввести домен или IP)
sudo bash setup_nginx.sh
```

Скрипт автоматически:
- Проверит и установит Nginx, если необходимо
- Создаст необходимые директории
- Настроит конфигурацию
- Проверит и перезагрузит Nginx

### Ручная настройка

**Если вы получили ошибку "Directory '/etc/nginx/sites-available' does not exist":**

Выполните эти команды для создания директорий:

```bash
# Создание директорий
sudo mkdir -p /etc/nginx/sites-available
sudo mkdir -p /etc/nginx/sites-enabled

# Добавление include директивы в nginx.conf (если её нет)
if ! grep -q "include /etc/nginx/sites-enabled/\*;" /etc/nginx/nginx.conf; then
    sudo cp /etc/nginx/nginx.conf /etc/nginx/nginx.conf.backup
    sudo sed -i '/http {/a\    include /etc/nginx/sites-enabled/*;' /etc/nginx/nginx.conf
fi
```

Затем продолжайте с настройкой конфигурации ниже.

### Проверка установки Nginx

```bash
# Проверка, установлен ли Nginx
nginx -v

# Если не установлен, установите:
sudo apt install -y nginx
sudo systemctl start nginx
sudo systemctl enable nginx
```

### Вариант 1: Использование sites-available/sites-enabled (Ubuntu/Debian)

**Важно:** Сначала проверьте установку Nginx и создайте директории:

```bash
# 1. Проверка установки Nginx
if ! command -v nginx &> /dev/null; then
    echo "Nginx не установлен. Устанавливаю..."
    sudo apt update
    sudo apt install -y nginx
    sudo systemctl start nginx
    sudo systemctl enable nginx
else
    echo "Nginx установлен: $(nginx -v 2>&1)"
fi

# 2. Создание директорий, если их нет
if [ ! -d "/etc/nginx/sites-available" ]; then
    echo "Создание директорий sites-available и sites-enabled..."
    sudo mkdir -p /etc/nginx/sites-available
    sudo mkdir -p /etc/nginx/sites-enabled
    
    # Добавление директивы include в nginx.conf, если её нет
    if ! grep -q "include /etc/nginx/sites-enabled/\*;" /etc/nginx/nginx.conf; then
        echo "Добавление include директивы в nginx.conf..."
        # Создание резервной копии
        sudo cp /etc/nginx/nginx.conf /etc/nginx/nginx.conf.backup.$(date +%Y%m%d_%H%M%S)
        sudo sed -i '/http {/a\    include /etc/nginx/sites-enabled/*;' /etc/nginx/nginx.conf
        echo "Директива include добавлена в nginx.conf"
    fi
    echo "Директории созданы успешно!"
else
    echo "Директории sites-available и sites-enabled уже существуют"
fi

# 3. Создание конфигурации Nginx
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

### Вариант 2: Использование conf.d (альтернативный метод)

Если директории `sites-available` не существует или вы предпочитаете другой подход:

```bash
# Создание конфигурации в conf.d
sudo nano /etc/nginx/conf.d/stud-platform.conf
```

Добавьте ту же конфигурацию, что и выше.

Затем:
```bash
# Проверка конфигурации
sudo nginx -t

# Перезагрузка Nginx
sudo systemctl reload nginx
```

### Вариант 3: Прямое редактирование nginx.conf

Если оба предыдущих варианта не работают:

```bash
# Резервная копия
sudo cp /etc/nginx/nginx.conf /etc/nginx/nginx.conf.backup

# Редактирование конфигурации
sudo nano /etc/nginx/nginx.conf
```

Найдите блок `http {` и добавьте внутри него (перед закрывающей скобкой):

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

    client_max_body_size 50M;
}
```

Затем:
```bash
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
# Создание бэкапа (используйте вашего пользователя БД)
pg_dump -U studd_user studd > backup_$(date +%Y%m%d_%H%M%S).sql

# Или с использованием postgres пользователя (если нужны права суперпользователя)
sudo -u postgres pg_dump studd > backup_$(date +%Y%m%d_%H%M%S).sql

# Восстановление из бэкапа
psql -U studd_user studd < backup_20250101_120000.sql
```

## Решение проблем

### Ошибка аутентификации PostgreSQL (password authentication failed)

Если вы получаете ошибку `password authentication failed for user`, выполните следующие шаги:

**Вариант 1: Автоматический скрипт (самый простой)**
```bash
cd ~/stud
chmod +x fix_db_auth.sh
sudo bash fix_db_auth.sh
# Следуйте инструкциям скрипта и обновите .env файл
```

**Вариант 2: Использование SQL скрипта**
```bash
# Отредактируйте create_db_user.sql и замените пароль
nano create_db_user.sql
sudo -u postgres psql -f create_db_user.sql
# Обновите файл .env с новыми учетными данными
```

**Вариант 3: Ручное создание пользователя**
```bash
# Подключение к PostgreSQL от имени суперпользователя
sudo -u postgres psql

# В консоли PostgreSQL:
CREATE USER studd_user WITH PASSWORD 'ваш_надежный_пароль';
ALTER ROLE studd_user SET client_encoding TO 'utf8';
ALTER ROLE studd_user SET default_transaction_isolation TO 'read committed';
ALTER ROLE studd_user SET timezone TO 'UTC';
GRANT ALL PRIVILEGES ON DATABASE studd TO studd_user;
\q

# Назначение прав на схему
sudo -u postgres psql -d studd
-- Даем права на использование и создание объектов в схеме public
GRANT USAGE ON SCHEMA public TO studd_user;
GRANT CREATE ON SCHEMA public TO studd_user;
GRANT ALL ON SCHEMA public TO studd_user;

-- Делаем пользователя владельцем схемы (для полного доступа)
ALTER SCHEMA public OWNER TO studd_user;

-- Настройка прав по умолчанию для будущих объектов
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO studd_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO studd_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO studd_user;
\q

# Обновите файл .env с новыми учетными данными:
# DB_USER=studd_user
# DB_PASSWORD=ваш_надежный_пароль
```

**Вариант 4: Изменение пароля существующего пользователя**
```bash
sudo -u postgres psql
ALTER USER postgres WITH PASSWORD 'ваш_новый_пароль';
\q

# Обновите файл .env:
# DB_USER=postgres
# DB_PASSWORD=ваш_новый_пароль
```

**Проверка подключения:**
```bash
# Проверка подключения с новым пользователем
psql -U studd_user -d studd -c "SELECT 1;"

# Или с postgres пользователем
psql -U postgres -d studd -c "SELECT 1;"
```

### Приложение не запускается
```bash
# Проверка логов
pm2 logs stud-platform --lines 100

# Проверка подключения к БД
psql -U studd_user -d studd -c "SELECT 1;"
```

### Проблемы с правами доступа
```bash
# Проверка прав на директории
ls -la ~/stud
chmod -R 755 ~/stud
```

### Ошибка: Directory '/etc/nginx/sites-available' does not exist

Если вы получили эту ошибку, выполните:

```bash
# Проверка установки Nginx
nginx -v

# Если Nginx не установлен
sudo apt install -y nginx

# Создание директорий, если их нет
sudo mkdir -p /etc/nginx/sites-available
sudo mkdir -p /etc/nginx/sites-enabled

# Проверка наличия include директивы в nginx.conf
grep "include /etc/nginx/sites-enabled" /etc/nginx/nginx.conf

# Если директивы нет, добавьте её в блок http { в файле /etc/nginx/nginx.conf:
# include /etc/nginx/sites-enabled/*;
```

Или используйте альтернативный метод (см. Шаг 7, Вариант 2 или 3).

### Nginx не проксирует запросы
```bash
# Проверка конфигурации
sudo nginx -t

# Проверка статуса
sudo systemctl status nginx

# Просмотр логов
sudo tail -f /var/log/nginx/error.log

# Проверка, что конфигурация загружена
sudo nginx -T | grep -A 10 "stud-platform"
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


