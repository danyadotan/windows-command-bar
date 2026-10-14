# Windows release guide

WinPilot produces a per-user NSIS installer. It runs as the current user and does not request blanket administrator access. A package installed through winget may still trigger its own Windows elevation prompt.

## Internal test build

Run:

```powershell
npm ci
npm audit --audit-level=moderate
npm test
npm run package:win
```

The installer is created in `release/`. GitHub Actions uploads the same output as the `WinPilot-Windows-unsigned` artifact on every pull request and push to `main`.

Unsigned builds are for internal testing only. Windows SmartScreen may warn about them.

## Production signing

Use an Authenticode code-signing certificate from a trusted certificate authority. Store the certificate and password only as encrypted CI secrets:

- `WIN_CSC_LINK`: certificate file, base64 data, or a supported secure URL
- `WIN_CSC_KEY_PASSWORD`: certificate password

electron-builder reads these variables automatically. Do not commit a certificate, password, personal access token, or API key to this repository.

Before publishing a build, verify its signature on Windows:

```powershell
Get-AuthenticodeSignature .\release\WinPilot-Setup-*.exe | Format-List
```

The status must be `Valid`, and the signer must match the expected publisher. Install and smoke-test the signed artifact on a clean Windows machine before public distribution.

## Controlled beta gate

See [BETA.md](BETA.md) for onboarding, access controls, validation, and the current readiness assessment. CI artifacts remain internal-test-only. A successful build or installer smoke test is not permission to distribute an unsigned binary to customers.

After configuring an approved signing service, sign **all three** binaries (installer, packaged WinPilot.exe, and Native Messaging host), then fail closed:

```powershell
./scripts/verify-signatures.ps1 -Installer ./release/WinPilot-Setup-0.1.1-x64.exe -Application ./release/win-unpacked/WinPilot.exe -NativeHost ./release/win-unpacked/resources/native-host/WinPilotNativeHost.exe -PublisherThumbprint '<approved-certificate-thumbprint>'
```

The verifier requires valid signatures, the exact approved certificate, and timestamps. Run it on the final artifact; record the commit, SHA-256, certificate identity, and clean-machine test evidence. The thumbprint must come from the approved signing identity, not from the downloaded binary itself. This script does not configure signing or authorize publication.

CI now also silently installs into a disposable user directory, verifies a visible first launch and installed host ping, and checks uninstall cleanup. Its JSON evidence records installer SHA-256 and observed signature status; checksums prove identity, not publisher trust. Run the broader manual checklist on clean Windows hardware before beta.
