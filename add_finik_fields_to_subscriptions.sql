-- Добавление полей для Finik в таблицу Subscriptions
-- Выполните этот SQL скрипт в базе данных

-- Добавляем поле paymentId
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'Subscriptions' AND column_name = 'paymentId'
    ) THEN
        ALTER TABLE "Subscriptions" ADD COLUMN "paymentId" VARCHAR(255);
    END IF;
END $$;

-- Добавляем поле transactionId
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'Subscriptions' AND column_name = 'transactionId'
    ) THEN
        ALTER TABLE "Subscriptions" ADD COLUMN "transactionId" VARCHAR(255);
    END IF;
END $$;

-- Добавляем ENUM тип для paymentStatus, если его нет
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_Subscriptions_paymentStatus') THEN
        CREATE TYPE "enum_Subscriptions_paymentStatus" AS ENUM('pending', 'succeeded', 'failed');
    END IF;
END $$;

-- Добавляем поле paymentStatus
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'Subscriptions' AND column_name = 'paymentStatus'
    ) THEN
        ALTER TABLE "Subscriptions" ADD COLUMN "paymentStatus" "enum_Subscriptions_paymentStatus" DEFAULT 'pending';
    END IF;
END $$;

SELECT 'Поля для Finik успешно добавлены в таблицу Subscriptions!' AS status;

