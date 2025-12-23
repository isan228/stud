const express = require('express');
const { body, validationResult } = require('express-validator');
const { Subject, Test, Question, Answer } = require('../models');
const { requireAdmin } = require('../middleware/auth');
const router = express.Router();

// Все роуты требуют прав администратора
router.use(requireAdmin);

// Форма добавления вопроса напрямую к предмету (создает тест автоматически)
router.get('/subjects/:subjectId/questions/direct', async (req, res) => {
  try {
    const subject = await Subject.findByPk(req.params.subjectId);
    if (!subject) {
      return res.redirect('/admin/subjects?error=Предмет не найден');
    }

    // Ищем или создаем тест по умолчанию для предмета
    let defaultTest = await Test.findOne({
      where: {
        subjectId: subject.id,
        title: `Тест по ${subject.name}`
      }
    });

    if (!defaultTest) {
      defaultTest = await Test.create({
        title: `Тест по ${subject.name}`,
        university: 'Общий',
        type: 'Тест',
        subject: subject.name,
        subjectId: subject.id,
        createdBy: req.session.userId,
        totalQuestions: 0
      });
    }

    res.render('admin/question-form', { 
      test: { 
        ...defaultTest.toJSON(), 
        Subject: subject 
      }, 
      question: null, 
      errors: [], 
      query: req.query 
    });
  } catch (error) {
    console.error('Ошибка:', error);
    res.redirect('/admin/subjects');
  }
});

module.exports = router;






