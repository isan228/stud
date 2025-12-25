# Исправление проблемы с MemoryStore на сервере

## Проблема

На сервере появляется предупреждение:
```
Warning: connect.session() MemoryStore is not designed for a production environment
```

Это означает, что используется старая версия кода с MemoryStore вместо PostgreSQL session store.

## Решение

### 1. Обновите код на сервере

```bash
ssh root@ваш_сервер_IP
cd ~/stud

# Сохраните текущие изменения (если есть)
git stash

# Скачайте обновления
git pull origin master

# Установите зависимости
npm install
```

### 2. Проверьте, что таблица session создана

```bash
# Подключитесь к базе данных
sudo -u postgres psql studd

# Проверьте, существует ли таблица
\dt session

# Если таблицы нет, создайте её:
\i /root/stud/create_session_table.sql

# Или выполните вручную:
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

### 3. Проверьте server.js на сервере

Убедитесь, что в `server.js` используется PostgreSQL session store:

```bash
# Проверьте содержимое
grep -A 10 "pgSession" ~/stud/server.js
```

Должно быть что-то вроде:
```javascript
const pgSession = require('connect-pg-simple')(session);
...
app.use(session({
  store: new pgSession({
    pool: pgPool,
    tableName: 'session'
  }),
  ...
}));
```

### 4. Перезапустите приложение

```bash
pm2 restart stud-platform
pm2 logs stud-platform --lines 50
```

### 5. Проверьте логи

После перезапуска предупреждение о MemoryStore должно исчезнуть. Вместо этого вы должны увидеть:
```
Таблица session проверена/создана
```

## Если проблема сохраняется

1. Проверьте, что `connect-pg-simple` установлен:
   ```bash
   npm list connect-pg-simple
   ```

2. Если пакета нет, установите:
   ```bash
   npm install connect-pg-simple
   ```

3. Проверьте версию server.js:
   ```bash
   head -120 ~/stud/server.js | tail -20
   ```

4. Убедитесь, что используется правильная версия с PostgreSQL store

