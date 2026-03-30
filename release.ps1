param(
    [Parameter(Mandatory=$true)]
    [string]$Version
)

Write-Host "Release v$Version" -ForegroundColor Cyan

# 1. Update version
$content = Get-Content "package.json" -Raw
$content = $content -replace '"version": ".*?"', "`"version`": `"$Version`""
$content | Set-Content "package.json" -Encoding UTF8
Write-Host "OK version: $Version" -ForegroundColor Green

# 2. Kill old processes
taskkill /F /IM "Nova Browser.exe" /T 2>$null
taskkill /F /IM "electron.exe" /T 2>$null
Start-Sleep -Seconds 2

# 3. Clean
Remove-Item -Recurse -Force dist -ErrorAction SilentlyContinue

# 4. Build
Write-Host "Building..." -ForegroundColor Yellow
npx electron-builder build --win nsis --x64 --publish never

# 5. Git push
Write-Host "Pushing..." -ForegroundColor Yellow
git add .
git commit -m "v$Version"
git push origin main

Write-Host ""
Write-Host "DONE! Now upload exe to GitHub Releases:" -ForegroundColor Green
Write-Host "https://github.com/Orang786/nova-browser/releases/new" -ForegroundColor White