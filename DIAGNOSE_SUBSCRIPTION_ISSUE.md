# Диагностика проблемы с /subscription

## Проверка на сервере

Выполните эти команды по порядку:

### 1. Проверьте routes/subscription.js
```bash
grep -n "requireAuth" ~/stud/routes/subscription.js
```

**Ожидаемый результат:**
- Должно быть только `requireAuth` в строке с `router.post('/purchase', requireAuth, [`
- НЕ должно быть `router.use(requireAuth)` на отдельной строке

### 2. Проверьте порядок роутов в server.js
```bash
grep -A 15 "// Роуты" ~/stud/server.js | grep "app.use"
```

**Ожидаемый результат:**
```
app.use('/', require('./routes/index'));           <- должен быть ПЕРВЫМ
app.use('/auth', require('./routes/auth'));
...
app.use('/subscription', require('./routes/subscription'));  <- должен быть ПОСЛЕ routes/index
```

### 3. Проверьте логи в реальном времени
```bash
pm2 logs stud-platform --lines 0
```

Затем откройте в браузере: `https://stud.kg/subscription`

**Что должно быть в логах:**
```
=== GET /subscription (публичный роут) ===
Session ID: ...
Session userId: ... (или null, если не авторизован)
Error query: ...
```

**Если видите это ПЕРЕД логами subscription:**
```
=== requireAuth middleware ===
URL: /subscription
Method: GET
```

То проблема в том, что `requireAuth` срабатывает где-то раньше.

### 4. Проверьте, нет ли requireAuth в server.js для /subscription
```bash
grep -B 5 -A 5 "/subscription" ~/stud/server.js
```

**НЕ должно быть:**
```javascript
app.use('/subscription', requireAuth, require('./routes/subscription'));
```

### 5. Если проблема найдена

Если нашли `router.use(requireAuth)` в `routes/subscription.js`:

```bash
cd ~/stud
git pull origin master
npm install
pm2 restart stud-platform
```

Если проблема в порядке роутов или в `server.js` - пришлите вывод команд выше.

