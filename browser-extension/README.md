# WinPilot Form Assistant extension

Manifest V3, Hebrew popup, user-activated form assistance. This source is an internal test candidate, not a reviewed Chrome Web Store release. See [store readiness](../docs/CHROME-WEB-STORE.md) for the audit, submission copy, permissions, privacy declarations and release gates.

## Install for internal testing

1. Open `chrome://extensions` (or `edge://extensions`), enable **Developer mode**.
2. Load unpacked from this directory or the extracted CI extension artifact.
3. Pin **WinPilot Form Assistant**. Open an HTTPS form or a synthetic form served on HTTP loopback (`http://127.0.0.1:8765`). Browser-protected pages and cross-origin frames are unsupported.
4. Open the popup and enter a temporary profile. Saving is optional and lasts only for the current browser session. Click **Fill empty fields** to act on the active page. There is no automatic page chip or scanning across websites.
5. For native testing, install the internal WinPilot Windows build. Read the popup disclosure, click **Approve and load profiles from Windows**, grant optional Native Messaging permission, choose a profile, then click Fill. Opening the popup alone does not read native profiles. The host returns all desktop profiles and snippets; the popup displays profiles only. Unavailable host or denied permission leaves manual session profiles available.
6. Select an empty text field before opening the popup to insert a temporary snippet. Password, hidden, file, disabled, read-only, non-text and non-rendered fields are excluded. Existing values are not overwritten. No form is submitted by the extension, but sites can react to input/change events immediately.

## Data boundaries

No extension analytics, remote executable code, cloud AI calls or developer-server uploads. Filling exposes the inserted data to the active website. Production filling is HTTPS only; plain HTTP is restricted to loopback fixtures. Session storage holds manually saved profiles, temporary snippets and requested reminder URLs/titles. Native profiles stay in popup memory unless explicitly saved for the session. Never use real credentials or sensitive profiles in testing.

Reminders reopen the selected URL after a notification click; they do not save form entries. They are session-only and do not survive the browser session ending. Background Chrome processes can keep a session alive after closing a window. Use the popup clear button to remove session data, pending reminders and extension notifications. Desktop encrypted profiles are not removed. The packaged [privacy notice](privacy.html) explains retention, deletion, native data and third-party websites.

## Validation / packaging

Run `npm run check:extension`, `npm test` and `npm run build` from the repository root. `node scripts/check-extension.cjs --stage` writes only runtime files to `release/extension`; CI zips that directory with `manifest.json` at the ZIP root. PNG icons derive from the existing SVG artwork. README/source SVG and test fixtures are not needed in the runtime package.

The public development key derives ID `dbkcdkaciiebdadcnmbmeljjfalbobkh`. It is not proof of a store-assigned ID. The Windows C# host, generated/static host manifests, TypeScript allowlist and native smoke script must all agree with the actual store item ID before release. Never replace exact allowlists with wildcards. Run `node scripts/check-extension.cjs --expected-id STORE_ITEM_ID` once that identity is available through an approved dashboard step.

PR #17 adds a separate synthetic acceptance fixture and guide. When using it with this branch, explicitly press the Windows-load button before choosing a profile; use the popup Fill button (there is no page chip). No result from #17 is assumed passed here.
