param(
  [Parameter(Mandatory = $true)][string]$Installer,
  [Parameter(Mandatory = $true)][string]$Application,
  [Parameter(Mandatory = $true)][string]$NativeHost,
  [Parameter(Mandatory = $true)][string]$PublisherThumbprint
)
$ErrorActionPreference = 'Stop'
$expected = $PublisherThumbprint.Replace(' ', '').ToUpperInvariant()
if ($expected -notmatch '^[0-9A-F]{40}$') { throw 'Expected an approved certificate SHA-1 thumbprint (40 hex characters).' }
foreach ($file in @($Installer, $Application, $NativeHost)) {
  if (!(Test-Path -LiteralPath $file -PathType Leaf)) { throw "Missing signed binary: $file" }
  $signature = Get-AuthenticodeSignature -LiteralPath $file
  if ($signature.Status -ne 'Valid') { throw "Invalid Authenticode signature: $file ($($signature.Status))" }
  if ($signature.SignerCertificate.Thumbprint.ToUpperInvariant() -ne $expected) { throw "Unexpected publisher: $file" }
  if (!$signature.TimeStamperCertificate) { throw "Missing trusted timestamp: $file" }
  Write-Output "Verified signature and timestamp: $file"
}
