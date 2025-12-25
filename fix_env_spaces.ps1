# Скрипт для исправления пробелов в .env файле

$envFile = ".env"

if (-not (Test-Path $envFile)) {
    Write-Host "Файл .env не найден!" -ForegroundColor Red
    exit 1
}

Write-Host "Исправление пробелов в .env файле..." -ForegroundColor Yellow

# Читаем файл построчно
$lines = Get-Content $envFile
$fixedLines = @()

foreach ($line in $lines) {
    # Исправляем пробелы после = для FINIK переменных
    if ($line -match '^(FINIK_\w+)=\s+(.+)$') {
        $fixedLine = $matches[1] + '=' + $matches[2].Trim()
        $fixedLines += $fixedLine
        Write-Host "Исправлено: $line -> $fixedLine" -ForegroundColor Cyan
    } else {
        $fixedLines += $line
    }
}

# Сохраняем обратно
$fixedLines | Set-Content $envFile

Write-Host "`n✓ Пробелы исправлены!" -ForegroundColor Green
Write-Host ""
Write-Host "Проверка результата:" -ForegroundColor Cyan
Select-String -Path $envFile -Pattern "FINIK_.*URL" | ForEach-Object {
    if ($_.Line -match '=\s') {
        Write-Host "⚠️  Все еще есть пробел: $($_.Line)" -ForegroundColor Yellow
    } else {
        Write-Host "✓ OK: $($_.Line)" -ForegroundColor Green
    }
}
