param(
    [Parameter(Mandatory=$true)]
    [string]$Version
)

Write-Host "🚀 Nova Browser Release v$Version" -ForegroundColor Cyan

# 1. Обновить версию
$pkg = Get-Content "package.json" -Raw | ConvertFrom-Json
$pkg.version = $Version
$pkg | ConvertTo-Json -Depth 10 | Set-Content "package.json" -Encoding UTF8
Write-Host "✅ version: $Version" -ForegroundColor Green

# 2. Собрать
Write-Host "🔨 Сборка..." -ForegroundColor Yellow
Remove-Item -Recurse -Force dist -ErrorAction SilentlyContinue
npx electron-builder build --win nsis --x64 --publish never

# 3. Git push
Write-Host "⬆️ Push..." -ForegroundColor Yellow
git add .
git commit -m "v$Version"
git push origin main

Write-Host ""
Write-Host "✅ Сборка готова!" -ForegroundColor Green
Write-Host ""
Write-Host "Осталось вручную:" -ForegroundColor Yellow
Write-Host "1. Открой: https://github.com/Orang786/nova-browser/releases/new" -ForegroundColor White
Write-Host "2. Tag: v$Version" -ForegroundColor White
Write-Host "3. Загрузи: dist/Nova-Browser-Setup-$Version.exe" -ForegroundColor White
Write-Host "4. Обнови update.json с новой ссылкой" -ForegroundColor White
Write-Host "5. git push origin main" -ForegroundColor White