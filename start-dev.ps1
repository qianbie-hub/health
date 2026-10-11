# Start Vigil Backend and Frontend Concurrently
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "   Starting Vigil Health Copilot        " -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan

# Add portable node to path if present
if (Test-Path "$env:LOCALAPPDATA\node-lts") {
    $env:PATH = "$env:LOCALAPPDATA\node-lts;$env:PATH"
}

$backendPath = Join-Path $PSScriptRoot "backend"
$frontendPath = Join-Path $PSScriptRoot "frontend"

Write-Host "`n[1/2] Launching FastAPI Backend on http://127.0.0.1:8000..." -ForegroundColor Yellow
$backendProcess = Start-Process -FilePath "$backendPath\venv\Scripts\uvicorn.exe" `
    -ArgumentList "main:app --host 127.0.0.1 --port 8000 --reload" `
    -WorkingDirectory $backendPath `
    -PassThru

Start-Sleep -Seconds 2

Write-Host "[2/2] Launching Vite Frontend on http://localhost:5173..." -ForegroundColor Yellow
Set-Location $frontendPath
cmd.exe /c npm run dev -- --host 127.0.0.1 --port 5173
