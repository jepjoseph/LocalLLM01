# ==========================================
# MoticH AI 2.0 - Qwen Startup Script
# ==========================================

$ErrorActionPreference = "Stop"

$ProjectRoot = $PSScriptRoot

$ModelPath = Join-Path $ProjectRoot "Qwen3.5-0.8B-Q8_0.llamafile.exe"

$HostAddress = "127.0.0.1"
$Port = 8080

Write-Host ""
Write-Host "========================================"
Write-Host "        MoticH AI 2.0 - Qwen"
Write-Host "========================================"

# Verify model executable
if (-not (Test-Path -LiteralPath $ModelPath -PathType Leaf)) {
    Write-Host "ERROR: Qwen executable not found." -ForegroundColor Red
    Write-Host "Expected location: $ModelPath"
    exit 1
}

# Check whether the port is already in use
$PortInUse = Get-NetTCPConnection `
    -LocalPort $Port `
    -State Listen `
    -ErrorAction SilentlyContinue

if ($PortInUse) {
    Write-Host "Port $Port is already in use." -ForegroundColor Yellow
    Write-Host "Check whether Qwen is already running."
    exit 1
}

Write-Host "Model: $ModelPath"
Write-Host "Host: $HostAddress"
Write-Host "Port: $Port"

Write-Host ""
Write-Host "Starting Qwen..." -ForegroundColor Green

# Start the model server
& $ModelPath `
    --server `
    --host $HostAddress `
    --port $Port

if ($LASTEXITCODE -ne 0) {
    Write-Host "Qwen exited with code $LASTEXITCODE" -ForegroundColor Red
    exit $LASTEXITCODE
}