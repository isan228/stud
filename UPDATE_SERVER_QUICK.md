# Быстрое обновление сервера (если на localhost работает, а на сервере нет)

## Проблема
На localhost все работает, а на сервере нет. Это означает, что на сервере используется старая версия кода.

## Решение

### 1. Подключитесь к серверу
```bash
ssh root@ваш_сервер_IP
cd ~/stud
```

### 2. Проверьте текущую версию
```bash
# Проверьте, используется ли MemoryStore (старая версия)
grep "MemoryStore" server.js

# Если выводит что-то - значит старая версия, нужно обновить
# Если ничего не выводит - значит уже обновлено
```

### 3. Обновите код
```bash
# Сохраните локальные изменения (если есть)
git stash

# Скачайте обновления
git pull origin master

# Установите зависимости
npm install
```

### 4. Проверьте таблицу session
```bash
# Проверьте, существует ли таблица
sudo -u postgres psql studd -c "\dt session"

# Если таблицы нет, создайте её:
sudo -u postgres psql studd -f ~/stud/create_session_table.sql
```

### 5. Перезапустите приложение
```bash
pm2 restart stud-platform
pm2 logs stud-platform --lines 50
```

### 6. Проверьте логи
После перезапуска проверьте логи:
```bash
pm2 logs stud-platform --lines 50
```

**Ожидаемый результат:**
- ✅ Нет предупреждений о MemoryStore
- ✅ Видно сообщение "Таблица session проверена/создана"
- ✅ Страница `/subscription` открывается без редиректа на логин

## Автоматическая проверка

Используйте скрипт для проверки:
```bash
chmod +x ~/stud/check_server_version.sh
~/stud/check_server_version.sh
```

## Если проблема сохраняется

1. **Проверьте версию кода:**
   ```bash
   cd ~/stud
   git log -1 --oneline
   # Должен быть коммит с сообщением про исправление requireAuth
   ```

2. **Проверьте, что используется PostgreSQL session store:**
   ```bash
   grep -A 5 "pgSession" ~/stud/server.js
   # Должно быть:
   # store: new pgSession({
   #   pool: pgPool,
   #   tableName: 'session'
   # }),
   ```

3. **Проверьте routes/subscription.js:**
   ```bash
   grep "router.use(requireAuth)" ~/stud/routes/subscription.js
   # Не должно ничего выводить (requireAuth применяется только к POST)
   ```

4. **Проверьте routes/index.js:**
   ```bash
   grep -A 10 "router.get('/subscription'" ~/stud/routes/index.js
   # Должно быть async функция с получением пользователя
   ```

Если что-то не совпадает - значит код не обновился. Выполните:
```bash
cd ~/stud
git reset --hard origin/master
npm install
pm2 restart stud-platform
```

