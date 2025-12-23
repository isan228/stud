#!/bin/bash
# Скрипт для добавления приватного ключа Finik в .env файл

PRIVATE_KEY_FILE="finik_private.pem"
ENV_FILE=".env"

# Проверяем, существует ли файл с приватным ключом
if [ ! -f "$PRIVATE_KEY_FILE" ]; then
    echo "Ошибка: Файл $PRIVATE_KEY_FILE не найден!"
    echo "Сгенерируйте ключ: openssl genrsa -out $PRIVATE_KEY_FILE 2048"
    exit 1
fi

# Читаем приватный ключ и преобразуем в одну строку с \n
PRIVATE_KEY=$(cat "$PRIVATE_KEY_FILE" | sed ':a;N;$!ba;s/\n/\\n/g')

# Проверяем, существует ли .env файл
if [ ! -f "$ENV_FILE" ]; then
    echo "Ошибка: Файл $ENV_FILE не найден!"
    exit 1
fi

# Удаляем старую строку FINIK_PRIVATE_KEY_PEM, если она есть
sed -i '/^FINIK_PRIVATE_KEY_PEM=/d' "$ENV_FILE"

# Добавляем новую строку с ключом
echo "FINIK_PRIVATE_KEY_PEM=\"$PRIVATE_KEY\"" >> "$ENV_FILE"

echo "Приватный ключ успешно добавлен в $ENV_FILE"
echo ""
echo "Проверьте результат:"
grep "FINIK_PRIVATE_KEY_PEM" "$ENV_FILE"

