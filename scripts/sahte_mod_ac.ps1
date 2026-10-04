# Q5: sahte test modunda AfuNobet-UI'yi tek komutla hazirlar.
# Klasor: scripts/sahte_mod_ac.ps1
# Pencere YALNIZCA -Baslat ile acilir; onsizade hicbir sey baslatilmaz.
param(
    [switch]$Baslat,
    [string]$Senaryo = "bos",
    [string]$Exe = "",
    [string]$Hedef = ""
)

$ErrorActionPreference = "Stop"
$kok = Split-Path -Parent $PSScriptRoot
if (-not $Hedef) { $Hedef = Join-Path $kok "test_durum" }
$Hedef = (New-Item -ItemType Directory -Force -Path $Hedef).FullName

# Arayuz bu iki degiskenden okur: state.json ve sorular/cevaplar klasoru.
$env:AFUNOBET_UI_STATE = Join-Path $Hedef "state.json"
$env:AFUNOBET_SORU_DIZINI = $Hedef

if (-not $Exe) {
    $adaylar = @(
        (Join-Path $kok "windows\target\release\afunobet-ui.exe"),
        (Join-Path $kok "dist\afunobet-ui.exe")
    )
    $Exe = $adaylar | Where-Object { Test-Path $_ } | Select-Object -First 1
}
if (-not $Exe -or -not (Test-Path $Exe)) {
    $Exe = $adaylar[0]
}

# Bos bir tablo hazirla: arayuz "Baglanti bekleniyor" ile acmasin.
if (-not (Test-Path (Join-Path $Hedef "state.json"))) {
    & python (Join-Path $kok "scripts\sahte_olay.py") --senaryo $Senaryo --hedef $Hedef --bekleme 0 | Out-Null
}

Write-Host "Sahte test modu hazir."
Write-Host "  Klasor      : $Hedef"
Write-Host "  AFUNOBET_UI_STATE   = $env:AFUNOBET_UI_STATE"
Write-Host "  AFUNOBET_SORU_DIZINI= $env:AFUNOBET_SORU_DIZINI"
Write-Host "  Uygulama    : $Exe"

if ($Baslat) {
    if (-not (Test-Path $Exe)) {
        Write-Host "Uygulama bulunamadi. Once 'npm run pack' ile derle." -ForegroundColor Red
        exit 1
    }
    Start-Process -FilePath $Exe
    Write-Host "Uygulama baslatildi."
} else {
    Write-Host "Pencereyi acmak icin:  powershell -ExecutionPolicy Bypass -File $PSCommandPath -Baslat"
    Write-Host "Senaryo oynatmak icin:  python scripts\sahte_olay.py --senaryo codex_soru"
}