const express = require('express');
const multer = require('multer');
const pdf = require('pdf-parse');
const fs = require('fs');
const path = require('path');
const { Test, Question, Answer, Subject } = require('../models');
const { requireAdmin } = require('../middleware/auth');
const router = express.Router();

// Все роуты требуют прав администратора
router.use(requireAdmin);

// Настройка multer для загрузки файлов
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, '../uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'pdf-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: function (req, file, cb) {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Только PDF файлы разрешены!'));
    }
  }
});

// Форма загрузки PDF
router.get('/subjects/:subjectId/upload-pdf', async (req, res) => {
  try {
    const subject = await Subject.findByPk(req.params.subjectId);
    if (!subject) {
      return res.redirect('/admin/subjects?error=Предмет не найден');
    }

    // Ищем или создаем тест по умолчанию
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

    res.render('admin/upload-pdf', { subject, test: defaultTest, errors: [] });
  } catch (error) {
    console.error('Ошибка:', error);
    res.redirect('/admin/subjects');
  }
});

// Обработка загрузки PDF
router.post('/subjects/:subjectId/upload-pdf', upload.single('pdfFile'), async (req, res) => {
  try {
    const subject = await Subject.findByPk(req.params.subjectId);
    if (!subject) {
      return res.redirect('/admin/subjects?error=Предмет не найден');
    }

    if (!req.file) {
      return res.render('admin/upload-pdf', {
        subject,
        test: null,
        errors: [{ msg: 'Файл не был загружен' }]
      });
    }

    // Чтение PDF файла
    const dataBuffer = fs.readFileSync(req.file.path);
    const pdfData = await pdf(dataBuffer);

    // Удаление временного файла
    fs.unlinkSync(req.file.path);

    // Парсинг текста из PDF
    const text = pdfData.text;
    const questions = parseQuestionsFromText(text);

    if (questions.length === 0) {
      return res.render('admin/upload-pdf', {
        subject,
        test: null,
        errors: [{ msg: 'Не удалось найти вопросы в PDF. Убедитесь, что формат правильный (q:, a1:, s:, a2: и т.д.)' }]
      });
    }

    // Ищем или создаем тест
    let test = await Test.findOne({
      where: {
        subjectId: subject.id,
        title: `Тест по ${subject.name}`
      }
    });

    if (!test) {
      test = await Test.create({
        title: `Тест по ${subject.name}`,
        university: 'Общий',
        type: 'Тест',
        subject: subject.name,
        subjectId: subject.id,
        createdBy: req.session.userId,
        totalQuestions: 0
      });
    }

    // Создание вопросов
    let createdCount = 0;
    let errorCount = 0;

    for (const questionData of questions) {
      try {
        // Создание вопроса
        const question = await Question.create({
          testId: test.id,
          text: questionData.text.trim(),
          type: 'single',
          order: 0
        });

        // Создание ответов (минимум 2, максимум 10)
        const validAnswers = questionData.answers.filter(a => a && a.trim && a.trim().length > 0);
        if (validAnswers.length < 2) {
          errorCount++;
          continue;
        }

        // Проверяем правильный индекс
        if (questionData.correctIndex < 0 || questionData.correctIndex >= validAnswers.length) {
          errorCount++;
          continue;
        }

        for (let i = 0; i < validAnswers.length; i++) {
          const answerText = validAnswers[i];
          const isCorrect = i === questionData.correctIndex;
          
          await Answer.create({
            questionId: question.id,
            text: answerText.trim(),
            isCorrect: isCorrect,
            order: i
          });
        }

        createdCount++;
      } catch (error) {
        console.error('Ошибка создания вопроса:', error);
        errorCount++;
      }
    }

    // Обновление количества вопросов в тесте
    const questionCount = await Question.count({ where: { testId: test.id } });
    test.totalQuestions = questionCount;
    await test.save();

    res.redirect(`/admin/subjects/${subject.id}/questions?success=Загружено вопросов: ${createdCount}${errorCount > 0 ? ', ошибок: ' + errorCount : ''}`);
  } catch (error) {
    console.error('Ошибка обработки PDF:', error);
    
    // Удаление файла в случае ошибки
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    const subject = await Subject.findByPk(req.params.subjectId);
    res.render('admin/upload-pdf', {
      subject,
      test: null,
      errors: [{ msg: 'Ошибка при обработке PDF файла: ' + error.message }]
    });
  }
});

// Функция парсинга вопросов из текста
function parseQuestionsFromText(text) {
  const questions = [];
  const lines = text.split(/\r?\n/).map(line => line.trim()).filter(line => line.length > 0);

  let currentQuestion = null;
  let currentAnswers = [];
  let correctIndex = -1;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lowerLine = line.toLowerCase();

    // Начало нового вопроса
    if (lowerLine.startsWith('q:')) {
      // Сохраняем предыдущий вопрос, если есть
      if (currentQuestion && currentAnswers.length >= 2 && correctIndex >= 0 && correctIndex < currentAnswers.length) {
        questions.push({
          text: currentQuestion,
          answers: currentAnswers,
          correctIndex: correctIndex
        });
      }

      // Начинаем новый вопрос
      currentQuestion = line.substring(2).trim();
      currentAnswers = [];
      correctIndex = -1;
    }
    // Вариант ответа a1, a2, a3, a4, a5 и т.д.
    else if (lowerLine.match(/^a\d+:/)) {
      const match = lowerLine.match(/^a(\d+):/);
      if (match) {
        const answerNum = parseInt(match[1]);
        const answerText = line.substring(line.indexOf(':') + 1).trim();
        if (answerText) {
          // Заполняем массив до нужного индекса, если пропущены номера
          while (currentAnswers.length < answerNum) {
            currentAnswers.push('');
          }
          currentAnswers[answerNum - 1] = answerText;
        }
      }
    }
    // Правильный ответ (s: номер)
    else if (lowerLine.startsWith('s:')) {
      const sValue = line.substring(2).trim();
      // Может быть номер (1, 2, 3) или текст ответа
      const numMatch = sValue.match(/^(\d+)/);
      if (numMatch) {
        correctIndex = parseInt(numMatch[1]) - 1; // Индекс с 0
      } else {
        // Если это текст, ищем его среди ответов
        correctIndex = currentAnswers.findIndex(a => a.toLowerCase().includes(sValue.toLowerCase()));
      }
    }
    // Продолжение вопроса (если вопрос многострочный)
    else if (currentQuestion && !lowerLine.match(/^a\d+:/) && !lowerLine.startsWith('s:')) {
      currentQuestion += ' ' + line;
    }
  }

  // Сохраняем последний вопрос
  if (currentQuestion && currentAnswers.length >= 2) {
    // Убираем пустые ответы и сохраняем правильный индекс
    const validAnswers = [];
    let newCorrectIndex = -1;
    
    for (let i = 0; i < currentAnswers.length; i++) {
      if (currentAnswers[i] && currentAnswers[i].length > 0) {
        if (i === correctIndex) {
          newCorrectIndex = validAnswers.length;
        }
        validAnswers.push(currentAnswers[i]);
      }
    }
    
    if (validAnswers.length >= 2 && newCorrectIndex >= 0 && newCorrectIndex < validAnswers.length) {
      questions.push({
        text: currentQuestion,
        answers: validAnswers,
        correctIndex: newCorrectIndex
      });
    }
  }

  return questions;
}

module.exports = router;

