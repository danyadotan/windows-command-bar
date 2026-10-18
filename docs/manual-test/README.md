# Chrome ↔ Windows bridge acceptance

This is a local, manual acceptance fixture for the original requirement: connect a Chrome extension to Windows. It does not submit data, simulate the native host, or claim the integration passed.

## Existing evidence

- Baseline: `da6bf0eb178ccb92d75ad7455e10ac49ec39d416`, WinPilot 0.1.1.
- [Main Windows CI run 38541865401](https://github.com/danyadotan/windows-command-bar/actions/runs/38541865401) succeeded on 2026-10-14, after PR #16 merged. Its workflow includes installer lifecycle and installed-host ping checks. This is not evidence of a real browser retrieving profiles.
- `docs/RELEASE.md` and `docs/BETA.md` still apply: unsigned artifacts are internal-test-only; signing and clean-machine interactive acceptance remain unverified.

## Run on the internal Windows test machine

1. Record the installed desktop version and candidate commit. Install/open the desktop app and load the unpacked companion as described in `browser-extension/README.md`. Confirm extension ID `dbkcdkaciiebdadcnmbmeljjfalbobkh`; record any mismatch rather than weakening the allowlist.
2. From the repository root run `py -m http.server 8765 --bind 127.0.0.1 --directory docs/manual-test`. If Python is unavailable, serve this directory with an existing local HTTP server bound to loopback. Open `http://127.0.0.1:8765/bridge-form.html` in Chrome. The extension matches HTTP(S), so opening the file directly is not equivalent.
3. Create the **Bridge test** profile in the desktop app with the synthetic values printed on the page. Open the extension popup and select **Bridge test** from its native profile dropdown. Do not type a manual session profile: that would bypass the bridge under test. If the dropdown says not connected, record the blockage.
4. Verify that the four target fields are empty before the fill action. Click the extension's fill button, then **בדיקת התוצאה** on the page. Four fields should match; populated, read-only, disabled, password, file and hidden controls must remain unchanged. Click fill a second time; populated fields must remain unchanged. Do not submit a real website form.
5. Close all browser windows, reopen Chrome and revisit the fixture. Before selecting a native profile or saving a manual session profile, check that the previous session profile is not available for chip filling. Opening the extension popup can fetch native profiles again by design; that is distinct from retaining a browser session profile. Stop the local server with Ctrl+C when finished.

## Record the observation

| Evidence | Result |
| --- | --- |
| Test date, Windows and Chrome versions | Pending |
| Installed app version, candidate commit, extension ID | Pending |
| Native dropdown contains desktop-created Bridge test | Pending |
| Fields remain empty before explicit fill | Pending |
| First fill: four fields correct, six controls unchanged | Pending |
| Second fill leaves existing content unchanged | Pending |
| Browser restart clears session profile | Pending |
| Time from opening the page to first successful fill | Pending |
| Blocked step and time to recovery, if any | Pending |

Record pass/fail and a short error description, not real profile values, keys or personal screenshots. A page-level pass is only one part of acceptance; it cannot certify storage, transport security, signing, or arbitrary third-party forms.

## Requirement → implementation → observable outcome

| Requirement / decision | Implementation | Observable evidence |
| --- | --- | --- |
| User's original requirement: Chrome extension connects to Windows | Companion → Native Messaging host → encrypted desktop form store | A desktop-created synthetic profile appears in the browser's native dropdown and fills the fixture |
| Existing implementation: explicit fill and empty fields only | `browser-extension/content.js` | Empty before click; populated after click; existing value unchanged |
| Existing implementation: session-scoped browser profile | `browser-extension/popup.js`, `background.js` | Browser restart check above |

Only the first row's requirement is attributed to Danya's original request. The later decisions are present in source; their conversational origin has not been reconstructed.
