const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const DeferredQuestion = sequelize.define('DeferredQuestion', {
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
    comment: 'ID пользователя, который отложил вопрос'
  },
  questionId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'Questions',
      key: 'id'
    },
    comment: 'ID отложенного вопроса'
  },
  testId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'Tests',
      key: 'id'
    },
    comment: 'ID теста, к которому относится вопрос'
  },
  testResultId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'TestResults',
      key: 'id'
    },
    comment: 'ID результата теста, во время которого вопрос был отложен'
  }
}, {
  timestamps: true,
  indexes: [
    {
      unique: true,
      fields: ['userId', 'questionId', 'testResultId'],
      name: 'deferred_question_unique'
    }
  ]
});

module.exports = DeferredQuestion;


