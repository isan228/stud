# PowerShell скрипт для получения приватного ключа Finik с сервера

# Замените на ваш IP сервера
$serverIP = "ваш_сервер_IP"
$serverUser = "root"

Write-Host "=== Получение приватного ключа Finik с сервера ===" -ForegroundColor Green
Write-Host ""

# Способ 1: Копирование .env файла
Write-Host "Способ 1: Копирование .env файла..." -ForegroundColor Yellow
Write-Host "Выполните команду:" -ForegroundColor Cyan
Write-Host "  scp ${serverUser}@${serverIP}:~/stud/.env ./" -ForegroundColor White
Write-Host ""

# Способ 2: Прямое получение значения через SSH
Write-Host "Способ 2: Прямое получение значения через SSH..." -ForegroundColor Yellow
Write-Host "Выполните команду:" -ForegroundColor Cyan
Write-Host "  ssh ${serverUser}@${serverIP} 'grep FINIK_PRIVATE_KEY_PEM ~/stud/.env'" -ForegroundColor White
Write-Host ""

# Способ 3: Если ключ в отдельном файле
Write-Host "Способ 3: Если ключ в файле finik_private.pem..." -ForegroundColor Yellow
Write-Host "Выполните команду:" -ForegroundColor Cyan
Write-Host "  scp ${serverUser}@${serverIP}:~/stud/finik_private.pem ./" -ForegroundColor White
Write-Host ""

Write-Host "После получения ключа:" -ForegroundColor Green
Write-Host "1. Откройте локальный файл .env" -ForegroundColor White
Write-Host "2. Найдите строку FINIK_PRIVATE_KEY_PEM" -ForegroundColor White
Write-Host "3. Замените значение на полученный ключ" -ForegroundColor White
Write-Host ""

