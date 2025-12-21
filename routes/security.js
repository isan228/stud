const express = require('express');
const router = express.Router();
const { recordViolation } = require('../middleware/security');

// API endpoint для регистрации нарушений безопасности с клиента
router.post('/violation', async (req, res) => {
  try {
    const { violationType, details } = req.body;
    
    // Регистрируем нарушение
    const violationCount = await recordViolation(req, res, violationType || 'unknown');
    
    // Отправляем ответ клиенту
    res.json({
      success: true,
      violationCount: violationCount,
      message: violationCount >= 5 
        ? 'Превышен лимит нарушений. Доступ будет заблокирован.' 
        : `Нарушение зарегистрировано. Всего: ${violationCount}/5`
    });
  } catch (error) {
    console.error('Ошибка обработки нарушения:', error);
    res.status(500).json({ success: false, error: 'Ошибка обработки' });
  }
});

module.exports = router;

