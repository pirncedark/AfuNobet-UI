<#
.SYNOPSIS
    AfuNobet UI'yi sahte test modunda hazirlar (tek komut).

.DESCRIPTION
    Test klasorunu olusturur, AFUNOBET_UI_STATE ve AFUNOBET_SORU_DIZINI
    ortam degiskenlerini bu klasore baglar ve ornek bir state.json yazar.
    Gercek AfuNobet verisine DOKUNMAZ.

    Pencereyi acmak kullanicinin istegidir: -Ac verilirse exe baslatilir,
    verilmezse yalnizca ortam hazirlanir ve komut yazdirilir.

.PARAMETER Senaryo
    Hazirlik sonrasi otomatik oynatilacak senaryo. Varsayilan: bos
    (yalnizca baglanmis, bos tahta).

.PARAMETER Hedef
    Test klasoru. Varsayilan: <kok>/test_durum

.PARAMETER Ac
    Sahte modda uygulamayi baslatir (gorunur pencere kullanici ister).

.EXAMPLE
    powershell -ExecutionPolicy Bypass -File scripts/sahte_modda_ac.ps1
    powershell -ExecutionPolicy Bypass -File scripts/sahte_modda_ac.ps1 -Ac -Senaryo codex_soru
#>
param(
    [ValidateSet("bos", "codex_soru", "gemini_kota", "hata", "bayat")]
    [string]$Senaryo = "bos",
    [string]$Hedef = "",
    [switch]$Ac
)

$ErrorActionPreference = "Stop"
$kok = Split-Path -Parent $PSScriptRoot
if ([string]::IsNullOrWhiteSpace($Hedef)) {
    $Hedef = Join-Path $kok "test_durum"
}
$Hedef = [System.IO.Path]::GetFullPath($Hedef)

New-Item -ItemType Directory -Path $Hedef -Force | Out-Null
New-Item -ItemType Directory -Path (Join-Path $Hedef "sorular") -Force | Out-Null
New-Item -ItemType Directory -Path (Join-Path $Hedef "cevaplar") -Force | Out-Null

$state = Join-Path $Hedef "state.json"
$env:AFUNOBET_UI_STATE = $state
$env:AFUNOBET_SORU_DIZINI = $Hedef

# Bos bir baslangic durumu yaz: uygulama acilir acilmaz "baglandi" gorsun.
# BOM'suz yazilir: Rust tarafi (serde_json) BOM'lu dosyayi cozemez.
if (-not (Test-Path $state)) {
    $bos = @'
{
  "version": 1,
  "tasks": [],
  "mesaj": "",
  "quotas": {
    "codex": { "remaining_percent": 80 },
    "gemini": { "remaining_percent": 90 }
  }
}
'@
    [System.IO.File]::WriteAllText($state, $bos, (New-Object System.Text.UTF8Encoding($false)))
}

Write-Output "Sahte test modu hazir."
Write-Output "  Test klasoru : $Hedef"
Write-Output "  AFUNOBET_UI_STATE     = $state"
Write-Output "  AFUNOBET_SORU_DIZINI  = $Hedef"

# Senaryoyu oynat (arayuz kapaliyken de calisir; dosyalar hazir bekler).
$python = $null
foreach ($aday in @("python", "py")) {
    if (Get-Command $aday -ErrorAction SilentlyContinue) { $python = $aday; break }
}
if ($python) {
    & $python (Join-Path $kok "scripts/sahte_olay.py") --senaryo $Senaryo --hedef $Hedef --bekleme 0 --cevap-bekleme 0
} else {
    Write-Output "  NOT: Python bulunamadi; senaryo elle oynatilacak."
}

# Oncelik: gelistirme derlemesi, sonra paketlenmis exe.
$exe = ""
foreach ($aday in @("windows/target/release/afunobet-ui.exe", "dist/afunobet-ui.exe")) {
    $yol = Join-Path $kok $aday
    if (Test-Path $yol) { $exe = $yol; break }
}
if ($Ac) {
    if (-not $exe) {
        Write-Output "HATA: uygulama exe bulunamadi."
        Write-Output "Once 'cd windows && npm run pack' ile paketle ya da -Ac kullanmadan ortam degiskenlerini kendi terminalinde ayarla."
        exit 1
    }
    Start-Process -FilePath $exe -WorkingDirectory (Split-Path $exe)
    Write-Output "Uygulama sahte modda baslatildi."
    Write-Output "Simdi baska bir terminalde: python scripts/sahte_olay.py --senaryo codex_soru"
} else {
    Write-Output ""
    Write-Output "Pencereyi acmak icin ayni komutu -Ac ile calistir:"
    Write-Output "  powershell -ExecutionPolicy Bypass -File scripts/sahte_modda_ac.ps1 -Ac"
    Write-Output ""
    Write-Output "Bu terminali yeni bir terminal degil, ayni pencere olarak kullan:"
    Write-Output "  `$env:AFUNOBET_UI_STATE = `"$state`""
    if ($exe) { Write-Output "  start `"$exe`"" }
}
exit 0
