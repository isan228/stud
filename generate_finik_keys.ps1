# PowerShell скрипт для генерации ключей Finik (Windows)

Write-Host "=== Генерация ключей для Finik ===" -ForegroundColor Green
Write-Host ""

# Проверяем, установлен ли OpenSSL
$opensslPath = Get-Command openssl -ErrorAction SilentlyContinue

if (-not $opensslPath) {
    Write-Host "❌ OpenSSL не найден!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Установите OpenSSL одним из способов:" -ForegroundColor Yellow
    Write-Host "1. Через Chocolatey: choco install openssl" -ForegroundColor Cyan
    Write-Host "2. Скачайте с: https://slproweb.com/products/Win32OpenSSL.html" -ForegroundColor Cyan
    Write-Host "3. Или используйте WSL (Windows Subsystem for Linux)" -ForegroundColor Cyan
    exit 1
}

# Создаем директорию для ключей
$keysDir = "keys"
if (-not (Test-Path $keysDir)) {
    New-Item -ItemType Directory -Path $keysDir | Out-Null
    Write-Host "✓ Создана директория: $keysDir" -ForegroundColor Green
}

# Генерируем приватный ключ
Write-Host "1. Генерация приватного ключа..." -ForegroundColor Yellow
$privateKeyPath = Join-Path $keysDir "finik_private.pem"

openssl genrsa -out $privateKeyPath 2048

if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ Приватный ключ создан: $privateKeyPath" -ForegroundColor Green
} else {
    Write-Host "❌ Ошибка при создании приватного ключа" -ForegroundColor Red
    exit 1
}

# Генерируем публичный ключ
Write-Host ""
Write-Host "2. Генерация публичного ключа..." -ForegroundColor Yellow
$publicKeyPath = Join-Path $keysDir "finik_public.pem"

openssl rsa -in $privateKeyPath -pubout > $publicKeyPath

if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ Публичный ключ создан: $publicKeyPath" -ForegroundColor Green
} else {
    Write-Host "❌ Ошибка при создании публичного ключа" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "=== Результат ===" -ForegroundColor Green
Write-Host ""
Write-Host "✓ Приватный ключ (ЗАКРЫТЫЙ - храните в секрете!):" -ForegroundColor Yellow
Write-Host "  Файл: $privateKeyPath" -ForegroundColor White
Write-Host "  Размер: $((Get-Item $privateKeyPath).Length) байт" -ForegroundColor White
Write-Host ""
Write-Host "✓ Публичный ключ (ОТКРЫТЫЙ - отправьте в Finik):" -ForegroundColor Yellow
Write-Host "  Файл: $publicKeyPath" -ForegroundColor White
Write-Host "  Размер: $((Get-Item $publicKeyPath).Length) байт" -ForegroundColor White
Write-Host ""
Write-Host "=== Что делать дальше ===" -ForegroundColor Green
Write-Host ""
Write-Host "1. ПРИВАТНЫЙ КЛЮЧ (finik_private.pem):" -ForegroundColor Cyan
Write-Host "   - Добавьте его содержимое в .env как FINIK_PRIVATE_KEY_PEM" -ForegroundColor White
Write-Host "   - Храните в секрете, не публикуйте!" -ForegroundColor Red
Write-Host ""
Write-Host "2. ПУБЛИЧНЫЙ КЛЮЧ (finik_public.pem):" -ForegroundColor Cyan
Write-Host "   - Откройте файл: Get-Content $publicKeyPath" -ForegroundColor White
Write-Host "   - Скопируйте ВСЁ содержимое (включая -----BEGIN и -----END)" -ForegroundColor White
Write-Host "   - Отправьте его представителям Finik" -ForegroundColor White
Write-Host ""
Write-Host "3. После получения ключей от Finik:" -ForegroundColor Cyan
Write-Host "   - Добавьте их в .env как FINIK_PUBLIC_KEY_BETA или FINIK_PUBLIC_KEY_PROD" -ForegroundColor White
Write-Host ""

