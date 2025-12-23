-- Скрипт для настройки локальной базы данных
-- Выполните этот SQL скрипт в вашей локальной базе данных

-- Создание таблицы для хранения сессий
CREATE TABLE IF NOT EXISTS "session" (
  "sid" varchar NOT NULL COLLATE "default",
  "sess" json NOT NULL,
  "expire" timestamp(6) NOT NULL
)
WITH (OIDS=FALSE);

-- Создание первичного ключа
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'session_pkey'
    ) THEN
        ALTER TABLE "session" ADD CONSTRAINT "session_pkey" PRIMARY KEY ("sid") NOT DEFERRABLE INITIALLY IMMEDIATE;
    END IF;
END $$;

-- Создание индекса для expire
CREATE INDEX IF NOT EXISTS "IDX_session_expire" ON "session" ("expire");

-- Предоставление прав (замените 'postgres' на вашего пользователя БД)
-- GRANT ALL ON TABLE "session" TO postgres;

