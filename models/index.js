const sequelize = require('../config/database');
const User = require('./User');
const Test = require('./Test');
const TestResult = require('./TestResult');
const Question = require('./Question');
const Answer = require('./Answer');
const Subscription = require('./Subscription');
const Notification = require('./Notification');
const UserAnswer = require('./UserAnswer');
const Subject = require('./Subject');
const Referral = require('./Referral');
const BonusTransaction = require('./BonusTransaction');
const PromoCode = require('./PromoCode');
const FavoriteQuestion = require('./FavoriteQuestion');
const DeferredQuestion = require('./DeferredQuestion');

// Определение связей
User.hasMany(TestResult, { foreignKey: 'userId' });
TestResult.belongsTo(User, { foreignKey: 'userId' });

User.hasMany(Test, { foreignKey: 'createdBy' });
Test.belongsTo(User, { foreignKey: 'createdBy', as: 'creator' });

Test.hasMany(TestResult, { foreignKey: 'testId' });
TestResult.belongsTo(Test, { foreignKey: 'testId' });

Test.hasMany(Question, { foreignKey: 'testId' });
Question.belongsTo(Test, { foreignKey: 'testId' });

Question.hasMany(Answer, { foreignKey: 'questionId' });
Answer.belongsTo(Question, { foreignKey: 'questionId' });

User.hasMany(Subscription, { foreignKey: 'userId' });
Subscription.belongsTo(User, { foreignKey: 'userId' });

User.hasMany(Notification, { foreignKey: 'userId' });
Notification.belongsTo(User, { foreignKey: 'userId' });

TestResult.hasMany(UserAnswer, { foreignKey: 'testResultId' });
UserAnswer.belongsTo(TestResult, { foreignKey: 'testResultId' });

UserAnswer.belongsTo(Question, { foreignKey: 'questionId' });
UserAnswer.belongsTo(Answer, { foreignKey: 'answerId' });

Subject.hasMany(Test, { foreignKey: 'subjectId' });
Test.belongsTo(Subject, { foreignKey: 'subjectId' });

// Реферальные связи
User.hasMany(Referral, { foreignKey: 'referrerId', as: 'referrals' });
Referral.belongsTo(User, { foreignKey: 'referrerId', as: 'referrer' });

User.hasMany(Referral, { foreignKey: 'referredId', as: 'referredBy' });
Referral.belongsTo(User, { foreignKey: 'referredId', as: 'referred' });

// Бонусные транзакции
User.hasMany(BonusTransaction, { foreignKey: 'userId' });
BonusTransaction.belongsTo(User, { foreignKey: 'userId' });

BonusTransaction.belongsTo(Referral, { foreignKey: 'referralId' });
BonusTransaction.belongsTo(Subscription, { foreignKey: 'subscriptionId' });

// Избранные вопросы
User.hasMany(FavoriteQuestion, { foreignKey: 'userId' });
FavoriteQuestion.belongsTo(User, { foreignKey: 'userId' });
FavoriteQuestion.belongsTo(Question, { foreignKey: 'questionId' });
FavoriteQuestion.belongsTo(Test, { foreignKey: 'testId' });
Question.hasMany(FavoriteQuestion, { foreignKey: 'questionId' });

// Отложенные вопросы
User.hasMany(DeferredQuestion, { foreignKey: 'userId' });
DeferredQuestion.belongsTo(User, { foreignKey: 'userId' });
DeferredQuestion.belongsTo(Question, { foreignKey: 'questionId' });
DeferredQuestion.belongsTo(Test, { foreignKey: 'testId' });
DeferredQuestion.belongsTo(TestResult, { foreignKey: 'testResultId' });
Question.hasMany(DeferredQuestion, { foreignKey: 'questionId' });

module.exports = {
  sequelize,
  User,
  Test,
  TestResult,
  Question,
  Answer,
  Subscription,
  Notification,
  UserAnswer,
  Subject,
  Referral,
  BonusTransaction,
  PromoCode,
  FavoriteQuestion,
  DeferredQuestion
};

