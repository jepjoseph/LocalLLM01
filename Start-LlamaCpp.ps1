# ============================================================
# MOTICH AI 2.0 - Standalone llama.cpp Startup Script
# ============================================================

$ErrorActionPreference = "Stop"

# Project configuration
$root = $PSScriptRoot

$runtime = Join-Path $root "runtime\llama-b11998"

$server = Join-Path $runtime "llama-server.exe"

$model = Join-Path $root "AI-Models-Storage\general\Qwen3.5-0.8B-Q8_0.gguf"

# Server configuration
$hostAddress = "127.0.0.1"
$port = 8080
$contextSize = 4096
$threads = 8

Write-Host ""
Write-Host "====================================================" -ForegroundColor Cyan
Write-Host "       MOTICH AI 2.0 - STANDALONE LLAMA.CPP" -ForegroundColor Cyan
Write-Host "====================================================" -ForegroundColor Cyan

# Verify runtime executable
if (-not (Test-Path -LiteralPath $server -PathType Leaf)) {
    throw "llama-server.exe not found: $server"
}

# Verify GGUF model
if (-not (Test-Path -LiteralPath $model -PathType Leaf)) {
    throw "GGUF model not found: $model"
}

# Check whether port is already occupied
$listener = Get-NetTCPConnection `
    -LocalPort $port `
    -State Listen `
    -ErrorAction SilentlyContinue

if ($listener) {
    throw "Port $port is already occupied. Check whether llama.cpp is running."
}

# Display configuration
Write-Host ""
Write-Host "Runtime      : $server"
Write-Host "Model        : $model"
Write-Host "Host         : $hostAddress"
Write-Host "Port         : $port"
Write-Host "Context Size : $contextSize"
Write-Host "Threads      : $threads"

Write-Host ""
Write-Host "Starting llama.cpp..." -ForegroundColor Green
Write-Host "API URL: http://127.0.0.1:$port"
Write-Host "Press Ctrl+C to stop the server." -ForegroundColor Yellow
Write-Host ""

# Start llama.cpp
Push-Location $runtime

try {
    & $server `
        --model $model `
        --host $hostAddress `
        --port $port `
        --ctx-size $contextSize `
        --threads $threads

    $exitCode = $LASTEXITCODE

    if ($exitCode -ne 0) {
        throw "llama.cpp exited with code $exitCode"
    }
}
finally {
    Pop-Location
}

Write-Host ""
Write-Host "llama.cpp server stopped." -ForegroundColor Yellow