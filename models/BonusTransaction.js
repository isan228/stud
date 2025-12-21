const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const BonusTransaction = sequelize.define('BonusTransaction', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'Users',
      key: 'id'
    }
  },
  amount: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: 'Сумма транзакции (положительная для начисления, отрицательная для списания)'
  },
  type: {
    type: DataTypes.ENUM('referral_bonus', 'referral_received', 'subscription_payment', 'expiration'),
    allowNull: false,
    comment: 'Тип транзакции'
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Описание транзакции'
  },
  referralId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'Referrals',
      key: 'id'
    },
    comment: 'ID реферальной связи (если транзакция связана с рефералкой)'
  },
  subscriptionId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'Subscriptions',
      key: 'id'
    },
    comment: 'ID подписки (если транзакция связана с подпиской)'
  },
  expiresAt: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'Дата истечения бонуса (6 месяцев с момента получения)'
  },
  isExpired: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    comment: 'Истёк ли бонус'
  }
}, {
  timestamps: true
});

module.exports = BonusTransaction;



