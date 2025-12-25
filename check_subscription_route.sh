#!/bin/bash

echo "=== Проверка роутов subscription ==="
echo ""

echo "1. Проверка routes/subscription.js:"
echo "   Ищем router.use(requireAuth):"
if grep -q "router.use(requireAuth)" ~/stud/routes/subscription.js 2>/dev/null; then
    echo "   ❌ ОШИБКА: router.use(requireAuth) применяется ко всем роутам"
    echo "   Это заставляет GET /subscription требовать авторизацию"
else
    echo "   ✅ requireAuth применяется только к конкретным роутам"
fi

echo ""
echo "2. Проверка routes/index.js:"
echo "   Ищем GET /subscription:"
if grep -q "router.get('/subscription'" ~/stud/routes/index.js 2>/dev/null; then
    echo "   ✅ GET /subscription найден в routes/index.js"
    if grep -q "async.*req.*res" ~/stud/routes/index.js 2>/dev/null | grep -A 5 "router.get('/subscription'"; then
        echo "   ✅ Роут асинхронный и получает пользователя"
    else
        echo "   ⚠️  Роут может быть не обновлен"
    fi
else
    echo "   ❌ GET /subscription не найден в routes/index.js"
fi

echo ""
echo "3. Проверка server.js - порядок подключения роутов:"
echo "   Проверяем порядок app.use:"
if grep -A 15 "// Роуты" ~/stud/server.js | grep -q "app.use('/', require('./routes/index'))" 2>/dev/null; then
    echo "   ✅ routes/index подключен первым (правильно)"
else
    echo "   ⚠️  Порядок подключения роутов может быть неправильным"
fi

if grep -A 15 "// Роуты" ~/stud/server.js | grep -q "app.use('/subscription', require('./routes/subscription'))" 2>/dev/null; then
    echo "   ✅ routes/subscription подключен после routes/index (правильно)"
else
    echo "   ⚠️  routes/subscription может быть подключен неправильно"
fi

echo ""
echo "4. Проверка middleware/auth.js:"
if grep -q "console.log.*requireAuth" ~/stud/middleware/auth.js 2>/dev/null; then
    echo "   ✅ Логирование включено в requireAuth"
else
    echo "   ⚠️  Логирование не включено (может быть старая версия)"
fi

echo ""
echo "=== Рекомендации ==="
echo "Если найдены ошибки, выполните:"
echo "  cd ~/stud"
echo "  git pull origin master"
echo "  npm install"
echo "  pm2 restart stud-platform"

