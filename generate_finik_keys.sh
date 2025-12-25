#!/bin/bash
# Скрипт для генерации пары ключей для Finik Payment System

echo "=== Генерация ключей для Finik ==="
echo ""

# Создаем директорию для ключей (если не существует)
mkdir -p keys

# Генерируем приватный ключ (2048 бит)
echo "1. Генерация приватного ключа..."
openssl genrsa -out keys/finik_private.pem 2048

if [ $? -eq 0 ]; then
    echo "✓ Приватный ключ создан: keys/finik_private.pem"
else
    echo "❌ Ошибка при создании приватного ключа"
    exit 1
fi

# Генерируем публичный ключ из приватного
echo ""
echo "2. Генерация публичного ключа..."
openssl rsa -in keys/finik_private.pem -pubout > keys/finik_public.pem

if [ $? -eq 0 ]; then
    echo "✓ Публичный ключ создан: keys/finik_public.pem"
else
    echo "❌ Ошибка при создании публичного ключа"
    exit 1
fi

echo ""
echo "=== Результат ==="
echo ""
echo "✓ Приватный ключ (ЗАКРЫТЫЙ - храните в секрете!):"
echo "  Файл: keys/finik_private.pem"
echo "  Размер: $(wc -c < keys/finik_private.pem) байт"
echo ""
echo "✓ Публичный ключ (ОТКРЫТЫЙ - отправьте в Finik):"
echo "  Файл: keys/finik_public.pem"
echo "  Размер: $(wc -c < keys/finik_public.pem) байт"
echo ""
echo "=== Что делать дальше ==="
echo ""
echo "1. ПРИВАТНЫЙ КЛЮЧ (finik_private.pem):"
echo "   - Добавьте его содержимое в .env как FINIK_PRIVATE_KEY_PEM"
echo "   - Храните в секрете, не публикуйте!"
echo ""
echo "2. ПУБЛИЧНЫЙ КЛЮЧ (finik_public.pem):"
echo "   - Откройте файл: cat keys/finik_public.pem"
echo "   - Скопируйте ВСЁ содержимое (включая -----BEGIN и -----END)"
echo "   - Отправьте его представителям Finik"
echo ""
echo "3. После получения ключей от Finik:"
echo "   - Добавьте их в .env как FINIK_PUBLIC_KEY_BETA или FINIK_PUBLIC_KEY_PROD"
echo ""

