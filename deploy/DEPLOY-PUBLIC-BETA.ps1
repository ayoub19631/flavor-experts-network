# Deploy Flavor Experts Network — public beta (payments OFF)
# Requires: vercel login  OR  $env:VERCEL_TOKEN

$ErrorActionPreference = "Stop"
$frontend = Join-Path $PSScriptRoot "..\app\frontend"
Set-Location -LiteralPath $frontend

Write-Host "==> Production env: public site, payments disabled" -ForegroundColor Cyan
if (-not (Test-Path ".env.production")) {
  throw ".env.production missing"
}

Write-Host "==> Building..." -ForegroundColor Cyan
npm run build
if ($LASTEXITCODE -ne 0) { throw "Build failed" }

Write-Host "==> Deploying to Vercel production..." -ForegroundColor Cyan
if ($env:VERCEL_TOKEN) {
  vercel deploy --prod --yes --token $env:VERCEL_TOKEN
} else {
  vercel deploy --prod --yes
}

Write-Host ""
Write-Host "After deploy, confirm DNS for flavorexpertsnetwork.com points to Vercel:" -ForegroundColor Yellow
Write-Host "  A     @    76.76.21.21"
Write-Host "  CNAME www  cname.vercel-dns.com"
Write-Host ""
Write-Host "Supabase Auth URL Configuration:" -ForegroundColor Yellow
Write-Host "  Site URL: https://flavorexpertsnetwork.com"
Write-Host "  Redirect: https://flavorexpertsnetwork.com/auth/callback"
