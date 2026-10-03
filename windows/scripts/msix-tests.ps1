$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'msix-install.ps1') -LibraryOnly
$passed=0
function Assert-Rejected([scriptblock]$Action) {
    $rejected=$false; try { & $Action } catch { $rejected=$true }; if (!$rejected) { throw 'Beklenen güvenlik reddi oluşmadı.' }; $script:passed++
}
$pin='A'*40; $hash='B'*64
$info=[pscustomobject]@{identity='AfuNobetUI';publisher='CN=AfuLocal';version='0.1.1.0';architecture='x64';packageFile='AfuNobetUI_0.1.1.0_x64.msix';sha256=$hash;certificateSha256=$hash;thumbprint=$pin}
$identity=[pscustomobject]@{Name='AfuNobetUI';Publisher='CN=AfuLocal';Version='0.1.1.0';ProcessorArchitecture='x64';Executable='afunobet-ui.exe';EntryPoint='Windows.FullTrustApplication'}
$base=@{Info=$info;Identity=$identity;CertificateSubject='CN=AfuLocal';CertificateThumbprint=$pin;PinnedThumbprint=$pin;SignatureThumbprint=$pin;SignatureStatus='NotTrusted';PackageHash=$hash;CertificateHash=$hash}
Assert-AfuMetadata @base; $passed++
Assert-Rejected { $copy=$base.Clone();$copy.CertificateSubject='CN=Other';Assert-AfuMetadata @copy }
Assert-Rejected { $copy=$base.Clone();$copy.CertificateThumbprint='C'*40;Assert-AfuMetadata @copy }
Assert-Rejected { $copy=$base.Clone();$copy.PackageHash='D'*64;Assert-AfuMetadata @copy }
Assert-Rejected { $copy=$base.Clone();$copy.SignatureStatus='HashMismatch';Assert-AfuMetadata @copy }
Assert-Rejected { $copy=$base.Clone();$copy.CertificateHash='E'*64;Assert-AfuMetadata @copy }
Assert-Rejected { Resolve-AfuChildPath $PSScriptRoot '../else.msix' }
Assert-Rejected { Resolve-AfuChildPath $PSScriptRoot 'C:/else.msix' }
$actions=[System.Collections.Generic.List[string]]::new()
$plan=[pscustomobject]@{PackagePath='C:/fake/app.msix';CertificatePath='C:/fake/AfuLocal.cer';Store='Cert:\CurrentUser\TrustedPeople'}
Invoke-AfuInstallPlan $plan -ImportCertificate {param($Path,$Store) $actions.Add("trust:$Store")} -InstallPackage {param($Path)$actions.Add('install')}
if ($actions.Count -ne 2 -or $actions[0] -ne 'trust:Cert:\CurrentUser\TrustedPeople' -or $actions[1] -ne 'install') {throw 'Kurulum eylem sırası veya kapsamı yanlış.'};$passed++
Assert-Rejected { $wrong=[pscustomobject]@{PackagePath='fake';CertificatePath='fake';Store='Cert:\LocalMachine\Root'}; Invoke-AfuInstallPlan $wrong -ImportCertificate {throw 'Ulaşılmamalı'} -InstallPackage {throw 'Ulaşılmamalı'} }
Write-Output "MSIX installer fake-operation tests: $passed PASS; gerçek trust/install yok."
