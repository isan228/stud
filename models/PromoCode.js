const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const PromoCode = sequelize.define('PromoCode', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  code: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    comment: 'Уникальный промокод'
  },
  discountType: {
    type: DataTypes.ENUM('percentage', 'fixed'),
    allowNull: false,
    comment: 'Тип скидки: процентная или фиксированная сумма'
  },
  discountValue: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: 'Значение скидки (процент или сумма в сомах)'
  },
  minPurchaseAmount: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: 0,
    comment: 'Минимальная сумма покупки для применения промокода'
  },
  maxDiscountAmount: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'Максимальная сумма скидки (для процентных промокодов)'
  },
  usageLimit: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'Лимит использований (null = безлимит)'
  },
  usedCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: 'Количество использований'
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    comment: 'Активен ли промокод'
  },
  validFrom: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'Дата начала действия'
  },
  validUntil: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'Дата окончания действия'
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Описание промокода'
  }
}, {
  timestamps: true
});

module.exports = PromoCode;

