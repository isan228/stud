#!/bin/bash

# Скрипт для настройки Nginx как reverse proxy
# Использование: sudo bash setup_nginx.sh

echo "=========================================="
echo "Настройка Nginx как reverse proxy"
echo "=========================================="
echo ""

# Проверка, запущен ли скрипт от root или с sudo
if [ "$EUID" -ne 0 ]; then 
    echo "Ошибка: Запустите скрипт с sudo: sudo bash setup_nginx.sh"
    exit 1
fi

# Проверка установки Nginx
if ! command -v nginx &> /dev/null; then
    echo "Nginx не установлен. Устанавливаю..."
    apt update
    apt install -y nginx
    systemctl start nginx
    systemctl enable nginx
else
    echo "Nginx установлен: $(nginx -v 2>&1)"
fi

# Создание директорий, если их нет
if [ ! -d "/etc/nginx/sites-available" ]; then
    echo "Создание директорий sites-available и sites-enabled..."
    mkdir -p /etc/nginx/sites-available
    mkdir -p /etc/nginx/sites-enabled
fi

# Проверка наличия include директивы в nginx.conf
if ! grep -q "include /etc/nginx/sites-enabled/\*;" /etc/nginx/nginx.conf; then
    echo "Добавление include директивы в nginx.conf..."
    # Создание резервной копии
    cp /etc/nginx/nginx.conf /etc/nginx/nginx.conf.backup.$(date +%Y%m%d_%H%M%S)
    
    # Добавление include после строки с "http {"
    sed -i '/http {/a\    include /etc/nginx/sites-enabled/*;' /etc/nginx/nginx.conf
    echo "Директива include добавлена в nginx.conf"
fi

# Запрос домена
read -p "Введите ваш домен (или IP адрес): " DOMAIN
if [ -z "$DOMAIN" ]; then
    DOMAIN="localhost"
    echo "Используется localhost"
fi

# Создание конфигурации
CONFIG_FILE="/etc/nginx/sites-available/stud-platform"
cat > "$CONFIG_FILE" <<EOF
server {
    listen 80;
    server_name $DOMAIN www.$DOMAIN;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }

    # Увеличение размера загружаемых файлов
    client_max_body_size 50M;
}
EOF

echo ""
echo "Конфигурация создана: $CONFIG_FILE"

# Создание символической ссылки
if [ ! -L "/etc/nginx/sites-enabled/stud-platform" ]; then
    ln -s /etc/nginx/sites-available/stud-platform /etc/nginx/sites-enabled/
    echo "Символическая ссылка создана"
else
    echo "Символическая ссылка уже существует"
fi

# Проверка конфигурации
echo ""
echo "Проверка конфигурации Nginx..."
if nginx -t; then
    echo ""
    echo "=========================================="
    echo "Конфигурация Nginx корректна!"
    echo "=========================================="
    echo ""
    echo "Перезагрузка Nginx..."
    systemctl reload nginx
    echo ""
    echo "Nginx настроен и перезагружен."
    echo "Проверьте доступность приложения по адресу: http://$DOMAIN"
else
    echo ""
    echo "=========================================="
    echo "ОШИБКА: Конфигурация Nginx некорректна!"
    echo "=========================================="
    echo ""
    echo "Проверьте файл конфигурации: $CONFIG_FILE"
    echo "Или используйте альтернативные методы настройки из DEPLOY.md"
    exit 1
fi

