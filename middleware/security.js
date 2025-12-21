const { User } = require('../models');

// Middleware для отслеживания нарушений безопасности
const trackSecurityViolation = async (req, res, next) => {
  try {
    // Инициализация счетчика нарушений в сессии
    if (!req.session.securityViolations) {
      req.session.securityViolations = 0;
    }
    
    // Инициализация времени последнего нарушения
    if (!req.session.lastViolationTime) {
      req.session.lastViolationTime = null;
    }
    
    // Проверка куки с нарушениями
    const violationCookie = req.cookies.security_violations;
    let violationCount = 0;
    
    if (violationCookie) {
      try {
        violationCount = parseInt(violationCookie);
      } catch (e) {
        violationCount = 0;
      }
    }
    
    // Если нарушений слишком много - блокируем доступ
    const maxViolations = 5;
    const violationThreshold = violationCount >= maxViolations || req.session.securityViolations >= maxViolations;
    
    if (violationThreshold) {
      // Блокировка на 1 час
      const blockUntil = req.session.blockedUntil || null;
      const now = new Date();
      
      if (blockUntil && new Date(blockUntil) > now) {
        // Пользователь все еще заблокирован
        return res.status(403).render('error', {
          error: 'Доступ временно заблокирован из-за нарушений безопасности. Попробуйте позже.'
        });
      } else if (blockUntil && new Date(blockUntil) <= now) {
        // Блокировка истекла, сбрасываем счетчики
        req.session.securityViolations = 0;
        req.session.blockedUntil = null;
        res.cookie('security_violations', '0', { 
          maxAge: 60 * 60 * 1000, // 1 час
          httpOnly: true,
          secure: false // установите true для HTTPS
        });
      } else {
        // Устанавливаем блокировку
        const blockTime = new Date();
        blockTime.setHours(blockTime.getHours() + 1);
        req.session.blockedUntil = blockTime;
        
        // Логируем блокировку
        if (req.session.userId) {
          console.log(`[SECURITY] Пользователь ${req.session.userId} заблокирован до ${blockTime}`);
        }
        
        return res.status(403).render('error', {
          error: 'Доступ временно заблокирован из-за нарушений безопасности. Попробуйте через 1 час.'
        });
      }
    }
    
    next();
  } catch (error) {
    console.error('Ошибка проверки безопасности:', error);
    next();
  }
};

// Функция для регистрации нарушения
const recordViolation = async (req, res, violationType) => {
  try {
    // Увеличиваем счетчик в сессии
    req.session.securityViolations = (req.session.securityViolations || 0) + 1;
    req.session.lastViolationTime = new Date();
    
    // Увеличиваем счетчик в куки
    const violationCookie = req.cookies.security_violations || '0';
    const violationCount = parseInt(violationCookie) + 1;
    
    // Устанавливаем куки с нарушением
    if (res && res.cookie) {
      res.cookie('security_violations', violationCount.toString(), {
        maxAge: 60 * 60 * 1000, // 1 час
        httpOnly: true,
        secure: false // установите true для HTTPS
      });
    }
    
    // Логируем нарушение
    const userInfo = req.session.userId ? `Пользователь ID: ${req.session.userId}` : 'Неавторизованный пользователь';
    console.log(`[SECURITY VIOLATION] ${userInfo} - Тип: ${violationType} - Всего нарушений: ${violationCount}`);
    
    // Если пользователь авторизован, можно сохранить в БД
    if (req.session.userId) {
      // Здесь можно добавить сохранение в таблицу SecurityViolations если нужно
    }
    
    return violationCount;
  } catch (error) {
    console.error('Ошибка регистрации нарушения:', error);
    return 0;
  }
};

module.exports = {
  trackSecurityViolation,
  recordViolation
};

