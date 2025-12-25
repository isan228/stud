# Исправление проблемы с /subscription

## Проблема
Страница `/subscription` редиректит на `/auth/login`, хотя должна быть публичной.

## Причина
В `routes/subscription.js` может быть `router.use(requireAuth)`, который применяется ко всем роутам, включая GET.

## Решение

### Проверьте на сервере:

```bash
# Проверьте routes/subscription.js
cat ~/stud/routes/subscription.js | head -15
```

**Должно быть:**
```javascript
const router = express.Router();

// Оформление подписки с использованием бонусов
// Применяем requireAuth только к POST роуту, а не ко всем роутам
router.post('/purchase', requireAuth, [
```

**НЕ должно быть:**
```javascript
const router = express.Router();

// Все роуты требуют авторизации
router.use(requireAuth);  // <- ЭТО ПРОБЛЕМА!

// Оформление подписки
router.post('/purchase', [
```

### Если нашли `router.use(requireAuth)`:

```bash
cd ~/stud
git pull origin master
npm install
pm2 restart stud-platform
```

### Если код уже правильный, но проблема остается:

Проверьте логи:
```bash
pm2 logs stud-platform --lines 0
```

Откройте `https://stud.kg/subscription` и посмотрите логи.

Если видите:
```
=== requireAuth middleware ===
URL: /subscription
```

Но НЕ видите:
```
=== GET /subscription (публичный роут) ===
```

То проблема в том, что `requireAuth` срабатывает раньше, чем роут из `routes/index.js`.

### Проверка порядка middleware:

В `server.js` должно быть:
```javascript
// Роуты
app.use('/', require('./routes/index'));           // <- ПЕРВЫМ
app.use('/auth', require('./routes/auth'));
...
app.use('/subscription', require('./routes/subscription'));  // <- ПОСЛЕ routes/index
```

Порядок важен! Express обрабатывает роуты в порядке их подключения.

