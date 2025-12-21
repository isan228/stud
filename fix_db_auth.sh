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

# Создание SQL скрипта с паролем
SQL_FILE=$(mktemp)
cat > "$SQL_FILE" <<EOF
-- Создание базы данных (если еще не создана)
SELECT 'CREATE DATABASE studd' WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'studd')\gexec

-- Удаление пользователя, если он уже существует (для пересоздания)
DROP USER IF EXISTS studd_user;

-- Создание нового пользователя
CREATE USER studd_user WITH PASSWORD '$DB_PASSWORD';

-- Настройка параметров пользователя
ALTER ROLE studd_user SET client_encoding TO 'utf8';
ALTER ROLE studd_user SET default_transaction_isolation TO 'read committed';
ALTER ROLE studd_user SET timezone TO 'UTC';

-- Назначение прав на базу данных
GRANT ALL PRIVILEGES ON DATABASE studd TO studd_user;
EOF

# Выполнение SQL скрипта
sudo -u postgres psql -f "$SQL_FILE"

# Назначение прав на схему
sudo -u postgres psql -d studd <<EOF
GRANT ALL ON SCHEMA public TO studd_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO studd_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO studd_user;
EOF

# Удаление временного файла
rm "$SQL_FILE"

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

