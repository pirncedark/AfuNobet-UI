# Real production Codex bridge -> Afu 5b -> production Whisper; no playback.
param([switch]$Yerel)
$ErrorActionPreference = 'Stop'
$taskRoot = Split-Path $PSScriptRoot -Parent
$proofRoot = Join-Path $taskRoot ('docs/kanit/bas_konus/canli-' + (Get-Date -Format 'yyyyMMdd-HHmmss'))
$oldProof = $env:AFU_VOICE_PROOF_DIR
$oldInput = $env:AFU_VOICE_INPUT_FILE
Push-Location (Join-Path $taskRoot 'windows')
try {
    $env:AFU_VOICE_PROOF_DIR = $proofRoot
    Remove-Item Env:AFU_VOICE_INPUT_FILE -ErrorAction SilentlyContinue
    if (-not $Yerel) {
        cargo test --offline --test codex_protocol live_voice_reply -- --ignored --nocapture
        if ($LASTEXITCODE -ne 0) { throw 'Codex yanıtı alınamadı; hesabını bağlayıp yeniden dene.' }
        $env:AFU_VOICE_INPUT_FILE = Join-Path $proofRoot 'codex_reply.txt'
    }
    cargo test --offline --test voice_backend afu_5b_roundtrip -- --ignored --nocapture
    if ($LASTEXITCODE -ne 0) { throw 'Ses doğrulanamadı; test sonucunu kontrol et.' }
    Write-Host ('Doğrulandı. Ses ve metin: ' + $proofRoot)
} finally {
    $env:AFU_VOICE_PROOF_DIR = $oldProof
    $env:AFU_VOICE_INPUT_FILE = $oldInput
    Pop-Location
}
