# Native host regression evidence

The Windows CI workflow pings `release/win-unpacked/WinPilot.exe`. The installer
smoke verifies both Chrome and Edge manifests point to the installed `WinPilot.exe`,
then pings that same target (not the bundled legacy C# host).

On a disposable Windows CI account with no existing WinPilot secure directory,
`seed-native-smoke.cjs` runs under Electron and uses the production
`FormAssistantStore` with real `safeStorage.encryptString`. It creates only the
fixed synthetic profile in `synthetic-native-profile.cjs`. A separate installed
WinPilot process receives a framed `get-form-data` request with Chrome launch
arguments. The check requires the exact profile and an empty snippet list; an
empty store, decryption error, legacy host failure or wrong response fails CI.
The fixture is removed in the install smoke's finally block. Existing secure
data or native registrations cause refusal before installation.

This retains visible first launch, installer payload checks, manifest/origin
checks and uninstaller cleanup. Existing NSIS upgrade handling is unchanged;
this script does not claim to exercise an upgrade from an older release.

## Evidence boundary

Passing this smoke demonstrates direct stdio communication with the packaged
and installed executable on Windows. It does **not** demonstrate Chrome invoking
that executable, browser permission handling, or filling a real page. Popup and
content-script tests use simulated Chrome/DOM APIs.

## Real Chrome check (disposable Windows account, synthetic data only)

1. Install the CI artifact and open WinPilot. Save the synthetic profile shown in
   `scripts/synthetic-native-profile.cjs` through the profile form.
2. Load the staged extension in Chrome. Open an HTTPS test form or a loopback
   fixture with empty name/email fields. Do not use personal profiles or sites.
3. Click Load from Windows, approve optional nativeMessaging permission, select
   CI Synthetic Profile and confirm the displayed name and email.
4. Click Fill: matching empty fields should fill, existing fields should stay
   unchanged, and no form should submit.
5. Check Save for session, snippet insertion into a focused empty text field,
   reminder creation and opening its URL, and Clear session. Clear should empty
   popup/session data without deleting the Windows profile.
6. Check a denied permission, no profiles, a protected Chrome page and a remote
   HTTP page: show the expected refusal/fallback without exposing profile data.
7. Record Windows/Chrome version, artifact SHA/commit, each action/result and any
   errors. Uninstall and confirm native registrations are removed. Separately
   test an older-to-newer installer upgrade, preserving a synthetic profile.

Do not report this checklist as passed until performed in a real browser.
