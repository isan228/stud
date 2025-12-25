# Быстрое обновление кода на сервере

## Проблема
На сервере используется старая версия кода с MemoryStore, из-за чего теряются сессии.

## Решение (выполните на сервере)

### 1. Подключитесь к серверу
```bash
ssh root@ваш_сервер_IP
cd ~/stud
```

### 2. Обновите код с GitHub
```bash
# Если есть локальные изменения, сохраните их
git stash

# Скачайте обновления
git pull origin master

# Установите зависимости (если были изменения в package.json)
npm install
```

### 3. Убедитесь, что таблица session существует
```bash
# Подключитесь к базе данных
sudo -u postgres psql studd

# Проверьте таблицу
\dt session

# Если таблицы нет, создайте её:
CREATE TABLE IF NOT EXISTS "session" (
  "sid" varchar NOT NULL COLLATE "default",
  "sess" json NOT NULL,
  "expire" timestamp(6) NOT NULL
);

ALTER TABLE "session" ADD CONSTRAINT "session_pkey" PRIMARY KEY ("sid");
CREATE INDEX IF NOT EXISTS "IDX_session_expire" ON "session" ("expire");
GRANT ALL ON TABLE "session" TO studd_user;

\q
```

### 4. Перезапустите приложение
```bash
pm2 restart stud-platform
```

### 5. Проверьте логи
```bash
pm2 logs stud-platform --lines 30
```

**Ожидаемый результат:** Предупреждение о MemoryStore должно исчезнуть.

## Если предупреждение осталось

Проверьте, что используется правильная версия server.js:

```bash
# Проверьте, что используется PostgreSQL session store
grep -A 5 "pgSession" ~/stud/server.js
```

Должно быть:
```javascript
const pgSession = require('connect-pg-simple')(session);
...
store: new pgSession({
  pool: pgPool,
  tableName: 'session'
}),
```

Если этого нет, значит код не обновился. Попробуйте:
```bash
git reset --hard origin/master
npm install
pm2 restart stud-platform
```

