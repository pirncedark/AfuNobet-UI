$ErrorActionPreference = "Stop"
$exe = "C:\Users\afuuu\Desktop\afuproject\AfuNobet-UI\dist\afunobet-ui.exe"
$desktop = [Environment]::GetFolderPath("Desktop")
$lnk = Join-Path $desktop "AfuNobet UI.lnk"
$temp_lnk = Join-Path ([System.IO.Path]::GetTempPath()) "AfuNobet_UI_temp.lnk"

if (-not (Test-Path $exe)) {
    Write-Output "ERROR: exe bulunamadi: $exe"
    exit 1
}

try {
    # 1. Temp klasöre kısayol oluştur (sandbox kısıtı olmaz)
    $shell = New-Object -ComObject WScript.Shell
    $s = $shell.CreateShortcut($temp_lnk)
    $s.TargetPath = $exe
    $s.WorkingDirectory = Split-Path $exe
    $s.Description = "AfuNobet UI"
    $s.Save()
    Write-Output "BASARILI: Temp klasore kisayol yazildi: $temp_lnk"
    
    # 2. Masaüstüne taşı
    if (Test-Path $lnk) {
        Remove-Item -Path $lnk -Force -ErrorAction Continue
    }
    Copy-Item -Path $temp_lnk -Destination $lnk -Force
    Remove-Item -Path $temp_lnk -Force -ErrorAction Continue
    Write-Output "BASARILI: Masaustu kisayolu guncellendi: $lnk"
    
    $i = Get-Item $exe
    Write-Output ("INFO: EXE guncel: " + $i.LastWriteTime + " ({0} bytes)" -f $i.Length)
    exit 0
    
} catch {
    $err = $_.Exception
    Write-Output "ERROR: $($err.GetType().Name) - $($err.Message)"
    Write-Output "DETAY: Satir=$($_.InvocationInfo.ScriptLineNumber)"
    exit 1
}
