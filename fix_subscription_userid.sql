-- Исправление поля userId в таблице Subscriptions для разрешения NULL
-- Выполните этот SQL скрипт в базе данных

-- Сначала проверим имя таблицы
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name ILIKE '%subscription%';

-- Вариант 1: Если таблица называется "Subscriptions" (с заглавной S)
ALTER TABLE "Subscriptions" ALTER COLUMN "userId" DROP NOT NULL;

-- Вариант 2: Если таблица называется "subscriptions" (все строчные)
-- ALTER TABLE subscriptions ALTER COLUMN "userId" DROP NOT NULL;

-- Проверка результата
SELECT 
    table_name,
    column_name,
    is_nullable,
    data_type
FROM information_schema.columns 
WHERE table_schema = 'public' 
    AND table_name ILIKE '%subscription%'
    AND column_name ILIKE '%userid%'
ORDER BY table_name, column_name;

