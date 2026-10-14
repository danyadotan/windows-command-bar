# Disposable Windows CI user only: this installs, launches, and uninstalls WinPilot.
param([Parameter(Mandatory = $true)][string]$Installer)
$ErrorActionPreference = 'Stop'
$root = Join-Path $env:LOCALAPPDATA 'WinPilot-CI-Smoke'
if (Test-Path $root) { throw 'Smoke install directory already exists; refusing to modify it.' }
$keys = @(
  'HKCU:\Software\Google\Chrome\NativeMessagingHosts\io.dynamicbridge.winpilot',
  'HKCU:\Software\Microsoft\Edge\NativeMessagingHosts\io.dynamicbridge.winpilot'
)
foreach ($key in $keys) { if (Test-Path $key) { throw 'Existing WinPilot registration; use a disposable Windows account.' } }
function Run-Installer([string]$File, [string[]]$Arguments) {
  $p = Start-Process -FilePath $File -ArgumentList $Arguments -PassThru
  if (!$p.WaitForExit(120000)) { $p.Kill(); throw 'Installer timed out.' }
  if ($p.ExitCode -ne 0) { throw "Installer failed: $($p.ExitCode)" }
}
try {
  Run-Installer (Resolve-Path -LiteralPath $Installer).Path @('/S', "/D=$root")
  $app = Join-Path $root 'WinPilot.exe'
  $hostExe = Join-Path $root 'resources\native-host\WinPilotNativeHost.exe'
  foreach ($file in @($app, $hostExe)) { if (!(Test-Path $file)) { throw "Missing installed file: $file" } }
  foreach ($key in $keys) { if (!(Test-Path $key)) { throw "Missing host registration: $key" } }
  $process = Start-Process -FilePath $app -PassThru
  $deadline = (Get-Date).AddSeconds(30)
  do {
    Start-Sleep -Milliseconds 500
    $process.Refresh()
    if ($process.HasExited) { throw 'Installed application exited before showing a window.' }
  } while ($process.MainWindowHandle -eq 0 -and (Get-Date) -lt $deadline)
  if ($process.MainWindowHandle -eq 0) { throw 'Installed application did not show a window.' }
  foreach ($key in $keys) {
    $manifestPath = (Get-Item -LiteralPath $key).GetValue('')
    $manifest = Get-Content -LiteralPath $manifestPath -Raw | ConvertFrom-Json
    if ($manifest.path -ne $hostExe) { throw 'First-launch host path does not match installed host.' }
    if (@($manifest.allowed_origins).Count -ne 1 -or $manifest.allowed_origins[0] -ne 'chrome-extension://dbkcdkaciiebdadcnmbmeljjfalbobkh/') { throw 'Unexpected native host origin allowlist.' }
  }
  node scripts/native-host-smoke.cjs $hostExe
  if ($LASTEXITCODE -ne 0) { throw 'Installed native host ping failed.' }
} finally {
  Get-Process WinPilot -ErrorAction SilentlyContinue | Where-Object { $_.Path -eq (Join-Path $root 'WinPilot.exe') } | Stop-Process -Force
  $uninstaller = Join-Path $root 'Uninstall WinPilot.exe'
  if (Test-Path $uninstaller) { Run-Installer $uninstaller @('/S') }
}
$deadline = (Get-Date).AddSeconds(30)
while (((Test-Path (Join-Path $root 'WinPilot.exe')) -or (Test-Path $keys[0]) -or (Test-Path $keys[1])) -and (Get-Date) -lt $deadline) { Start-Sleep -Milliseconds 500 }
foreach ($key in $keys) { if (Test-Path $key) { throw "Host registration survived uninstall: $key" } }
$generated = Join-Path $env:APPDATA 'WinPilot\native-messaging\io.dynamicbridge.winpilot.json'
if (Test-Path $generated) { throw 'Generated host manifest survived uninstall.' }
if (Test-Path (Join-Path $root 'WinPilot.exe')) { throw 'Application survived uninstall.' }
Write-Output 'Installer, visible first launch, host ping, and uninstall cleanup passed.'
