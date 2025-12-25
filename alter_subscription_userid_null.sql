-- Изменение поля userId в таблице Subscriptions для разрешения NULL
-- Выполните этот SQL скрипт в базе данных

-- Сначала проверим, какое имя таблицы используется
-- Выполните: \dt в psql или SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';

-- Вариант 1: Если таблица называется "Subscriptions" (с заглавной S)
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'Subscriptions'
    ) THEN
        ALTER TABLE "Subscriptions" ALTER COLUMN "userId" DROP NOT NULL;
        RAISE NOTICE 'Таблица "Subscriptions" найдена, поле userId изменено';
    END IF;
END $$;

-- Вариант 2: Если таблица называется "subscriptions" (все строчные)
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'subscriptions'
    ) THEN
        ALTER TABLE subscriptions ALTER COLUMN "userId" DROP NOT NULL;
        RAISE NOTICE 'Таблица "subscriptions" найдена, поле userId изменено';
    END IF;
END $$;

-- Вариант 3: Если таблица называется "subscriptions" и поле "userid" (все строчные)
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'subscriptions'
    ) AND EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'subscriptions' AND column_name = 'userid'
    ) THEN
        ALTER TABLE subscriptions ALTER COLUMN userid DROP NOT NULL;
        RAISE NOTICE 'Таблица "subscriptions" найдена, поле userid изменено';
    END IF;
END $$;

-- Проверка результата
SELECT 
    table_name,
    column_name,
    is_nullable,
    data_type
FROM information_schema.columns 
WHERE table_schema = 'public' 
    AND table_name IN ('Subscriptions', 'subscriptions')
    AND column_name IN ('userId', 'userid')
ORDER BY table_name, column_name;

