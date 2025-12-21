-- Скрипт для исправления прав на схему public
-- Использование: sudo -u postgres psql -d studd -f fix_schema_permissions.sql
-- Или выполните команды вручную в psql

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

-- Проверка прав
SELECT 'Права на схему public успешно назначены!' AS status;
\dn+ public

