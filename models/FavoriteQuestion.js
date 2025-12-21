const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const FavoriteQuestion = sequelize.define('FavoriteQuestion', {
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
    },
    comment: 'ID пользователя, который добавил вопрос в избранное'
  },
  questionId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'Questions',
      key: 'id'
    },
    comment: 'ID вопроса'
  },
  testId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'Tests',
      key: 'id'
    },
    comment: 'ID теста, к которому относится вопрос'
  }
}, {
  timestamps: true,
  indexes: [
    {
      unique: true,
      fields: ['userId', 'questionId'],
      name: 'favorite_question_unique'
    }
  ]
});

module.exports = FavoriteQuestion;
