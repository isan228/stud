#!/bin/bash

# Скрипт для проверки версии кода на сервере

echo "=== Проверка версии кода на сервере ==="
echo ""

# Проверка использования MemoryStore
echo "1. Проверка использования MemoryStore в server.js:"
if grep -q "MemoryStore" ~/stud/server.js 2>/dev/null; then
    echo "   ❌ ОШИБКА: Используется MemoryStore (старая версия)"
    echo "   Нужно обновить код с GitHub"
else
    echo "   ✅ MemoryStore не найден"
fi

# Проверка использования pgSession
echo ""
echo "2. Проверка использования PostgreSQL session store:"
if grep -q "pgSession\|connect-pg-simple" ~/stud/server.js 2>/dev/null; then
    echo "   ✅ Используется PostgreSQL session store"
else
    echo "   ❌ ОШИБКА: PostgreSQL session store не найден"
    echo "   Нужно обновить код с GitHub"
fi

# Проверка requireAuth в routes/subscription.js
echo ""
echo "3. Проверка routes/subscription.js:"
if grep -q "router.use(requireAuth)" ~/stud/routes/subscription.js 2>/dev/null; then
    echo "   ❌ ОШИБКА: router.use(requireAuth) применяется ко всем роутам"
    echo "   Нужно обновить код с GitHub"
else
    echo "   ✅ requireAuth применяется только к POST роутам"
fi

# Проверка таблицы session
echo ""
echo "4. Проверка таблицы session в базе данных:"
if sudo -u postgres psql studd -c "\dt session" 2>/dev/null | grep -q "session"; then
    echo "   ✅ Таблица session существует"
else
    echo "   ❌ ОШИБКА: Таблица session не найдена"
    echo "   Нужно выполнить: sudo -u postgres psql studd -f ~/stud/create_session_table.sql"
fi

# Проверка последнего коммита
echo ""
echo "5. Проверка последнего коммита:"
cd ~/stud
LAST_COMMIT=$(git log -1 --oneline 2>/dev/null)
if [ -n "$LAST_COMMIT" ]; then
    echo "   Последний коммит: $LAST_COMMIT"
else
    echo "   ❌ Не удалось получить информацию о коммитах"
fi

echo ""
echo "=== Рекомендации ==="
echo "Если найдены ошибки, выполните:"
echo "  cd ~/stud"
echo "  git stash"
echo "  git pull origin master"
echo "  npm install"
echo "  pm2 restart stud-platform"

