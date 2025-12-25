# Скрипт для генерации новой пары ключей для Finik API (Windows PowerShell)
# После генерации отправьте публичный ключ в Finik и получите новый API ключ

Write-Host "=== Генерация новой пары ключей для Finik API ===" -ForegroundColor Cyan
Write-Host ""

# Проверяем наличие OpenSSL
$opensslPath = Get-Command openssl -ErrorAction SilentlyContinue
if (-not $opensslPath) {
    Write-Host "❌ OpenSSL не найден. Установите OpenSSL или используйте WSL." -ForegroundColor Red
    Write-Host "   Или используйте скрипт generate_new_finik_keys.sh в WSL" -ForegroundColor Yellow
    exit 1
}

# Создаем директорию для ключей, если её нет
if (-not (Test-Path "keys")) {
    New-Item -ItemType Directory -Path "keys" | Out-Null
}

# Генерируем приватный ключ (2048 бит)
Write-Host "1. Генерация приватного ключа..." -ForegroundColor Yellow
& openssl genrsa -out keys/finik_private_new.pem 2048

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Ошибка при генерации приватного ключа" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Приватный ключ создан: keys/finik_private_new.pem" -ForegroundColor Green
Write-Host ""

# Генерируем публичный ключ из приватного
Write-Host "2. Генерация публичного ключа из приватного..." -ForegroundColor Yellow
& openssl rsa -in keys/finik_private_new.pem -pubout > keys/finik_public_new.pem

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Ошибка при генерации публичного ключа" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Публичный ключ создан: keys/finik_public_new.pem" -ForegroundColor Green
Write-Host ""

# Проверяем ключи
Write-Host "3. Проверка ключей..." -ForegroundColor Yellow
& openssl rsa -in keys/finik_private_new.pem -check -noout
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Приватный ключ валиден" -ForegroundColor Green
} else {
    Write-Host "❌ Приватный ключ невалиден" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "=== КЛЮЧИ УСПЕШНО СОЗДАНЫ ===" -ForegroundColor Green
Write-Host ""
Write-Host "📁 Файлы:" -ForegroundColor Cyan
Write-Host "   - Приватный ключ: keys/finik_private_new.pem"
Write-Host "   - Публичный ключ: keys/finik_public_new.pem"
Write-Host ""
Write-Host "=== СЛЕДУЮЩИЕ ШАГИ ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. Просмотрите публичный ключ:"
Write-Host "   Get-Content keys/finik_public_new.pem"
Write-Host ""
Write-Host "2. Скопируйте ВЕСЬ публичный ключ (включая BEGIN и END строки)"
Write-Host ""
Write-Host "3. Отправьте публичный ключ в Finik (по email или через их систему)"
Write-Host ""
Write-Host "4. Получите от Finik:"
Write-Host "   - Новый API ключ (x-api-key)"
Write-Host "   - Account ID (если еще не получен)"
Write-Host ""
Write-Host "5. После получения нового API ключа:"
Write-Host "   - Обновите FINIK_API_KEY в .env файле"
Write-Host "   - Обновите FINIK_PRIVATE_KEY_PEM в .env файле (используйте новый приватный ключ)"
Write-Host ""
Write-Host "⚠️  ВАЖНО:" -ForegroundColor Yellow
Write-Host "   - НЕ публикуйте приватный ключ"
Write-Host "   - Храните приватный ключ только на сервере"
Write-Host "   - Публичный ключ можно безопасно передавать"
Write-Host ""

