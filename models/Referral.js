const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Referral = sequelize.define('Referral', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  referrerId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'Users',
      key: 'id'
    },
    comment: 'ID пользователя, который пригласил'
  },
  referredId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'Users',
      key: 'id'
    },
    comment: 'ID приглашённого пользователя'
  },
  referralCode: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: 'Уникальный реферальный код'
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    comment: 'Активна ли связь (не истекла ли)'
  },
  hasPurchased: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    comment: 'Купил ли приглашённый подписку'
  },
  expiresAt: {
    type: DataTypes.DATE,
    allowNull: false,
    comment: 'Дата истечения связи (7 дней с момента создания)'
  },
  bonusPaid: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    comment: 'Выплачены ли бонусы за эту связь'
  }
}, {
  timestamps: true
});

module.exports = Referral;

