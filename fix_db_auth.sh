#!/bin/bash

# Скрипт для исправления проблемы аутентификации PostgreSQL
# Использование: bash fix_db_auth.sh

echo "=========================================="
echo "Исправление проблемы аутентификации БД"
echo "=========================================="
echo ""

# Проверка, запущен ли скрипт от root или с sudo
if [ "$EUID" -ne 0 ]; then 
    echo "Ошибка: Запустите скрипт с sudo: sudo bash fix_db_auth.sh"
    exit 1
fi

# Запрос пароля для нового пользователя
read -sp "Введите пароль для нового пользователя studd_user: " DB_PASSWORD
echo ""
read -sp "Подтвердите пароль: " DB_PASSWORD_CONFIRM
echo ""

if [ "$DB_PASSWORD" != "$DB_PASSWORD_CONFIRM" ]; then
    echo "Ошибка: Пароли не совпадают!"
    exit 1
fi

if [ -z "$DB_PASSWORD" ]; then
    echo "Ошибка: Пароль не может быть пустым!"
    exit 1
fi

echo ""
echo "Создание пользователя базы данных..."

# Экранирование пароля для SQL (замена одинарных кавычек)
ESCAPED_PASSWORD=$(echo "$DB_PASSWORD" | sed "s/'/''/g")

# Создание базы данных (если еще не создана)
sudo -u postgres psql -tc "SELECT 1 FROM pg_database WHERE datname = 'studd'" | grep -q 1 || sudo -u postgres psql -c "CREATE DATABASE studd;"

# Удаление пользователя, если он уже существует (для пересоздания)
sudo -u postgres psql -c "DROP USER IF EXISTS studd_user;" 2>/dev/null || true

# Создание нового пользователя и настройка параметров
sudo -u postgres psql <<EOF
CREATE USER studd_user WITH PASSWORD '$ESCAPED_PASSWORD';
ALTER ROLE studd_user SET client_encoding TO 'utf8';
ALTER ROLE studd_user SET default_transaction_isolation TO 'read committed';
ALTER ROLE studd_user SET timezone TO 'UTC';
GRANT ALL PRIVILEGES ON DATABASE studd TO studd_user;
EOF

# Назначение прав на схему
sudo -u postgres psql -d studd <<EOF
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
EOF

# Проверка успешности создания пользователя
if sudo -u postgres psql -tc "SELECT 1 FROM pg_roles WHERE rolname='studd_user'" | grep -q 1; then
    echo ""
    echo "=========================================="
    echo "Пользователь успешно создан!"
    echo "=========================================="
    echo ""
    echo "Обновите файл .env следующими значениями:"
    echo "DB_USER=studd_user"
    echo "DB_PASSWORD=$DB_PASSWORD"
    echo ""
    echo "Проверка подключения:"
    sudo -u postgres psql -c "\du studd_user"
    echo ""
    echo "Тест подключения к БД:"
    PGPASSWORD="$DB_PASSWORD" psql -U studd_user -d studd -c "SELECT 'Подключение успешно!' AS status;" 2>&1
else
    echo ""
    echo "=========================================="
    echo "ОШИБКА: Пользователь не был создан!"
    echo "=========================================="
    echo ""
    echo "Попробуйте создать пользователя вручную:"
    echo "sudo -u postgres psql"
    echo ""
    echo "Затем выполните:"
    echo "CREATE USER studd_user WITH PASSWORD '$ESCAPED_PASSWORD';"
    echo "GRANT ALL PRIVILEGES ON DATABASE studd TO studd_user;"
    echo "\\q"
    echo ""
    echo "И назначьте права на схему:"
    echo "sudo -u postgres psql -d studd"
    echo "GRANT ALL ON SCHEMA public TO studd_user;"
    echo "ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO studd_user;"
    echo "ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO studd_user;"
    exit 1
fi

