<#
  run-local.ps1 — start Carbon Receipt locally on Windows.
  Backend (FastAPI) on :8000, Frontend (Next.js) on :3000, each in its own window.

  Usage:   ./run-local.ps1
  Stop:    ./stop-local.ps1   (or close the two spawned windows)
#>

$ErrorActionPreference = "Stop"
$root = $PSScriptRoot

Write-Host "=== Carbon Receipt — local launcher ===" -ForegroundColor Green

# --- Backend ---
$backend = Join-Path $root "backend"
$venvPy  = Join-Path $backend "venv\Scripts\python.exe"

if (-not (Test-Path $venvPy)) {
    Write-Host "Creating backend venv + installing deps..." -ForegroundColor Cyan
    python -m venv (Join-Path $backend "venv")
    & $venvPy -m pip install --upgrade pip
    & $venvPy -m pip install -r (Join-Path $backend "requirements.txt")
}
if (-not (Test-Path (Join-Path $backend ".env"))) {
    Copy-Item (Join-Path $backend ".env.example") (Join-Path $backend ".env")
}

Write-Host "Starting backend on http://localhost:8000 ..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList @(
    "-NoExit","-Command",
    "Set-Location '$backend'; ./venv/Scripts/python.exe -m uvicorn app.main:app --reload --port 8000"
)

# --- Frontend ---
$frontend = Join-Path $root "frontend"
if (-not (Test-Path (Join-Path $frontend "node_modules"))) {
    Write-Host "Installing frontend deps (first run)..." -ForegroundColor Cyan
    Push-Location $frontend; npm install; Pop-Location
}
if (-not (Test-Path (Join-Path $frontend ".env.local"))) {
    Copy-Item (Join-Path $frontend ".env.local.example") (Join-Path $frontend ".env.local")
}

Write-Host "Starting frontend on http://localhost:3000 ..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList @(
    "-NoExit","-Command",
    "Set-Location '$frontend'; npm run dev"
)

Write-Host ""
Write-Host "Backend : http://localhost:8000  (docs at /docs)" -ForegroundColor Green
Write-Host "Frontend: http://localhost:3000" -ForegroundColor Green
Write-Host "Two windows opened. Use ./stop-local.ps1 to stop them." -ForegroundColor Yellow

