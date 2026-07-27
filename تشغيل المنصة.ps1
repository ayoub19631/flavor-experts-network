# تشغيل منصة خبراء النكهات (خادم الويب + تطبيق الكمبيوتر)
# كيفية الاستخدام: انقر بالزر الأيمن → Run with PowerShell

$ErrorActionPreference = "Stop"
$ROOT = Split-Path -Parent $MyInvocation.MyCommand.Path
$FRONTEND = Join-Path $ROOT "app\frontend"
$ELECTRON = Join-Path $ROOT "electron"

Write-Host "════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  منصة خبراء النكهات" -ForegroundColor Yellow
Write-Host "════════════════════════════════════" -ForegroundColor Cyan

# 1) تحقق هل خادم الويب شغّال أم لا
$serverRunning = $false
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3001" -TimeoutSec 2 -UseBasicParsing -ErrorAction Stop
    $serverRunning = $true
    Write-Host "`n✅ خادم الويب يعمل بالفعل على localhost:3001" -ForegroundColor Green
} catch {
    Write-Host "`n▶  تشغيل خادم الويب..." -ForegroundColor Yellow
}

# 2) شغّل خادم الويب إذا لم يكن شغّالاً
if (-not $serverRunning) {
    Start-Process powershell -ArgumentList "-NoProfile -Command `"Set-Location '$FRONTEND'; npx vite --port 3001`"" -WindowStyle Minimized
    
    Write-Host "  انتظار تشغيل الخادم..." -ForegroundColor Gray
    $timeout = 30
    $elapsed = 0
    while ($elapsed -lt $timeout) {
        Start-Sleep -Seconds 1
        $elapsed++
        try {
            Invoke-WebRequest -Uri "http://localhost:3001" -TimeoutSec 1 -UseBasicParsing -ErrorAction Stop | Out-Null
            Write-Host "  ✅ الخادم جاهز!" -ForegroundColor Green
            break
        } catch { }
        Write-Host "  ⏳ $elapsed/$timeout ثانية..." -ForegroundColor Gray
    }
    
    if ($elapsed -ge $timeout) {
        Write-Host "❌ لم يستجب الخادم خلال $timeout ثانية. تحقق من المنفذ 3001." -ForegroundColor Red
        Read-Host "اضغط Enter للخروج"
        exit 1
    }
}

# 3) شغّل تطبيق Electron
Write-Host "`n▶  تشغيل تطبيق الكمبيوتر..." -ForegroundColor Yellow
Set-Location $ELECTRON
npx electron . --dev

Write-Host "`n👋 تم إغلاق التطبيق." -ForegroundColor Cyan
