param([switch]$Hizli)
$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$voiceRoot = Join-Path $projectRoot 'ses_deneme'
$failed = $false
function Report([string]$name, [bool]$ok, [string]$detail) {
    if (-not $ok) { $script:failed = $true }
    $status = if ($ok) { 'TAMAM' } else { 'EKSİK' }
    Write-Output "$status | $name | $detail"
}
$pythonCandidates = @($env:AFU_SES_PYTHON, (Join-Path (Split-Path -Parent $projectRoot) '_deneme/ses/cbenv/Scripts/python.exe'), (Join-Path $projectRoot 'ses/cbenv/Scripts/python.exe'), (Join-Path $voiceRoot '.venv/Scripts/python.exe'))
$pythonExe = $pythonCandidates | Where-Object { $_ -and (Test-Path -LiteralPath $_ -PathType Leaf) } | Select-Object -First 1
Report 'Python' ([bool]$pythonExe) "$pythonExe"
$cache = Join-Path $env:USERPROFILE '.cache/huggingface/hub/models--ResembleAI--chatterbox'
$required = @('ve.pt','t3_mtl23ls_v2.safetensors','s3gen.pt','grapheme_mtl_merged_expanded_v1.json','conds.pt','Cangjie5_TC.json')
$candidates = @()
$ref = Join-Path $cache 'refs/main'
if (Test-Path -LiteralPath $ref) {
    $revision = (Get-Content -LiteralPath $ref -Raw).Trim()
    if ($revision -match '^[a-zA-Z0-9_-]+$') { $candidates += Join-Path $cache "snapshots/$revision" }
}
$snapshots = Join-Path $cache 'snapshots'
if (Test-Path -LiteralPath $snapshots) { $candidates += @(Get-ChildItem -LiteralPath $snapshots -Directory | Sort-Object Name | ForEach-Object { $_.FullName }) }
function ValidFile([string]$path) {
    try { $stream = [System.IO.File]::OpenRead($path); try { return $stream.Length -gt 0 } finally { $stream.Dispose() } } catch { return $false }
}
$selected = $null
foreach ($candidate in $candidates) {
    $complete = $true
    foreach ($name in $required) {
        $file = Join-Path $candidate $name
        if (-not (ValidFile $file)) { $complete = $false }
    }
    if ($complete) { $selected = $candidate; break }
}
foreach ($name in $required) {
    $file = if ($selected) { Join-Path $selected $name } elseif ($candidates.Count -gt 0) { Join-Path $candidates[0] $name } else { Join-Path $snapshots $name }
    Report $name (ValidFile $file) $file
}
Report 'Snapshot bütünlüğü' ([bool]$selected) $(if ($selected) { $selected } else { 'Tam snapshot bulunamadı' })
$settings = Join-Path $env:APPDATA 'com.afu.afunobet-ui/voice.json'
try {
    $choice = Get-Content -LiteralPath $settings -Raw | ConvertFrom-Json
    Report 'voice.json' ($choice.ses -in @('afu_5b','notr','yumusak_sicak','neseli_hareketli','sakin_dogal') -and $choice.filtre -in @('sicak','enerjik','sakin','yok')) "$($choice.ses) / $($choice.filtre)"
} catch { Report 'voice.json' $false 'Ayar okunamadı' }
$lockPath = Join-Path $voiceRoot '.gpu.lock'
if (Test-Path -LiteralPath $lockPath) {
    $ownerText = (Get-Content -LiteralPath $lockPath -Raw).Trim()
    $ownerId = 0
    $validOwner = [int]::TryParse($ownerText, [ref]$ownerId)
    $owner = if ($validOwner -and $ownerId -gt 0) { Get-Process -Id $ownerId -ErrorAction SilentlyContinue } else { $null }
    Report '.gpu.lock' ([bool]$owner) $(if ($owner) { "Etkin işlem $ownerId" } else { 'Bayat veya geçersiz kilit; değiştirilmedi' })
} else { Report '.gpu.lock' $true 'Kilit yok' }
function PythonCheck([string]$label, [string]$code, [int]$seconds, [string]$argument = '') {
    $info = New-Object System.Diagnostics.ProcessStartInfo
    $info.FileName = $pythonExe
    $info.Arguments = '-B -I -c "' + $code.Replace('"', '\"') + '"'
    if ($argument) { $info.Arguments += ' "' + $argument + '"' }
    $info.UseShellExecute = $false
    $info.CreateNoWindow = $true
    $info.RedirectStandardOutput = $true
    $info.RedirectStandardError = $true
    $process = New-Object System.Diagnostics.Process
    $process.StartInfo = $info
    try {
        [void]$process.Start()
        $stdout = $process.StandardOutput.ReadToEndAsync()
        $stderr = $process.StandardError.ReadToEndAsync()
        if (-not $process.WaitForExit($seconds * 1000)) {
            # Stop only this health check's own process tree, without opening a window.
            $stopInfo = New-Object System.Diagnostics.ProcessStartInfo
            $stopInfo.FileName = 'taskkill.exe'
            $stopInfo.Arguments = '/PID ' + $process.Id + ' /T /F'
            $stopInfo.UseShellExecute = $false
            $stopInfo.CreateNoWindow = $true
            $stopInfo.RedirectStandardOutput = $true
            $stopInfo.RedirectStandardError = $true
            $stop = [System.Diagnostics.Process]::Start($stopInfo)
            [void]$stop.WaitForExit(5000)
            $stop.Dispose()
            Report $label $false "$seconds saniye süre sınırı aşıldı"
            return
        }
        $output = $stdout.GetAwaiter().GetResult().Trim()
        $errors = $stderr.GetAwaiter().GetResult().Trim()
        if ($output) { Write-Output $output }
        if ($process.ExitCode -ne 0 -and $errors) { Write-Output $errors }
        Report $label ($process.ExitCode -eq 0) "çıkış=$($process.ExitCode)"
    } catch { Report $label $false 'Kontrol başlatılamadı' }
    finally { $process.Dispose() }
}
if ($pythonExe) {
    PythonCheck 'Python import' "import os,time; os.environ.update(HF_HUB_OFFLINE='1',TRANSFORMERS_OFFLINE='1'); t=time.monotonic(); import torch, chatterbox; print('torch=' + torch.__version__ + '; CUDA=' + str(torch.cuda.is_available()) + '; import_ms=' + str(round((time.monotonic()-t)*1000)))" 120
    if (-not $Hizli -and $selected) {
        # No adapter, snapshot_download, WAV, reference or cache writes.
        PythonCheck 'Model yükleme' "import os,sys,time; os.environ.update(HF_HUB_OFFLINE='1',TRANSFORMERS_OFFLINE='1'); import torch; from chatterbox.mtl_tts import ChatterboxMultilingualTTS; t=time.monotonic(); m=ChatterboxMultilingualTTS.from_local(sys.argv[1],device='cuda' if torch.cuda.is_available() else 'cpu'); print('model_load_ms=' + str(round((time.monotonic()-t)*1000)))" 150 $selected
    }
}
if ($failed) { Write-Output 'ÖZET: HATA'; exit 1 }
Write-Output 'ÖZET: TAMAM'; exit 0
