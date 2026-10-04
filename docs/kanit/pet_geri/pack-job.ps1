$ErrorActionPreference = 'Continue'
$taskRoot = (Resolve-Path (Join-Path $PSScriptRoot '../../..')).Path
Set-Location (Join-Path $taskRoot 'windows')
try {
    & npm.cmd --offline run pack *> (Join-Path $PSScriptRoot 'pack-tur2.txt')
    $packExit = $LASTEXITCODE
    Set-Content (Join-Path $PSScriptRoot 'pack-exit.txt') $packExit
    Add-Content -Encoding UTF8 (Join-Path $PSScriptRoot 'log.txt') "$(Get-Date -Format o) SON Offline pack exit=$packExit"
    exit $packExit
} catch {
    Add-Content -Encoding UTF8 (Join-Path $PSScriptRoot 'log.txt') "$(Get-Date -Format o) HATA Pack wrapper: $($_.Exception.Message)"
    Set-Content (Join-Path $PSScriptRoot 'pack-exit.txt') '1'
    exit 1
}
