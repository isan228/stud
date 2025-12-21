const { User } = require('../models');

// Middleware для проверки авторизации
const requireAuth = (req, res, next) => {
  if (req.session.userId) {
    next();
  } else {
    res.redirect('/auth/login');
  }
};

// Middleware для проверки прав администратора
const requireAdmin = async (req, res, next) => {
  try {
    if (!req.session.userId) {
      return res.redirect('/auth/login');
    }

    const user = await User.findByPk(req.session.userId);
    
    if (!user || !user.isAdmin) {
      return res.status(403).render('error', { 
        error: 'Доступ запрещен. Требуются права администратора.' 
      });
    }

    next();
  } catch (error) {
    console.error('Ошибка проверки прав администратора:', error);
    res.status(500).render('error', { error: 'Ошибка проверки прав доступа' });
  }
};

// Middleware для проверки прав модератора или администратора
const requireModerator = async (req, res, next) => {
  try {
    if (!req.session.userId) {
      return res.redirect('/auth/login');
    }

    const user = await User.findByPk(req.session.userId);
    
    if (!user || (!user.isAdmin && !user.isModerator)) {
      return res.status(403).render('error', { 
        error: 'Доступ запрещен. Требуются права модератора или администратора.' 
      });
    }

    next();
  } catch (error) {
    console.error('Ошибка проверки прав модератора:', error);
    res.status(500).render('error', { error: 'Ошибка проверки прав доступа' });
  }
};

module.exports = {
  requireAuth,
  requireAdmin,
  requireModerator
};





