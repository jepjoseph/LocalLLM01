# ============================================================
# MOTICH AI - Qwen3-Coder Dedicated Inference Service
# ============================================================

$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$runtime = Join-Path $root "runtime\llama-b11998"
$server = Join-Path $runtime "llama-server.exe"

$model = Join-Path $root "AI-Models-Storage\coding\Qwen3-Coder-30B-A3B-Instruct-Q4_K_M.gguf"

$hostAddress = "127.0.0.1"
$port = 8082

$contextPerSlot = 8192
$parallelSlots = 2
$totalContext = $contextPerSlot * $parallelSlots

$threads = 8
$gpuLayers = 0

Write-Host ""
Write-Host "==============================================" -ForegroundColor Cyan
Write-Host "       MOTICH AI - QWEN3 CODER SERVER" -ForegroundColor Cyan
Write-Host "==============================================" -ForegroundColor Cyan

if (-not (Test-Path -LiteralPath $server -PathType Leaf)) {
    throw "llama-server executable not found: $server"
}

if (-not (Test-Path -LiteralPath $model -PathType Leaf)) {
    throw "Coding model not found: $model"
}

$listener = Get-NetTCPConnection `
    -LocalPort $port `
    -State Listen `
    -ErrorAction SilentlyContinue

if ($listener) {
    throw "Port $port is already occupied."
}

$modelFile = Get-Item -LiteralPath $model

Write-Host ""
Write-Host "Model          : $($modelFile.Name)"
Write-Host "Model size GB  : $([math]::Round($modelFile.Length / 1GB, 2))"
Write-Host "Runtime        : $server"
Write-Host "Host           : $hostAddress"
Write-Host "Port           : $port"
Write-Host "Context/slot   : $contextPerSlot"
Write-Host "Parallel slots : $parallelSlots"
Write-Host "Total context  : $totalContext"
Write-Host "CPU threads    : $threads"
Write-Host "GPU layers     : $gpuLayers"

Write-Host ""
Write-Host "Starting Qwen3-Coder..." -ForegroundColor Green
Write-Host "Endpoint: http://127.0.0.1:$port/v1/chat/completions"
Write-Host "Press Ctrl+C to stop." -ForegroundColor Yellow

Push-Location $runtime

try {
    & $server `
        --model $model `
        --host $hostAddress `
        --port $port `
        --ctx-size $totalContext `
        --parallel $parallelSlots `
        --threads $threads `
        --n-gpu-layers $gpuLayers

    $exitCode = $LASTEXITCODE

    if ($exitCode -ne 0) {
        throw "Qwen3-Coder server exited with code $exitCode"
    }
}
finally {
    Pop-Location
}
