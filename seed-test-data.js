const { sequelize, Subject, Test, Question, Answer, User } = require('./models');

async function seedTestData() {
  try {
    await sequelize.authenticate();
    console.log('Подключение к базе данных установлено.');

    // Получаем или создаем администратора
    let admin = await User.findOne({ where: { isAdmin: true } });
    if (!admin) {
      admin = await User.create({
        nickname: 'admin',
        email: 'admin@stud.ru',
        password: 'admin123',
        isAdmin: true
      });
      console.log('Администратор создан.');
    }

    const adminId = admin.id;

    // Данные для создания предметов и тестов
    const subjectsData = [
      {
        name: 'Математика',
        description: 'Основы математики, алгебра, геометрия',
        tests: [
          {
            title: 'Алгебра - Основы',
            university: 'Общий',
            type: 'Тест',
            questions: [
              {
                text: 'Чему равно 2 + 2?',
                type: 'single',
                answers: [
                  { text: '3', isCorrect: false },
                  { text: '4', isCorrect: true },
                  { text: '5', isCorrect: false },
                  { text: '6', isCorrect: false }
                ]
              },
              {
                text: 'Чему равно 5 × 3?',
                type: 'single',
                answers: [
                  { text: '10', isCorrect: false },
                  { text: '15', isCorrect: true },
                  { text: '20', isCorrect: false },
                  { text: '25', isCorrect: false }
                ]
              },
              {
                text: 'Какие из следующих чисел являются простыми?',
                type: 'multiple',
                answers: [
                  { text: '2', isCorrect: true },
                  { text: '4', isCorrect: false },
                  { text: '7', isCorrect: true },
                  { text: '9', isCorrect: false },
                  { text: '11', isCorrect: true }
                ]
              },
              {
                text: 'Чему равен квадратный корень из 16?',
                type: 'single',
                answers: [
                  { text: '2', isCorrect: false },
                  { text: '4', isCorrect: true },
                  { text: '8', isCorrect: false },
                  { text: '16', isCorrect: false }
                ]
              },
              {
                text: 'Решите уравнение: x + 5 = 10',
                type: 'single',
                answers: [
                  { text: 'x = 3', isCorrect: false },
                  { text: 'x = 5', isCorrect: true },
                  { text: 'x = 10', isCorrect: false },
                  { text: 'x = 15', isCorrect: false }
                ]
              }
            ]
          }
        ]
      },
      {
        name: 'История',
        description: 'История России и всемирная история',
        tests: [
          {
            title: 'История России - Древняя Русь',
            university: 'Общий',
            type: 'Экзамен',
            questions: [
              {
                text: 'В каком году произошло Крещение Руси?',
                type: 'single',
                answers: [
                  { text: '988', isCorrect: true },
                  { text: '1054', isCorrect: false },
                  { text: '1240', isCorrect: false },
                  { text: '1380', isCorrect: false }
                ]
              },
              {
                text: 'Кто был первым правителем Древнерусского государства?',
                type: 'single',
                answers: [
                  { text: 'Рюрик', isCorrect: true },
                  { text: 'Олег', isCorrect: false },
                  { text: 'Игорь', isCorrect: false },
                  { text: 'Святослав', isCorrect: false }
                ]
              },
              {
                text: 'Какие города входили в состав Древнерусского государства?',
                type: 'multiple',
                answers: [
                  { text: 'Киев', isCorrect: true },
                  { text: 'Новгород', isCorrect: true },
                  { text: 'Москва', isCorrect: false },
                  { text: 'Чернигов', isCorrect: true },
                  { text: 'Санкт-Петербург', isCorrect: false }
                ]
              },
              {
                text: 'В каком году произошла битва на реке Калке?',
                type: 'single',
                answers: [
                  { text: '1220', isCorrect: false },
                  { text: '1223', isCorrect: true },
                  { text: '1237', isCorrect: false },
                  { text: '1240', isCorrect: false }
                ]
              }
            ]
          }
        ]
      },
      {
        name: 'Информатика',
        description: 'Основы программирования и информационных технологий',
        tests: [
          {
            title: 'Основы программирования',
            university: 'Общий',
            type: 'Тест',
            questions: [
              {
                text: 'Что такое переменная в программировании?',
                type: 'single',
                answers: [
                  { text: 'Константное значение', isCorrect: false },
                  { text: 'Именованная область памяти для хранения данных', isCorrect: true },
                  { text: 'Функция', isCorrect: false },
                  { text: 'Цикл', isCorrect: false }
                ]
              },
              {
                text: 'Какие типы данных существуют в программировании?',
                type: 'multiple',
                answers: [
                  { text: 'Integer (целое число)', isCorrect: true },
                  { text: 'String (строка)', isCorrect: true },
                  { text: 'Boolean (логический)', isCorrect: true },
                  { text: 'Array (массив)', isCorrect: true },
                  { text: 'Function (функция)', isCorrect: false }
                ]
              },
              {
                text: 'Что такое алгоритм?',
                type: 'single',
                answers: [
                  { text: 'Последовательность команд для решения задачи', isCorrect: true },
                  { text: 'Язык программирования', isCorrect: false },
                  { text: 'База данных', isCorrect: false },
                  { text: 'Операционная система', isCorrect: false }
                ]
              },
              {
                text: 'Что означает аббревиатура HTML?',
                type: 'single',
                answers: [
                  { text: 'HyperText Markup Language', isCorrect: true },
                  { text: 'High Tech Modern Language', isCorrect: false },
                  { text: 'Home Tool Markup Language', isCorrect: false },
                  { text: 'Hyperlink Text Markup Language', isCorrect: false }
                ]
              },
              {
                text: 'Что такое цикл в программировании?',
                type: 'single',
                answers: [
                  { text: 'Условие', isCorrect: false },
                  { text: 'Повторяющееся выполнение блока кода', isCorrect: true },
                  { text: 'Переменная', isCorrect: false },
                  { text: 'Функция', isCorrect: false }
                ]
              }
            ]
          }
        ]
      },
      {
        name: 'Физика',
        description: 'Механика, термодинамика, оптика',
        tests: [
          {
            title: 'Механика - Основы',
            university: 'Общий',
            type: 'Зачет',
            questions: [
              {
                text: 'Что такое скорость?',
                type: 'single',
                answers: [
                  { text: 'Расстояние, пройденное телом', isCorrect: false },
                  { text: 'Изменение положения тела за единицу времени', isCorrect: true },
                  { text: 'Сила, действующая на тело', isCorrect: false },
                  { text: 'Масса тела', isCorrect: false }
                ]
              },
              {
                text: 'Какая формула описывает второй закон Ньютона?',
                type: 'single',
                answers: [
                  { text: 'F = ma', isCorrect: true },
                  { text: 'E = mc²', isCorrect: false },
                  { text: 'V = s/t', isCorrect: false },
                  { text: 'P = mv', isCorrect: false }
                ]
              },
              {
                text: 'Что такое ускорение?',
                type: 'single',
                answers: [
                  { text: 'Изменение скорости за единицу времени', isCorrect: true },
                  { text: 'Расстояние', isCorrect: false },
                  { text: 'Сила', isCorrect: false },
                  { text: 'Масса', isCorrect: false }
                ]
              },
              {
                text: 'Какие единицы измерения используются в механике?',
                type: 'multiple',
                answers: [
                  { text: 'Метр (м)', isCorrect: true },
                  { text: 'Килограмм (кг)', isCorrect: true },
                  { text: 'Секунда (с)', isCorrect: true },
                  { text: 'Ньютон (Н)', isCorrect: true },
                  { text: 'Вольт (В)', isCorrect: false }
                ]
              }
            ]
          }
        ]
      },
      {
        name: 'Русский язык',
        description: 'Грамматика, орфография, пунктуация',
        tests: [
          {
            title: 'Орфография и пунктуация',
            university: 'Общий',
            type: 'Тест',
            questions: [
              {
                text: 'В каком слове пишется одна буква "н"?',
                type: 'single',
                answers: [
                  { text: 'деревянный', isCorrect: false },
                  { text: 'стеклянный', isCorrect: false },
                  { text: 'ветреный', isCorrect: true },
                  { text: 'образованный', isCorrect: false }
                ]
              },
              {
                text: 'Где нужно поставить запятую? "Он пришел домой(,) и лег спать."',
                type: 'single',
                answers: [
                  { text: 'Перед "и"', isCorrect: true },
                  { text: 'После "и"', isCorrect: false },
                  { text: 'Запятая не нужна', isCorrect: false },
                  { text: 'Перед "домой"', isCorrect: false }
                ]
              },
              {
                text: 'Какие слова пишутся с большой буквы?',
                type: 'multiple',
                answers: [
                  { text: 'Имена собственные', isCorrect: true },
                  { text: 'Названия городов', isCorrect: true },
                  { text: 'Названия месяцев', isCorrect: false },
                  { text: 'Первое слово предложения', isCorrect: true },
                  { text: 'Обычные существительные', isCorrect: false }
                ]
              },
              {
                text: 'В каком слове пишется "о" после шипящих?',
                type: 'single',
                answers: [
                  { text: 'шорох', isCorrect: true },
                  { text: 'шёпот', isCorrect: false },
                  { text: 'жёлудь', isCorrect: false },
                  { text: 'чёрный', isCorrect: false }
                ]
              }
            ]
          }
        ]
      }
    ];

    // Создание предметов, тестов и вопросов
    for (const subjectData of subjectsData) {
      // Проверяем, существует ли предмет
      let subject = await Subject.findOne({ where: { name: subjectData.name } });
      
      if (!subject) {
        subject = await Subject.create({
          name: subjectData.name,
          description: subjectData.description,
          isActive: true
        });
        console.log(`✓ Предмет "${subjectData.name}" создан`);
      } else {
        console.log(`✓ Предмет "${subjectData.name}" уже существует`);
      }

      // Создаем тесты для предмета
      for (const testData of subjectData.tests) {
        // Проверяем, существует ли тест
        let test = await Test.findOne({
          where: {
            title: testData.title,
            subjectId: subject.id
          }
        });

        if (!test) {
          test = await Test.create({
            title: testData.title,
            university: testData.university,
            type: testData.type,
            subject: subject.name,
            subjectId: subject.id,
            createdBy: adminId,
            totalQuestions: testData.questions.length
          });
          console.log(`  ✓ Тест "${testData.title}" создан`);
        } else {
          console.log(`  ✓ Тест "${testData.title}" уже существует`);
          continue; // Пропускаем создание вопросов, если тест уже существует
        }

        // Создаем вопросы для теста
        for (let i = 0; i < testData.questions.length; i++) {
          const questionData = testData.questions[i];
          
          const question = await Question.create({
            testId: test.id,
            text: questionData.text,
            type: questionData.type,
            order: i
          });

          // Создаем ответы для вопроса
          for (let j = 0; j < questionData.answers.length; j++) {
            const answerData = questionData.answers[j];
            await Answer.create({
              questionId: question.id,
              text: answerData.text,
              isCorrect: answerData.isCorrect,
              order: j
            });
          }
        }
        console.log(`    ✓ Создано ${testData.questions.length} вопросов`);
      }
    }

    console.log('\n✅ Тестовые данные успешно созданы!');
    console.log('\nСоздано:');
    console.log(`- ${subjectsData.length} предметов`);
    const totalTests = subjectsData.reduce((sum, s) => sum + s.tests.length, 0);
    console.log(`- ${totalTests} тестов`);
    const totalQuestions = subjectsData.reduce((sum, s) => 
      sum + s.tests.reduce((testSum, t) => testSum + t.questions.length, 0), 0
    );
    console.log(`- ${totalQuestions} вопросов`);

    process.exit(0);
  } catch (error) {
    console.error('Ошибка создания тестовых данных:', error);
    process.exit(1);
  }
}

seedTestData();



