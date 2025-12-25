#!/bin/bash
# Скрипт для обновления API ключа Finik на сервере

ENV_FILE=".env"
NEW_API_KEY="qWj8xhhOPt8YE4NnW1QB566NTW7S5xPS22DKHxm4"

echo "=== Обновление API ключа Finik ==="
echo ""

if [ ! -f "$ENV_FILE" ]; then
    echo "❌ Файл .env не найден!"
    exit 1
fi

# Создаем резервную копию
cp "$ENV_FILE" "${ENV_FILE}.backup.$(date +%Y%m%d_%H%M%S)"
echo "✓ Создана резервная копия .env"

# Обновляем API ключ
sed -i "s/^FINIK_API_KEY=.*/FINIK_API_KEY=$NEW_API_KEY/" "$ENV_FILE"

if [ $? -eq 0 ]; then
    echo "✓ API ключ обновлен"
    echo ""
    echo "Новый API ключ:"
    grep "FINIK_API_KEY" "$ENV_FILE"
else
    echo "❌ Ошибка при обновлении API ключа"
    exit 1
fi

echo ""
echo "=== Проверка других настроек ==="
echo ""

# Проверяем, что все необходимые переменные есть
REQUIRED_VARS=("FINIK_ENV" "FINIK_API_KEY" "FINIK_ACCOUNT_ID" "FINIK_PRIVATE_KEY_PEM" "FINIK_REDIRECT_URL" "FINIK_ERROR_URL" "FINIK_WEBHOOK_PATH")

for var in "${REQUIRED_VARS[@]}"; do
    if grep -q "^${var}=" "$ENV_FILE"; then
        echo "✓ $var настроен"
    else
        echo "⚠️  $var не найден!"
    fi
done

echo ""
echo "=== Следующие шаги ==="
echo "1. Проверьте, что приватный ключ полный (не обрезан)"
echo "2. Перезапустите приложение: pm2 restart stud-platform"
echo "3. Проверьте логи: pm2 logs stud-platform"
echo ""

