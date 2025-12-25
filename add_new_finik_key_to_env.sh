#!/bin/bash

# Скрипт для добавления нового приватного ключа в .env файл
# Используйте этот скрипт после генерации новой пары ключей

echo "=== Добавление нового приватного ключа в .env ==="
echo ""

# Проверяем наличие файла с ключом
if [ ! -f "keys/finik_private_new.pem" ]; then
    echo "❌ Файл keys/finik_private_new.pem не найден"
    echo "   Сначала запустите: ./generate_new_finik_keys.sh"
    exit 1
fi

# Проверяем наличие .env файла
if [ ! -f ".env" ]; then
    echo "❌ Файл .env не найден"
    exit 1
fi

# Читаем приватный ключ и конвертируем в одну строку с \n
PRIVATE_KEY=$(cat keys/finik_private_new.pem | sed ':a;N;$!ba;s/\n/\\n/g')

# Экранируем кавычки
PRIVATE_KEY_ESCAPED=$(echo "$PRIVATE_KEY" | sed 's/"/\\"/g')

# Обновляем .env файл
if grep -q "^FINIK_PRIVATE_KEY_PEM=" .env; then
    # Заменяем существующую строку
    sed -i "s|^FINIK_PRIVATE_KEY_PEM=.*|FINIK_PRIVATE_KEY_PEM=\"$PRIVATE_KEY_ESCAPED\"|" .env
    echo "✅ FINIK_PRIVATE_KEY_PEM обновлен в .env"
else
    # Добавляем новую строку
    echo "" >> .env
    echo "# Приватный ключ Finik (новый)" >> .env
    echo "FINIK_PRIVATE_KEY_PEM=\"$PRIVATE_KEY_ESCAPED\"" >> .env
    echo "✅ FINIK_PRIVATE_KEY_PEM добавлен в .env"
fi

echo ""
echo "=== ГОТОВО ==="
echo ""
echo "⚠️  ВАЖНО:"
echo "   1. Обновите FINIK_API_KEY в .env после получения нового API ключа от Finik"
echo "   2. Перезапустите приложение: pm2 restart stud-platform"
echo ""

