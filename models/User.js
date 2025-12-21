const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const bcrypt = require('bcryptjs');

const User = sequelize.define('User', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  nickname: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: {
      isEmail: true
    }
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false
  },
  isAdmin: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  isModerator: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  isSubscribed: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  subscriptionEndDate: {
    type: DataTypes.DATE,
    allowNull: true
  },
  referralCode: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Уникальный реферальный код пользователя'
  },
  bonusBalance: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: 'Баланс бонусов в сомах'
  },
  createdAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  hooks: {
    beforeCreate: async (user) => {
      if (user.password) {
        user.password = await bcrypt.hash(user.password, 10);
      }
    },
    beforeUpdate: async (user) => {
      if (user.changed('password')) {
        user.password = await bcrypt.hash(user.password, 10);
      }
    }
  },
  indexes: [
    {
      unique: true,
      fields: ['referralCode'],
      name: 'users_referralCode_unique',
      where: {
        referralCode: {
          [require('sequelize').Op.ne]: null
        }
      }
    }
  ]
});

User.prototype.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

module.exports = User;

