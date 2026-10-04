$ErrorActionPreference='Stop'
$workspaceRoot=Split-Path (Split-Path $PSScriptRoot)
$sourceExe=Join-Path $workspaceRoot 'windows/target/release/afunobet-ui.exe'
$deliveryStamp=Get-Date -Format 'yyyyMMdd-HHmmss'
$outputExe=Join-Path $workspaceRoot "dist/afunobet-ui-$deliveryStamp.exe"
Copy-Item -LiteralPath $sourceExe -Destination $outputExe
$sourceHash=(Get-FileHash -LiteralPath $sourceExe -Algorithm SHA256).Hash
$outputHash=(Get-FileHash -LiteralPath $outputExe -Algorithm SHA256).Hash
if($sourceHash -ne $outputHash){throw 'Teslim dosyası doğrulanamadı.'}
$shortcutPath=Join-Path ([Environment]::GetFolderPath('Desktop')) 'AfuNobet UI.lnk'
$backupDirectory=Join-Path $workspaceRoot "delivery/uiux-fix-$deliveryStamp"
New-Item -ItemType Directory -Path $backupDirectory -Force | Out-Null
$shell=New-Object -ComObject WScript.Shell
$previousTarget=''
if(Test-Path -LiteralPath $shortcutPath){
 Copy-Item -LiteralPath $shortcutPath -Destination (Join-Path $backupDirectory 'AfuNobet UI.lnk')
 $previousTarget=$shell.CreateShortcut($shortcutPath).TargetPath
}
$temporaryShortcut=Join-Path $env:TEMP "AfuNobet-edge-$deliveryStamp.lnk"
$shortcut=$shell.CreateShortcut($temporaryShortcut)
$shortcut.TargetPath=$outputExe
$shortcut.WorkingDirectory=Split-Path $outputExe
$shortcut.Description='AfuNobet UI'
$shortcut.Save()
Copy-Item -LiteralPath $temporaryShortcut -Destination $shortcutPath -Force
$target=$shell.CreateShortcut($shortcutPath).TargetPath
if($target -ne $outputExe){throw 'Masaüstü kısayolu doğrulanamadı.'}
$manifest=@{created=(Get-Date -Format o);feature='uiux-speed-fit-mascot';source=$sourceExe;output=$outputExe;sha256=$outputHash;size=(Get-Item -LiteralPath $outputExe).Length;shortcut=$shortcutPath;shortcutTarget=$target;previousShortcutTarget=$previousTarget;windowsSmokeTest='UNVERIFIED';commit='-'}
$manifest | ConvertTo-Json | Set-Content -Encoding utf8 (Join-Path $workspaceRoot 'dist/uiux-build-manifest.json')
$manifest | ConvertTo-Json | Set-Content -Encoding utf8 (Join-Path $workspaceRoot 'windows/test-results/uiux-delivery.json')
$manifest | ConvertTo-Json

