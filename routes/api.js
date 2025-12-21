const express = require('express');
const { Test, Question, Answer, UserAnswer, TestResult, FavoriteQuestion, DeferredQuestion } = require('../models');
const router = express.Router();

// Получение вопросов теста с фильтрами
router.post('/test/questions', async (req, res) => {
  try {
    const { testId, filters, count, shuffleAnswers } = req.body;

    let questions = await Question.findAll({
      where: { testId },
      include: [{
        model: Answer,
        order: shuffleAnswers ? [['id', 'ASC']] : [['order', 'ASC']]
      }],
      order: [['order', 'ASC']]
    });

    // Применение фильтров
    if (filters) {
      // Логика фильтрации (все, не сделанные, сделанные, неправильные, правильные, помеченные)
      // Здесь можно добавить логику фильтрации на основе истории пользователя
    }

    // Ограничение количества
    if (count && count < questions.length) {
      questions = questions.slice(0, count);
    }

    // Перемешивание вопросов
    if (req.body.shuffleQuestions) {
      questions = questions.sort(() => Math.random() - 0.5);
    }

    res.json({ questions });
  } catch (error) {
    console.error('Ошибка загрузки вопросов:', error);
    res.status(500).json({ error: 'Ошибка загрузки вопросов' });
  }
});

// Добавление вопроса в избранное
router.post('/favorite/add', async (req, res) => {
  try {
    const { questionId } = req.body;
    const userId = req.session.userId;

    if (!userId) {
      return res.status(401).json({ error: 'Необходима авторизация' });
    }

    if (!questionId) {
      return res.status(400).json({ error: 'ID вопроса обязателен' });
    }

    // Проверяем, существует ли вопрос
    const question = await Question.findByPk(questionId);
    if (!question) {
      return res.status(404).json({ error: 'Вопрос не найден' });
    }

    // Проверяем, не добавлен ли уже в избранное
    const existing = await FavoriteQuestion.findOne({
      where: { userId, questionId }
    });

    if (existing) {
      return res.json({ success: true, message: 'Вопрос уже в избранном', isFavorite: true });
    }

    // Получаем testId из вопроса
    const testId = question.testId;

    // Добавляем в избранное
    await FavoriteQuestion.create({ userId, questionId, testId });

    res.json({ success: true, message: 'Вопрос добавлен в избранное', isFavorite: true });
  } catch (error) {
    console.error('Ошибка добавления в избранное:', error);
    res.status(500).json({ error: 'Ошибка добавления в избранное' });
  }
});

// Удаление вопроса из избранного
router.post('/favorite/remove', async (req, res) => {
  try {
    const { questionId } = req.body;
    const userId = req.session.userId;

    if (!userId) {
      return res.status(401).json({ error: 'Необходима авторизация' });
    }

    if (!questionId) {
      return res.status(400).json({ error: 'ID вопроса обязателен' });
    }

    await FavoriteQuestion.destroy({
      where: { userId, questionId }
    });

    res.json({ success: true, message: 'Вопрос удален из избранного', isFavorite: false });
  } catch (error) {
    console.error('Ошибка удаления из избранного:', error);
    res.status(500).json({ error: 'Ошибка удаления из избранного' });
  }
});

// Проверка, в избранном ли вопрос
router.get('/favorite/check/:questionId', async (req, res) => {
  try {
    const { questionId } = req.params;
    const userId = req.session.userId;

    if (!userId) {
      return res.json({ isFavorite: false });
    }

    const favorite = await FavoriteQuestion.findOne({
      where: { userId, questionId }
    });

    res.json({ isFavorite: !!favorite });
  } catch (error) {
    console.error('Ошибка проверки избранного:', error);
    res.json({ isFavorite: false });
  }
});

// Получение всех избранных вопросов пользователя
router.get('/favorite/all', async (req, res) => {
  try {
    const userId = req.session.userId;

    if (!userId) {
      return res.status(401).json({ error: 'Необходима авторизация' });
    }

    const favorites = await FavoriteQuestion.findAll({
      where: { userId },
      include: [{
        model: Question,
        include: [{
          model: Answer
        }, {
          model: Test,
          attributes: ['id', 'title', 'subject']
        }]
      }],
      order: [['createdAt', 'DESC']]
    });

    res.json({ favorites });
  } catch (error) {
    console.error('Ошибка загрузки избранного:', error);
    res.status(500).json({ error: 'Ошибка загрузки избранного' });
  }
});

// Добавление вопроса в отложенные (хранится в сессии)
router.post('/deferred/add', async (req, res) => {
  try {
    const { questionId } = req.body;
    const userId = req.session.userId;

    if (!userId) {
      return res.status(401).json({ error: 'Необходима авторизация' });
    }

    if (!questionId) {
      return res.status(400).json({ error: 'ID вопроса обязателен' });
    }

    // Инициализируем массив отложенных вопросов в сессии
    if (!req.session.deferredQuestions) {
      req.session.deferredQuestions = [];
    }

    // Добавляем вопрос, если его еще нет
    if (!req.session.deferredQuestions.includes(parseInt(questionId))) {
      req.session.deferredQuestions.push(parseInt(questionId));
    }

    res.json({ 
      success: true, 
      message: 'Вопрос отложен', 
      deferredCount: req.session.deferredQuestions.length 
    });
  } catch (error) {
    console.error('Ошибка отложения вопроса:', error);
    res.status(500).json({ error: 'Ошибка отложения вопроса' });
  }
});

// Удаление вопроса из отложенных
router.post('/deferred/remove', async (req, res) => {
  try {
    const { questionId } = req.body;
    const userId = req.session.userId;

    if (!userId) {
      return res.status(401).json({ error: 'Необходима авторизация' });
    }

    if (!req.session.deferredQuestions) {
      req.session.deferredQuestions = [];
    }

    req.session.deferredQuestions = req.session.deferredQuestions.filter(
      id => id !== parseInt(questionId)
    );

    res.json({ 
      success: true, 
      message: 'Вопрос удален из отложенных',
      deferredCount: req.session.deferredQuestions.length 
    });
  } catch (error) {
    console.error('Ошибка удаления из отложенных:', error);
    res.status(500).json({ error: 'Ошибка удаления из отложенных' });
  }
});

// Получение всех отложенных вопросов
router.get('/deferred/all', async (req, res) => {
  try {
    const userId = req.session.userId;

    if (!userId) {
      return res.status(401).json({ error: 'Необходима авторизация' });
    }

    const deferredIds = req.session.deferredQuestions || [];

    if (deferredIds.length === 0) {
      return res.json({ questions: [] });
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

    // Сортируем вопросы в порядке их добавления в сессию
    const sortedQuestions = deferredIds.map(id => 
      questions.find(q => q.id === id)
    ).filter(q => q !== undefined);

    res.json({ questions: sortedQuestions });
  } catch (error) {
    console.error('Ошибка загрузки отложенных:', error);
    res.status(500).json({ error: 'Ошибка загрузки отложенных вопросов' });
  }
});

module.exports = router;



