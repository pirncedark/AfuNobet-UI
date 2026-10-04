<#
.SYNOPSIS
    AfuNobet UI'nin en son halini derler ve gorev cubugundaki kisayolun actigi sabit konuma yerlestirir.

.DESCRIPTION
    Gorev cubugu simgesi her zaman %LOCALAPPDATA%\Programs\AfuNobet-UI\afunobet-ui.exe dosyasini acar.
    Bu betik o dosyayi yeni surumle degistirir; sabitlenmis simge bozulmadan en son hali acar.
      1. Derler (-DerlemeYok verilmezse)
      2. Calisan Afu'yu kapatir (exe kilitli kalmasin)
      3. Onceki surumu onceki\ klasorune yedekler
      4. Yeni exe'yi kopyalar, SHA256 ile dogrular
      5. Baslat menusu kisayolunu olusturur/gunceller
      6. Afu once aciksa yeniden acar

.EXAMPLE
    powershell -ExecutionPolicy Bypass -File scripts/gorev-cubugu-guncelle.ps1
    powershell -ExecutionPolicy Bypass -File scripts/gorev-cubugu-guncelle.ps1 -GeriAl
#>
param(
    [switch]$DerlemeYok,
    [switch]$GeriAl
)

$ErrorActionPreference = "Stop"
$kok = Split-Path -Parent $PSScriptRoot
$kaynak = Join-Path $kok "windows\target\release\afunobet-ui.exe"
$hedefDizin = Join-Path $env:LOCALAPPDATA "Programs\AfuNobet-UI"
$hedef = Join-Path $hedefDizin "afunobet-ui.exe"
$onceki = Join-Path $hedefDizin "onceki\afunobet-ui.exe"
$kisayol = Join-Path $env:APPDATA "Microsoft\Windows\Start Menu\Programs\AfuNobet UI.lnk"

function Afu-Kapat {
    $calisan = @(Get-Process afunobet-ui -ErrorAction SilentlyContinue)
    foreach ($p in $calisan) { Stop-Process -Id $p.Id -Force -Confirm:$false }
    if ($calisan.Count -gt 0) { Wait-Process -Id $calisan.Id -Timeout 10 -ErrorAction SilentlyContinue }
    return $calisan.Count -gt 0
}

if ($GeriAl) {
    if (-not (Test-Path $onceki)) { Write-Output "HATA: geri alinacak onceki surum yok: $onceki"; exit 1 }
    $acikti = Afu-Kapat
    Copy-Item $onceki $hedef -Force
    Write-Output "GERI ALINDI: onceki surum gorev cubugu konumuna kondu."
    if ($acikti) { Start-Process -FilePath $hedef -WorkingDirectory $kok }
    exit 0
}

if (-not $DerlemeYok) {
    # Acik Afu exe'yi kilitler; derlemeden once kapat.
    $acikti = Afu-Kapat
    $env:Path = "$env:USERPROFILE\.cargo\bin;$env:Path"
    $env:CARGO_NET_OFFLINE = "false"
    # whisper-rs icin libclang: tanimli degilse Visual Studio Build Tools'un Clang bileseninden bul.
    if (-not $env:LIBCLANG_PATH) {
        $vswhere = Join-Path ${env:ProgramFiles(x86)} "Microsoft Visual Studio\Installer\vswhere.exe"
        if (Test-Path $vswhere) {
            $vs = & $vswhere -products * -latest -property installationPath
            $clang = Join-Path "$vs" "VC\Tools\Llvm\x64\bin"
            if (Test-Path (Join-Path $clang "libclang.dll")) { $env:LIBCLANG_PATH = $clang }
        }
    }
    Push-Location (Join-Path $kok "windows")
    try {
        if (-not (Test-Path "node_modules")) {
            cmd /c "npm ci 2>&1" | Select-Object -Last 2 | ForEach-Object { Write-Output $_ }
            if ($LASTEXITCODE -ne 0) { Write-Output "HATA: npm ci basarisiz."; exit 1 }
        }
        # Tauri bilgi satirlarini stderr'e yazar; PowerShell 5.1 bunu hata sanmasin diye cmd uzerinden birlestir.
        cmd /c "npx tauri build --no-bundle 2>&1" | Select-Object -Last 3 | ForEach-Object { Write-Output $_ }
        if ($LASTEXITCODE -ne 0) { Write-Output "HATA: derleme basarisiz; gorev cubugundaki surum DEGISMEDI."; exit 1 }
    } finally { Pop-Location }
} else {
    $acikti = Afu-Kapat
}

if (-not (Test-Path $kaynak)) { Write-Output "HATA: derlenmis exe yok: $kaynak"; exit 1 }

New-Item -ItemType Directory -Force (Split-Path $onceki) | Out-Null
if (Test-Path $hedef) {
    $eskiOzet = (Get-FileHash $hedef -Algorithm SHA256).Hash
    $yeniOzet = (Get-FileHash $kaynak -Algorithm SHA256).Hash
    if ($eskiOzet -ne $yeniOzet) { Copy-Item $hedef $onceki -Force }
}
Copy-Item $kaynak $hedef -Force
if ((Get-FileHash $hedef -Algorithm SHA256).Hash -ne (Get-FileHash $kaynak -Algorithm SHA256).Hash) {
    Write-Output "HATA: kopya dogrulanamadi."; exit 1
}

# AfuNobet gozetmeni yoksa ada "Baglanti bekleniyor" demesin: bos durum dosyasi (varsa dokunulmaz).
$eskiVeri = Join-Path $env:USERPROFILE "Desktop\afuproject\AfuNobet"
if (-not $env:AFUNOBET_UI_STATE -and -not $env:AFUNOBET_DB -and -not (Test-Path $eskiVeri)) {
    $veri = Join-Path $env:LOCALAPPDATA "AfuNobet"
    $durum = Join-Path $veri "state.json"
    if (-not (Test-Path $durum)) {
        New-Item -ItemType Directory -Force $veri | Out-Null
        [IO.File]::WriteAllText($durum, "{`n  `"version`": 1,`n  `"tasks`": [],`n  `"mesaj`": `"`"`n}`n", (New-Object Text.UTF8Encoding($false)))
        Write-Output "Bos durum dosyasi olusturuldu: $durum"
    }
}

# Calisma klasoru proje koku: ses ozelligi ses_deneme klasorunu buradan arar.
# Afu gorev cubugunda pencere gostermez; sabitlenecek simge masaustu/Baslat kisayoludur.
$shell = New-Object -ComObject WScript.Shell
$masaustuKisayol = Join-Path ([Environment]::GetFolderPath("Desktop")) "AfuNobet UI.lnk"
foreach ($yol in @($kisayol, $masaustuKisayol)) {
    $s = $shell.CreateShortcut($yol)
    $s.TargetPath = $hedef
    $s.WorkingDirectory = $kok
    $s.IconLocation = "$hedef,0"
    $s.Description = "AfuNobet UI - Afu durum adasi"
    $s.Save()
}

$bilgi = Get-Item $hedef
Write-Output ("GUNCELLENDI: {0} ({1:N0} bayt, {2})" -f $hedef, $bilgi.Length, $bilgi.LastWriteTime)
Write-Output "Kisayol: $kisayol"
if ($acikti) {
    Start-Process -FilePath $hedef -WorkingDirectory $kok
    Write-Output "Afu yeni surumle yeniden acildi."
}
exit 0
