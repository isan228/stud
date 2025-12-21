const express = require('express');
const { Test, TestResult, Question, Answer, UserAnswer, User, Notification, FavoriteQuestion } = require('../models');
const router = express.Router();

// Страница статистики
router.get('/statistics', async (req, res) => {
  try {
    const results = await TestResult.findAll({
      where: { userId: req.session.userId },
      include: [{
        model: Test,
        attributes: ['title', 'type', 'subject']
      }],
      order: [['completedAt', 'DESC']]
    });

    res.render('statistics', { results });
  } catch (error) {
    console.error('Ошибка загрузки статистики:', error);
    res.render('statistics', { results: [], error: 'Ошибка загрузки статистики' });
  }
});

// Просмотр результата теста
router.get('/statistics/:id', async (req, res) => {
  try {
    const result = await TestResult.findOne({
      where: {
        id: req.params.id,
        userId: req.session.userId
      },
      include: [{
        model: Test,
        include: [{
          model: User,
          as: 'creator',
          attributes: ['nickname']
        }]
      }]
    });

    if (!result) {
      return res.status(404).send('Результат не найден');
    }

    const userAnswers = await UserAnswer.findAll({
      where: { testResultId: result.id },
      include: [Question, Answer]
    });

    res.render('test-result', { result, userAnswers });
  } catch (error) {
    console.error('Ошибка загрузки результата:', error);
    res.status(500).send('Ошибка загрузки результата');
  }
});

// Страница эмулятора
router.get('/emulator', async (req, res) => {
  try {
    const tests = await Test.findAll({
      include: [{
        model: User,
        as: 'creator',
        attributes: ['nickname']
      }],
      order: [['createdAt', 'DESC']]
    });

    res.render('emulator', { tests });
  } catch (error) {
    console.error('Ошибка загрузки эмулятора:', error);
    res.render('emulator', { tests: [], error: 'Ошибка загрузки тестов' });
  }
});

// Получение теста для прохождения
router.get('/emulator/:testId', async (req, res) => {
  try {
    const test = await Test.findByPk(req.params.testId, {
      include: [{
        model: Question,
        include: [Answer]
      }, {
        model: User,
        as: 'creator',
        attributes: ['nickname']
      }]
    });

    if (!test) {
      return res.status(404).send('Тест не найден');
    }
    
    // Сортировка вопросов и ответов вручную
    if (test.Questions) {
      test.Questions.sort((a, b) => (a.order || 0) - (b.order || 0));
      test.Questions.forEach(question => {
        if (question.Answers) {
          question.Answers.sort((a, b) => (a.order || 0) - (b.order || 0));
        }
      });
    }

    res.render('test-taking', { test });
  } catch (error) {
    console.error('Ошибка загрузки теста:', error);
    res.status(500).send('Ошибка загрузки теста');
  }
});

// Сохранение результата теста
router.post('/emulator/:testId/submit', async (req, res) => {
  try {
    const { answers, timeSpent, settings } = req.body;
    const test = await Test.findByPk(req.params.testId, {
      include: [Question]
    });

    if (!test) {
      return res.status(404).json({ error: 'Тест не найден' });
    }

    let correctCount = 0;
    const userAnswersData = [];

    for (const [questionId, answerData] of Object.entries(answers)) {
      const question = test.Questions.find(q => q.id == questionId);
      if (!question) continue;

      let isCorrect = false;
      let answerIdValue = null;
      
      if (question.type === 'single') {
        // Для одного ответа - проверяем, что выбранный ответ правильный
        const userAnswerId = parseInt(answerData);
        answerIdValue = userAnswerId;
        
        const selectedAnswer = await Answer.findByPk(userAnswerId);
        if (selectedAnswer && selectedAnswer.questionId === question.id) {
          isCorrect = selectedAnswer.isCorrect === true;
        }
      } else if (question.type === 'multiple') {
        // Для множественного выбора
        const correctAnswers = await Answer.findAll({
          where: {
            questionId: question.id,
            isCorrect: true
          }
        });
        const userAnswerIds = Array.isArray(answerData) ? answerData.map(id => parseInt(id)) : [parseInt(answerData)];
        
        // Проверяем, что выбраны все правильные и только правильные
        const correctIds = correctAnswers.map(ca => ca.id);
        isCorrect = userAnswerIds.length === correctIds.length &&
          userAnswerIds.every(id => correctIds.includes(id)) &&
          correctIds.every(id => userAnswerIds.includes(id));
        
        answerIdValue = userAnswerIds[0] || null;
      } else if (question.type === 'text') {
        // Для текстовых ответов проверка не выполняется автоматически
        isCorrect = false;
      }

      if (isCorrect) correctCount++;

      userAnswersData.push({
        questionId: parseInt(questionId),
        answerId: answerIdValue,
        isCorrect,
        userTextAnswer: question.type === 'text' ? answerData : null
      });
    }

    const testResult = await TestResult.create({
      userId: req.session.userId,
      testId: test.id,
      score: correctCount,
      totalQuestions: Object.keys(answers).length,
      timeSpent: timeSpent || 0
    });

    for (const answerData of userAnswersData) {
      await UserAnswer.create({
        testResultId: testResult.id,
        questionId: answerData.questionId,
        answerId: answerData.answerId,
        isCorrect: answerData.isCorrect,
        userTextAnswer: answerData.userTextAnswer
      });
    }

    res.json({ success: true, resultId: testResult.id, score: correctCount, total: Object.keys(answers).length });
  } catch (error) {
    console.error('Ошибка сохранения результата:', error);
    res.status(500).json({ error: 'Ошибка сохранения результата' });
  }
});

// Сообщение об ошибке в тесте
router.post('/emulator/report-error', async (req, res) => {
  try {
    const { testId, questionId, message } = req.body;

    const test = await Test.findByPk(testId);
    if (!test) {
      return res.status(404).json({ error: 'Тест не найден' });
    }

    // Уведомление создателю теста
    await Notification.create({
      userId: test.createdBy,
      testId: test.id,
      questionId: questionId || null,
      message: `Сообщение об ошибке: ${message}`,
      type: 'error_report'
    });

    // Уведомление администратору
    const admin = await User.findOne({ where: { isAdmin: true } });
    if (admin) {
      await Notification.create({
        userId: admin.id,
        testId: test.id,
        questionId: questionId || null,
        message: `Сообщение об ошибке от пользователя: ${message}`,
        type: 'error_report'
      });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Ошибка отправки сообщения:', error);
    res.status(500).json({ error: 'Ошибка отправки сообщения' });
  }
});

// Страница избранных вопросов
router.get('/favorites', async (req, res) => {
  try {
    const favorites = await FavoriteQuestion.findAll({
      where: { userId: req.session.userId },
      include: [{
        model: Question,
        include: [{
          model: Answer,
          order: [['order', 'ASC']]
        }, {
          model: Test,
          attributes: ['id', 'title', 'subject', 'university', 'type']
        }]
      }],
      order: [['createdAt', 'DESC']]
    });

    // Группируем по тестам для удобства
    const favoritesByTest = {};
    favorites.forEach(fav => {
      const testId = fav.Question ? fav.Question.testId : null;
      if (testId) {
        if (!favoritesByTest[testId]) {
          favoritesByTest[testId] = {
            test: fav.Question.Test,
            questions: []
          };
        }
        favoritesByTest[testId].questions.push(fav.Question);
      }
    });

    res.render('favorites', { favorites, favoritesByTest });
  } catch (error) {
    console.error('Ошибка загрузки избранных вопросов:', error);
    res.render('error', { error: 'Ошибка загрузки избранных вопросов' });
  }
});

// Создание теста из избранных вопросов
router.get('/favorites/test', async (req, res) => {
  try {
    const favorites = await FavoriteQuestion.findAll({
      where: { userId: req.session.userId },
      include: [{
        model: Question,
        include: [{
          model: Answer,
          order: [['order', 'ASC']]
        }, {
          model: Test,
          attributes: ['id', 'title', 'subject', 'university', 'type']
        }]
      }],
      order: [['createdAt', 'DESC']]
    });

    if (favorites.length === 0) {
      return res.redirect('/tests/favorites?error=Нет избранных вопросов для создания теста');
    }

    // Создаем виртуальный тест из избранных вопросов
    const questions = favorites.map(fav => fav.Question).filter(q => q !== null);
    
    // Группируем вопросы по тестам
    const testMap = new Map();
    questions.forEach(q => {
      const testId = q.testId;
      if (!testMap.has(testId)) {
        testMap.set(testId, {
          test: q.Test,
          questions: []
        });
      }
      testMap.get(testId).questions.push(q);
    });

    res.render('favorites-test', { 
      questions,
      testGroups: Array.from(testMap.values())
    });
  } catch (error) {
    console.error('Ошибка создания теста из избранных:', error);
    res.render('error', { error: 'Ошибка создания теста из избранных вопросов' });
  }
});

// Страница отложенных вопросов
router.get('/deferred', async (req, res) => {
  try {
    const deferredIds = req.session.deferredQuestions || [];
    
    if (deferredIds.length === 0) {
      return res.render('deferred', { questions: [] });
    }

    const questions = await Question.findAll({
      where: { id: deferredIds },
      include: [{
        model: Answer,
        order: [['order', 'ASC']]
      }, {
        model: Test,
        attributes: ['id', 'title', 'subject', 'university', 'type']
      }],
      order: [['id', 'ASC']]
    });

    res.render('deferred', { questions });
  } catch (error) {
    console.error('Ошибка загрузки отложенных вопросов:', error);
    res.render('error', { error: 'Ошибка загрузки отложенных вопросов' });
  }
});

module.exports = router;

