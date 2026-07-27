# Run this in a normal PowerShell window (interactive login required once)
$ErrorActionPreference = "Stop"
$frontend = Join-Path $PSScriptRoot "..\app\frontend"
Set-Location -LiteralPath $frontend

Write-Host "Logging into Vercel (browser will open)..." -ForegroundColor Cyan
vercel login --github --oob
if ($LASTEXITCODE -ne 0) { throw "Login failed" }

Write-Host "Deploying production..." -ForegroundColor Cyan
vercel deploy --prod --yes --cwd $frontend
if ($LASTEXITCODE -ne 0) { throw "Deploy failed" }

Write-Host "Done. Open https://flavorexpertsnetwork.com" -ForegroundColor Green
