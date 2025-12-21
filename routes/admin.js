const express = require('express');
const { body, validationResult } = require('express-validator');
const { User, Test, Question, Answer, Subject } = require('../models');
const { requireAdmin } = require('../middleware/auth');
const router = express.Router();

// Все роуты требуют прав администратора
router.use(requireAdmin);

// Главная страница админки
router.get('/', async (req, res) => {
  try {
    const stats = {
      users: await User.count(),
      tests: await Test.count(),
      questions: await Question.count(),
      subjects: await Subject.count(),
      admins: await User.count({ where: { isAdmin: true } }),
      moderators: await User.count({ where: { isModerator: true } })
    };

    res.render('admin/dashboard', { stats });
  } catch (error) {
    console.error('Ошибка загрузки дашборда:', error);
    res.render('error', { error: 'Ошибка загрузки панели администратора' });
  }
});

// ========== УПРАВЛЕНИЕ ПРЕДМЕТАМИ ==========

// Список предметов
router.get('/subjects', async (req, res) => {
  try {
    const subjects = await Subject.findAll({
      order: [['name', 'ASC']],
      include: [{
        model: Test,
        attributes: ['id']
      }]
    });

    res.render('admin/subjects', { subjects, query: req.query });
  } catch (error) {
    console.error('Ошибка загрузки предметов:', error);
    res.render('error', { error: 'Ошибка загрузки предметов' });
  }
});

// Форма добавления предмета
router.get('/subjects/new', (req, res) => {
  res.render('admin/subject-form', { subject: null, errors: [] });
});

// Создание предмета
router.post('/subjects', [
  body('name').trim().notEmpty().withMessage('Название предмета обязательно'),
  body('description').optional()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.render('admin/subject-form', { 
      subject: null, 
      errors: errors.array() 
    });
  }

  try {
    const { name, description } = req.body;
    
    const subject = await Subject.create({
      name: name.trim(),
      description: description || null,
      isActive: true
    });

    // Редирект на страницу добавления вопросов к предмету
    res.redirect(`/admin/subjects/${subject.id}/questions?success=Предмет успешно добавлен`);
  } catch (error) {
    console.error('Ошибка создания предмета:', error);
    res.render('admin/subject-form', {
      subject: null,
      errors: [{ msg: 'Ошибка при создании предмета. Возможно, предмет с таким названием уже существует.' }]
    });
  }
});

// Удаление предмета
router.post('/subjects/:id/delete', async (req, res) => {
  try {
    const subject = await Subject.findByPk(req.params.id);
    if (subject) {
      await subject.destroy();
      res.redirect('/admin/subjects?success=Предмет удален');
    } else {
      res.redirect('/admin/subjects?error=Предмет не найден');
    }
  } catch (error) {
    console.error('Ошибка удаления предмета:', error);
    res.redirect('/admin/subjects?error=Ошибка при удалении предмета');
  }
});

// ========== УПРАВЛЕНИЕ ВОПРОСАМИ ==========

// Список вопросов по предмету
router.get('/subjects/:subjectId/questions', async (req, res) => {
  try {
    const subject = await Subject.findByPk(req.params.subjectId);
    if (!subject) {
      return res.redirect('/admin/subjects?error=Предмет не найден');
    }

    const tests = await Test.findAll({
      where: { subjectId: subject.id },
      include: [{
        model: Question,
        include: [Answer]
      }, {
        model: User,
        as: 'creator',
        attributes: ['nickname']
      }],
      order: [['createdAt', 'DESC']]
    });

    res.render('admin/questions', { subject, tests, query: req.query });
  } catch (error) {
    console.error('Ошибка загрузки вопросов:', error);
    res.render('error', { error: 'Ошибка загрузки вопросов' });
  }
});

// Форма добавления теста с вопросами
router.get('/subjects/:subjectId/tests/new', async (req, res) => {
  try {
    const subject = await Subject.findByPk(req.params.subjectId);
    if (!subject) {
      return res.redirect('/admin/subjects?error=Предмет не найден');
    }

    res.render('admin/test-form', { subject, test: null, errors: [] });
  } catch (error) {
    console.error('Ошибка:', error);
    res.redirect('/admin/subjects');
  }
});

// Создание теста
router.post('/subjects/:subjectId/tests', [
  body('title').trim().notEmpty().withMessage('Название теста обязательно'),
  body('university').trim().notEmpty().withMessage('Университет обязателен'),
  body('type').isIn(['Экзамен', 'Зачет', 'Тест']).withMessage('Неверный тип теста')
], async (req, res) => {
  const errors = validationResult(req);
  const subject = await Subject.findByPk(req.params.subjectId);
  
  if (!errors.isEmpty()) {
    return res.render('admin/test-form', { 
      subject, 
      test: null, 
      errors: errors.array() 
    });
  }

  try {
    const { title, university, type } = req.body;
    
    const test = await Test.create({
      title: title.trim(),
      university: university.trim(),
      type,
      subject: subject.name,
      subjectId: subject.id,
      createdBy: req.session.userId,
      totalQuestions: 0
    });

    res.redirect(`/admin/tests/${test.id}/questions/new`);
  } catch (error) {
    console.error('Ошибка создания теста:', error);
    res.render('admin/test-form', {
      subject,
      test: null,
      errors: [{ msg: 'Ошибка при создании теста' }]
    });
  }
});

// Форма добавления вопроса
router.get('/tests/:testId/questions/new', async (req, res) => {
  try {
    const test = await Test.findByPk(req.params.testId, {
      include: [Subject]
    });
    
    if (!test) {
      return res.redirect('/admin/subjects?error=Тест не найден');
    }

    res.render('admin/question-form', { test, question: null, errors: [], query: req.query });
  } catch (error) {
    console.error('Ошибка:', error);
    res.redirect('/admin/subjects');
  }
});

// Создание вопроса с ответами
router.post('/tests/:testId/questions', [
  body('text').trim().notEmpty().withMessage('Текст вопроса обязателен'),
  body('type').isIn(['single', 'multiple', 'matching', 'image', 'order', 'term', 'text']).withMessage('Неверный тип вопроса')
], async (req, res) => {
  const errors = validationResult(req);
  const test = await Test.findByPk(req.params.testId, {
    include: [Subject]
  });

  if (!errors.isEmpty()) {
    return res.render('admin/question-form', {
      test,
      question: null,
      errors: errors.array()
    });
  }

  try {
    const { text, type, imageUrl, answers } = req.body;

    // Создание вопроса
    const question = await Question.create({
      testId: test.id,
      text: text.trim(),
      type,
      imageUrl: imageUrl || null,
      order: 0
    });

    // Создание ответов
    if (answers) {
      const answersArray = Array.isArray(answers) ? answers : [answers];
      for (let i = 0; i < answersArray.length; i++) {
        const answerData = answersArray[i];
        if (answerData && (answerData.text || typeof answerData === 'string')) {
          await Answer.create({
            questionId: question.id,
            text: answerData.text || answerData,
            isCorrect: answerData.isCorrect === 'true' || answerData.isCorrect === true || answerData.isCorrect === 'on',
            order: i
          });
        }
      }
    }

    // Обновление количества вопросов в тесте
    const questionCount = await Question.count({ where: { testId: test.id } });
    test.totalQuestions = questionCount;
    await test.save();

    if (req.query.addAnother) {
      res.redirect(`/admin/tests/${test.id}/questions/new?success=Вопрос добавлен`);
    } else {
      res.redirect(`/admin/subjects/${test.Subject.id}/questions?success=Вопрос добавлен`);
    }
  } catch (error) {
    console.error('Ошибка создания вопроса:', error);
    res.render('admin/question-form', {
      test,
      question: null,
      errors: [{ msg: 'Ошибка при создании вопроса' }]
    });
  }
});

// ========== РЕДАКТИРОВАНИЕ И УДАЛЕНИЕ ВОПРОСОВ ==========

// Форма редактирования вопроса
router.get('/questions/:questionId/edit', async (req, res) => {
  try {
    const question = await Question.findByPk(req.params.questionId, {
      include: [{
        model: Answer,
        order: [['order', 'ASC']]
      }, {
        model: Test,
        include: [Subject]
      }]
    });

    if (!question) {
      return res.redirect('/admin/subjects?error=Вопрос не найден');
    }

    res.render('admin/question-form', { 
      test: question.Test, 
      question: question, 
      errors: [], 
      query: req.query 
    });
  } catch (error) {
    console.error('Ошибка загрузки вопроса:', error);
    res.redirect('/admin/subjects?error=Ошибка загрузки вопроса');
  }
});

// Обновление вопроса
router.post('/questions/:questionId/edit', [
  body('text').trim().notEmpty().withMessage('Текст вопроса обязателен'),
  body('type').isIn(['single', 'multiple', 'matching', 'image', 'order', 'term', 'text']).withMessage('Неверный тип вопроса')
], async (req, res) => {
  const errors = validationResult(req);
  
  try {
    const question = await Question.findByPk(req.params.questionId, {
      include: [{
        model: Test,
        include: [Subject]
      }]
    });

    if (!question) {
      return res.redirect('/admin/subjects?error=Вопрос не найден');
    }

    if (!errors.isEmpty()) {
      const questionWithAnswers = await Question.findByPk(req.params.questionId, {
        include: [Answer]
      });
      return res.render('admin/question-form', {
        test: question.Test,
        question: questionWithAnswers,
        errors: errors.array()
      });
    }

    const { text, type, imageUrl, answers } = req.body;

    // Обновление вопроса
    question.text = text.trim();
    question.type = type;
    question.imageUrl = imageUrl || null;
    await question.save();

    // Удаление старых ответов
    await Answer.destroy({ where: { questionId: question.id } });

    // Создание новых ответов
    if (answers) {
      const answersArray = Array.isArray(answers) ? answers : [answers];
      for (let i = 0; i < answersArray.length; i++) {
        const answerData = answersArray[i];
        if (answerData && (answerData.text || typeof answerData === 'string')) {
          await Answer.create({
            questionId: question.id,
            text: answerData.text || answerData,
            isCorrect: answerData.isCorrect === 'true' || answerData.isCorrect === true || answerData.isCorrect === 'on',
            order: i
          });
        }
      }
    }

    // Обновление количества вопросов в тесте
    const questionCount = await Question.count({ where: { testId: question.testId } });
    const test = await Test.findByPk(question.testId);
    test.totalQuestions = questionCount;
    await test.save();

    res.redirect(`/admin/subjects/${question.Test.Subject.id}/questions?success=Вопрос обновлен`);
  } catch (error) {
    console.error('Ошибка обновления вопроса:', error);
    res.redirect('/admin/subjects?error=Ошибка при обновлении вопроса');
  }
});

// Удаление вопроса
router.post('/questions/:questionId/delete', async (req, res) => {
  try {
    const question = await Question.findByPk(req.params.questionId, {
      include: [{
        model: Test,
        include: [Subject]
      }]
    });

    if (!question) {
      return res.redirect('/admin/subjects?error=Вопрос не найден');
    }

    const subjectId = question.Test.Subject.id;
    const testId = question.testId;

    // Удаление ответов
    await Answer.destroy({ where: { questionId: question.id } });
    
    // Удаление вопроса
    await question.destroy();

    // Обновление количества вопросов в тесте
    const questionCount = await Question.count({ where: { testId } });
    const test = await Test.findByPk(testId);
    test.totalQuestions = questionCount;
    await test.save();

    res.redirect(`/admin/subjects/${subjectId}/questions?success=Вопрос удален`);
  } catch (error) {
    console.error('Ошибка удаления вопроса:', error);
    res.redirect('/admin/subjects?error=Ошибка при удалении вопроса');
  }
});

// ========== УПРАВЛЕНИЕ ПОЛЬЗОВАТЕЛЯМИ ==========

// Список пользователей
router.get('/users', async (req, res) => {
  try {
    const users = await User.findAll({
      attributes: ['id', 'nickname', 'email', 'isAdmin', 'isModerator', 'isSubscribed', 'createdAt'],
      order: [['createdAt', 'DESC']]
    });

    res.render('admin/users', { users, query: req.query, currentUserId: req.session.userId });
  } catch (error) {
    console.error('Ошибка загрузки пользователей:', error);
    res.render('error', { error: 'Ошибка загрузки пользователей' });
  }
});

// Назначение модератора
router.post('/users/:id/moderator', async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) {
      return res.redirect('/admin/users?error=Пользователь не найден');
    }

    user.isModerator = !user.isModerator;
    await user.save();

    const message = user.isModerator 
      ? 'Пользователь назначен модератором' 
      : 'Права модератора сняты';
    
    res.redirect(`/admin/users?success=${message}`);
  } catch (error) {
    console.error('Ошибка назначения модератора:', error);
    res.redirect('/admin/users?error=Ошибка при изменении прав');
  }
});

// Назначение администратора
router.post('/users/:id/admin', async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) {
      return res.redirect('/admin/users?error=Пользователь не найден');
    }

    // Нельзя снять права администратора у самого себя
    if (user.id === req.session.userId) {
      return res.redirect('/admin/users?error=Нельзя изменить свои собственные права администратора');
    }

    user.isAdmin = !user.isAdmin;
    await user.save();

    const message = user.isAdmin 
      ? 'Пользователь назначен администратором' 
      : 'Права администратора сняты';
    
    res.redirect(`/admin/users?success=${message}`);
  } catch (error) {
    console.error('Ошибка назначения администратора:', error);
    res.redirect('/admin/users?error=Ошибка при изменении прав');
  }
});

module.exports = router;

