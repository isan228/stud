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

