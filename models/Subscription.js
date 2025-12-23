const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Subscription = sequelize.define('Subscription', {
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
  type: {
    type: DataTypes.ENUM('individual', 'group'),
    allowNull: false
  },
  duration: {
    type: DataTypes.INTEGER,
    comment: 'Длительность в месяцах'
  },
  startDate: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  endDate: {
    type: DataTypes.DATE,
    allowNull: false
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  paymentId: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'ID платежа в Finik'
  },
  transactionId: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'ID транзакции в Finik'
  },
  paymentStatus: {
    type: DataTypes.ENUM('pending', 'succeeded', 'failed'),
    defaultValue: 'pending',
    comment: 'Статус оплаты'
  }
}, {
  timestamps: true
});

module.exports = Subscription;






