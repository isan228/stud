const { sequelize, User, Test, TestResult, Question, Answer, Subscription, Notification, UserAnswer, Subject, Referral, BonusTransaction, PromoCode, FavoriteQuestion, DeferredQuestion } = require('./models');

async function syncDatabase() {
  try {
    await sequelize.authenticate();
    console.log('Подключение к базе данных установлено.');

    // Создание ENUM типов для PostgreSQL, если их еще нет
    try {
      await sequelize.query(`
        DO $$ BEGIN
          CREATE TYPE "public"."enum_BonusTransactions_type" AS ENUM('referral_bonus', 'referral_received', 'subscription_payment', 'expiration');
        EXCEPTION WHEN duplicate_object THEN null;
        END $$;
      `);
      console.log('ENUM типы проверены/созданы.');
    } catch (error) {
      console.log('ENUM типы уже существуют или ошибка:', error.message);
    }

    // Добавляем поля для Finik в таблицу Subscriptions, если их нет
    try {
      console.log('Проверяем поля Finik в таблице Subscriptions...');
      
      // Проверяем и добавляем paymentId
      const paymentIdCheck = await sequelize.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'Subscriptions' AND column_name = 'paymentId';
      `);
      
      if (paymentIdCheck[0].length === 0) {
        await sequelize.query(`ALTER TABLE "Subscriptions" ADD COLUMN "paymentId" VARCHAR(255);`);
        console.log('Добавлено поле paymentId');
      }
      
      // Проверяем и добавляем transactionId
      const transactionIdCheck = await sequelize.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'Subscriptions' AND column_name = 'transactionId';
      `);
      
      if (transactionIdCheck[0].length === 0) {
        await sequelize.query(`ALTER TABLE "Subscriptions" ADD COLUMN "transactionId" VARCHAR(255);`);
        console.log('Добавлено поле transactionId');
      }
      
      // Создаем ENUM тип для paymentStatus, если его нет
      await sequelize.query(`
        DO $$ 
        BEGIN
          IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_Subscriptions_paymentStatus') THEN
            CREATE TYPE "enum_Subscriptions_paymentStatus" AS ENUM('pending', 'succeeded', 'failed');
          END IF;
        END $$;
      `);
      
      // Проверяем и добавляем paymentStatus
      const paymentStatusCheck = await sequelize.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'Subscriptions' AND column_name = 'paymentStatus';
      `);
      
      if (paymentStatusCheck[0].length === 0) {
        await sequelize.query(`ALTER TABLE "Subscriptions" ADD COLUMN "paymentStatus" "enum_Subscriptions_paymentStatus" DEFAULT 'pending';`);
        console.log('Добавлено поле paymentStatus');
      }
      
      console.log('Поля Finik проверены/добавлены в таблицу Subscriptions.');
    } catch (error) {
      console.log('Ошибка при добавлении полей Finik:', error.message);
    }

    // Полностью пересоздаем таблицу BonusTransactions, чтобы избежать проблем с ENUM и NOT NULL
    try {
      console.log('Пересоздаем таблицу BonusTransactions...');
      
      // Удаляем таблицу BonusTransactions, если она есть
      await sequelize.query(`
        DROP TABLE IF EXISTS "BonusTransactions" CASCADE;
      `);

      console.log('Таблица BonusTransactions будет создана заново при синхронизации.');
    } catch (error) {
      console.log('Ошибка при пересоздании BonusTransactions:', error.message);
      // Продолжаем выполнение, даже если возникла ошибка
    }

    // Удаляем уникальное ограничение с referralCode в таблице Referrals
    try {
      await sequelize.query(`
        ALTER TABLE "Referrals" DROP CONSTRAINT IF EXISTS "Referrals_referralCode_key";
      `);
      await sequelize.query(`
        DROP INDEX IF EXISTS "referrals_referralCode_unique";
      `);
      console.log('Уникальное ограничение с referralCode удалено из таблицы Referrals.');
    } catch (error) {
      console.log('Ошибка при удалении уникального ограничения referralCode:', error.message);
    }

    // Полностью пересоздаем таблицу PromoCodes, чтобы избежать проблем с ALTER COLUMN / USING для ENUM
    try {
      console.log('Пересоздаем таблицу PromoCodes...');
      
      // Удаляем таблицу PromoCodes, если она есть
      await sequelize.query(`
        DROP TABLE IF EXISTS "PromoCodes" CASCADE;
      `);

      // Удаляем ENUM-тип для discountType, если он существует
      await sequelize.query(`
        DO $$ BEGIN
          DROP TYPE IF EXISTS "public"."enum_PromoCodes_discountType";
        EXCEPTION WHEN undefined_object THEN null;
        END $$;
      `);

      console.log('Таблица PromoCodes и enum_PromoCodes_discountType будут созданы заново при синхронизации.');
    } catch (error) {
      console.log('Ошибка при пересоздании PromoCodes:', error.message);
      // Продолжаем выполнение, даже если возникла ошибка
    }

    // Синхронизация моделей с базой данных
    await sequelize.sync({ alter: true });
    console.log('База данных синхронизирована.');

    // Создание администратора по умолчанию
    const adminExists = await User.findOne({ where: { isAdmin: true } });
    if (!adminExists) {
      await User.create({
        nickname: 'admin',
        email: 'admin@stud.ru',
        password: 'admin123',
        isAdmin: true
      });
      console.log('Администратор создан (nickname: admin, password: admin123)');
    }

    process.exit(0);
  } catch (error) {
    console.error('Ошибка синхронизации базы данных:', error);
    process.exit(1);
  }
}

syncDatabase();

