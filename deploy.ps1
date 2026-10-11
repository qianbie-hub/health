# ==============================================================================
# Vigil Health Copilot - Production Deployment Script (Windows PowerShell)
# ==============================================================================
$ErrorActionPreference = "Stop"

Write-Host "=======================================================" -ForegroundColor Cyan
Write-Host "   🚀 Deploying Vigil Health Copilot (Windows)         " -ForegroundColor Green
Write-Host "=======================================================" -ForegroundColor Cyan

# 1. Check if Docker is available
$hasDocker = Get-Command docker -ErrorAction SilentlyContinue

if ($hasDocker) {
    Write-Host "[1/3] Docker detected. Initializing containerized stack..." -ForegroundColor Yellow
    if (-not (Test-Path ".env")) {
        Copy-Item ".env.example" ".env"
        Write-Host "Created .env from .env.example" -ForegroundColor DarkGray
    }
    docker compose up -d --build
    Write-Host "`nWaiting for backend healthcheck..." -ForegroundColor Yellow
    Start-Sleep -Seconds 5
    Write-Host "Vigil is running on http://localhost:80 (API: http://localhost:8000/docs)" -ForegroundColor Green
} else {
    Write-Host "[1/3] Standalone deployment mode (Direct Python & Node runtime)..." -ForegroundColor Yellow

    # Ensure Node is in PATH
    if (Test-Path "$env:LOCALAPPDATA\node-lts") {
        $env:PATH = "$env:LOCALAPPDATA\node-lts;$env:PATH"
    }

    $backendPath = Join-Path $PSScriptRoot "backend"
    $frontendPath = Join-Path $PSScriptRoot "frontend"

    # Test backend
    Write-Host "[2/3] Running automated backend test suite..." -ForegroundColor Yellow
    & "$backendPath\venv\Scripts\pytest.exe" "$backendPath\test_api.py" -q

    # Build frontend
    Write-Host "[3/3] Compiling optimized frontend production distribution..." -ForegroundColor Yellow
    Set-Location $frontendPath
    cmd.exe /c npm run build

    Write-Host "`n=======================================================" -ForegroundColor Green
    Write-Host "   🎉 Production build completed successfully!         " -ForegroundColor Green
    Write-Host "=======================================================" -ForegroundColor Cyan
    Write-Host "To launch dev/staging servers concurrently, execute: .\start-dev.ps1" -ForegroundColor Yellow
}
