# Быстрое исправление проблемы аутентификации PostgreSQL

## Создание пользователя вручную (выполните на сервере)

Выполните следующие команды на сервере:

```bash
# 1. Подключение к PostgreSQL
sudo -u postgres psql

# 2. В консоли PostgreSQL выполните (замените '123123123' на ваш пароль):
CREATE DATABASE studd;

CREATE USER studd_user WITH PASSWORD '123123123';

ALTER ROLE studd_user SET client_encoding TO 'utf8';
ALTER ROLE studd_user SET default_transaction_isolation TO 'read committed';
ALTER ROLE studd_user SET timezone TO 'UTC';

GRANT ALL PRIVILEGES ON DATABASE studd TO studd_user;

# Выход из консоли
\q

# 3. Назначение прав на схему
sudo -u postgres psql -d studd

# 4. В консоли PostgreSQL выполните:
GRANT ALL ON SCHEMA public TO studd_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO studd_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO studd_user;

# Выход
\q

# 5. Проверка создания пользователя
sudo -u postgres psql -c "\du studd_user"

# 6. Тест подключения
PGPASSWORD='123123123' psql -U studd_user -d studd -c "SELECT 'Подключение успешно!' AS status;"
```

## Обновление .env файла

Убедитесь, что в файле `.env` указаны правильные значения:

```env
DB_NAME=studd
DB_USER=studd_user
DB_PASSWORD=123123123
DB_HOST=localhost
DB_PORT=5432
```

## Синхронизация базы данных

После создания пользователя выполните:

```bash
npm run sync-db
```

## Если проблема сохраняется

Проверьте файл конфигурации PostgreSQL `pg_hba.conf`:

```bash
sudo nano /etc/postgresql/*/main/pg_hba.conf
```

Убедитесь, что для локальных подключений используется `md5` или `scram-sha-256`:

```
local   all             all                                     md5
host    all             all             127.0.0.1/32            md5
```

После изменения перезапустите PostgreSQL:

```bash
sudo systemctl restart postgresql
```

