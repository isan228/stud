-- Скрипт для создания пользователя базы данных и назначения прав
-- Использование: sudo -u postgres psql -f create_db_user.sql

-- Создание базы данных (если еще не создана)
CREATE DATABASE studd;

-- Создание нового пользователя для приложения
-- ВАЖНО: Замените 'ваш_надежный_пароль' на свой пароль!
CREATE USER studd_user WITH PASSWORD 'ваш_надежный_пароль';

-- Настройка параметров пользователя
ALTER ROLE studd_user SET client_encoding TO 'utf8';
ALTER ROLE studd_user SET default_transaction_isolation TO 'read committed';
ALTER ROLE studd_user SET timezone TO 'UTC';

-- Назначение прав на базу данных
GRANT ALL PRIVILEGES ON DATABASE studd TO studd_user;

-- Подключение к базе данных для назначения прав на схему
\c studd

-- Назначение прав на схему public
GRANT USAGE ON SCHEMA public TO studd_user;
GRANT CREATE ON SCHEMA public TO studd_user;
GRANT ALL ON SCHEMA public TO studd_user;

-- Делаем пользователя владельцем схемы (для полного доступа)
ALTER SCHEMA public OWNER TO studd_user;

-- Настройка прав по умолчанию для будущих объектов
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO studd_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO studd_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO studd_user;

-- Вывод информации о созданном пользователе
SELECT 'Пользователь studd_user успешно создан!' AS status;
\du studd_user

