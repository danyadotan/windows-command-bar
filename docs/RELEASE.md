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
