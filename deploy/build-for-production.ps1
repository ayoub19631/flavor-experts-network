# Build production bundle for deployment
# Usage: .\deploy\build-for-production.ps1

$ErrorActionPreference = "Stop"
$FrontendDir = Join-Path $PSScriptRoot "..\app\frontend"

Write-Host "=== Building Flavor Experts Network for Production ===" -ForegroundColor Cyan

Push-Location $FrontendDir

if (-not (Test-Path ".env.production")) {
    Write-Host "Creating .env.production from .env.production.example..." -ForegroundColor Yellow
    Copy-Item ".env.production.example" ".env.production"
    Write-Host "Edit .env.production with your keys, then run again." -ForegroundColor Yellow
    Pop-Location
    exit 1
}

$env:CI = "true"
pnpm install
npx vite build

Write-Host ""
Write-Host "Build complete!" -ForegroundColor Green
Write-Host "Upload contents of: $FrontendDir\dist" -ForegroundColor Green
Write-Host "To GoDaddy cPanel public_html OR connect Vercel/Netlify" -ForegroundColor Green

Pop-Location
