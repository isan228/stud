const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const UserAnswer = sequelize.define('UserAnswer', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  testResultId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'TestResults',
      key: 'id'
    }
  },
  questionId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'Questions',
      key: 'id'
    }
  },
  answerId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'Answers',
      key: 'id'
    }
  },
  isCorrect: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  userTextAnswer: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  isMarked: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  }
}, {
  timestamps: true
});

module.exports = UserAnswer;






