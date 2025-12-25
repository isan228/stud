const express = require('express');
const router = express.Router();
require('dotenv').config();

// Страница для проверки webhook
router.get('/', (req, res) => {
  const baseUrl = process.env.FINIK_REDIRECT_URL 
    ? process.env.FINIK_REDIRECT_URL.replace(/\/payment\/success.*$/, '').trim()
    : `${req.protocol}://${req.get('host')}`;
  
  const webhookPath = process.env.FINIK_WEBHOOK_PATH || '/webhooks/finik';
  const webhookUrl = `${baseUrl}${webhookPath}`;
  
  res.render('webhook-test', {
    title: 'Проверка Webhook Finik',
    webhookUrl: webhookUrl,
    env: process.env.FINIK_ENV || 'не указано',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;

