# WinPilot Chrome Web Store preparation

Assessment: October 18, 2026. Baseline: main `da6bf0eb178ccb92d75ad7455e10ac49ec39d416`; proposed extension version 0.1.1. Scope: browser extension and read-only Windows profile bridge, not the desktop AI product as a whole. PR #17 remains a separate draft containing an acceptance fixture; it does not document a successful browser-to-Windows run. No dashboard, store submission, public distribution or account/payment action is authorized by this change.

## Readiness is three separate claims

| Layer | Evidence / status | Required next evidence |
| --- | --- | --- |
| Extension code/package | MV3; narrower permissions; explicit native loading; session retention; sender guards; PNGs and package checks; automated tests below | Review this PR and Windows CI for its exact commit |
| Local functional/security acceptance | **Pending**, not established by mocked API tests, a TypeScript build or native ping | Actual Chrome on Windows, synthetic profile retrieval and correct empty-field filling; negative/security cases below |
| Store submission/public release | **Blocked** | All acceptance gates; store identity reconciliation; public privacy/support URLs; truthful store materials; approved signed Windows delivery and reviewer access; explicit Danya approval before submission and again before public distribution as applicable |

## Audit and implemented changes

| Baseline finding | Change / rationale |
| --- | --- |
| Required HTTP/HTTPS access to every site; automatic scripts on every matching page | Removed `host_permissions` and static `content_scripts`. `activeTab` + `scripting` inject packaged scripts only when Fill/Insert is clicked. Removed page chip and its first-native-profile fallback. This deliberately changes the interaction to a toolbar popup. |
| `tabs` permission | Removed. Active-tab temporary access provides URL/title for a user-requested reminder. Opening a notification target with `tabs.create` does not require the broad `tabs` permission. |
| Required `nativeMessaging`; popup and page chip could request data without a separate load action | Optional permission, requested by a labeled Windows-load button after disclosure. Background accepts native/reminder/clear requests only from the packaged popup, not content scripts. No automatic native load on popup open. |
| `storage`, `alarms`, `notifications` | Retained for actual session state and the existing 15-minute form reminder feature. No unrelated permissions added. These features remain part of one form-completion purpose. |
| Reminder URL/title persisted in `storage.local` | Moved to memory-backed `storage.session`, with explicit clear control and upgrade cleanup of legacy reminder storage. Session-only reminders are an intentional behavior change. |
| Fill could expose profile information to a website | Prominent pre-action warning: sites can read/transmit values immediately through emitted events. Fill/Insert require HTTPS except HTTP loopback test fixtures; protected pages and cross-origin frames unsupported. |
| Snippet insertion did not exclude all unsafe non-text controls | Text-control allowlist plus writable/rendered-field checks; never overwrite existing values. |
| No manifest PNG icon; SVG used for notifications | Added 16/32/48/128 PNG derivatives from existing SVG with transparent padding; PNG notification icon. |
| CI zipped the entire source folder without a dedicated extension gate | Runtime-only staging and checks of syntax, resources, PNG dimensions and cross-component ID agreement. No submission automation. |

## Native Messaging and extension identity

`io.dynamicbridge.winpilot` uses stdio with length-prefixed UTF-8 JSON. Chrome launches a separate host process. Windows registration is per-user under Chrome and Edge NativeMessagingHosts registry keys; installer manifest references `WinPilotNativeHost.exe`. C# validates the exact calling extension origin, caps frames at 1 MiB, supports ping and read-only `get-form-data`, decrypts `%APPDATA%\WinPilot\secure\form-assistant.enc` using current-user DPAPI, and returns profiles/snippets, excluding desktop draft links. The extension does not execute Windows commands or expose desktop AI providers through this protocol.

The host returns **all** profiles and snippets on a load request; snippets are currently unused by the popup. This is disclosed, not represented as selection-scoped retrieval. A future version can narrow the protocol further. Native origin validation is not a defense against malicious code already running as the same Windows user; do not claim it is.

Current public manifest key mathematically derives `dbkcdkaciiebdadcnmbmeljjfalbobkh`, matching source allowlists. A development `key` does **not** establish ownership of the same Chrome Web Store item ID. Do not remove it casually or promise the local ID will be retained by the store.

After explicit approval for a dashboard-only upload (not performed here), retrieve the item's assigned ID and public key, as described in Chrome's key documentation. Confirm unpacked and store item IDs match. If different, update the manifest key, `src/main/native-messaging.ts`, `native-host/WinPilotNativeHost.cs`, `native-host/io.dynamicbridge.winpilot.json`, `scripts/native-host-smoke.cjs`, associated tests/docs and any installer-generated origin lists. Rebuild the host and installer, sign the final binaries, reinstall/upgrade, then retest both profile retrieval and denial of the old/unapproved origin. Edge store identity is separate and unverified. Never add wildcard or arbitrary caller allowlists. Use `node scripts/check-extension.cjs --expected-id ACTUAL_STORE_ID` to catch mismatches.

The Chrome Web Store does not install the Windows companion. Provide reviewers with an approved, accessible signed companion build plus exact setup/uninstall steps and synthetic profile data. Do not use an unsigned internal artifact as a customer download. A ping only proves framing/launch, not DPAPI compatibility, profile decoding, browser permission behavior or form filling.

## Submission copy (draft, based on this branch)

**Name:** WinPilot Form Assistant

**Short description:** Click to fill empty form fields, insert reusable text, and set session-only reminders. Optional local Windows profile bridge.

**Single purpose:** Help users complete web forms using explicitly selected profile details, reusable text and a reminder to return to a form.

**Listing body:**

WinPilot Form Assistant helps you fill empty name, personal/work email, phone and signature fields from a temporary profile you enter. Open the extension on the page, review the details and click Fill. Insert reusable text into a selected empty text field, or request a 15-minute reminder to return to the page during the same browser session.

The optional Windows connection loads profiles from the separately installed WinPilot desktop companion on this computer. It requires your approval and Native Messaging permission. Manual temporary profiles work without the Windows companion. The interface is currently Hebrew.

The extension has no analytics, advertising or cloud AI calls. Profiles and snippets saved in the extension and requested reminder URLs/titles stay in browser session memory. Clearing the session removes them; session reminders do not survive browser-session restart. Filling exposes inserted details to the website, which may read or send them before you submit the form. Only fill sites you trust.

Supported: top-level HTTPS forms and HTTP loopback test pages. Not supported: protected browser pages, embedded cross-origin forms, passwords, file uploads or automatic submission. The extension does not restore unsaved form entries. The Windows bridge requires a separately installed compatible Windows companion; no macOS/Linux native bridge is supplied.

**Suggested category:** Workflow & Planning, if available in the live dashboard. Verify the available category and the account's developer/support identity before submission. Do not claim Chrome approval, universal site compatibility, end-to-end encryption, automatic recovery, or a completed Windows test.

## Privacy dashboard draft

Local-only handling still requires disclosure. The packaged `browser-extension/privacy.html` is a concrete policy draft and is linked in the popup; it must be hosted at a stable publicly readable URL and entered in the dashboard before submission. Packaged HTML alone is not that public URL. Review the final form definitions against this exact candidate; do not select “no user data” simply because there is no developer-server upload.

| Data / field | Truthful declaration and purpose |
| --- | --- |
| Personally identifiable information | Name, personal/work email, phone and signature from manual entry or the local native profile store, used for user-requested form filling. No developer-server upload. |
| Website content | Field descriptors for matching; empty/nonempty checks; user-entered reusable text; selected page title for a requested reminder. Arbitrary snippets/native snippets can contain personal communications or sensitive data; do not instruct users to put credentials, health or financial records in them. The extension does not actively extract those categories from sites. |
| Web history / browsing activity | Only the full URL and title of a page explicitly selected for a reminder, not continuous browsing history. Retained in memory until notification click, clear or session end. |
| Authentication, health, financial/payment, location and personal communications categories | No dedicated extraction or use for these purposes. Before certification, account for arbitrary user-entered signature/snippet content under the live form's definitions; disclose any applicable category rather than falsely asserting such content is impossible. No credential fields are filled. |
| Remote code | No. Runtime JavaScript is bundled; no fetched code, eval or remote executable dependency in the extension. Desktop AI calls are not part of the extension. |
| Sale, unrelated use, creditworthiness | Code contains no such data flows. Proposed certifications: no sale/transfer outside allowed uses; no use unrelated to the stated purpose; no creditworthiness/lending use. Publisher must approve truthful final certification. |
| Limited Use | Policy draft includes the Chrome Web Store User Data Policy / Limited Use statement. Keep dashboard, listing, visible disclosure and hosted policy consistent. |

Permission justifications to paste:

- `activeTab`: Temporary access to the active page only after the user opens the extension, enabling chosen form actions and reminder URL/title retrieval.
- `scripting`: Inject bundled field detection and fill/insert handlers in the active top-level page when requested; no persistent host access.
- `storage`: Keep explicitly saved profiles, reusable text and reminders in session memory; remove reminder records from older versions' local storage on update.
- `alarms`: Schedule a user-requested 15-minute reminder to return to a form in the current browser session.
- `notifications`: Display that reminder and reopen its stored URL when the user clicks it. The page title may appear in OS notifications.
- Optional `nativeMessaging`: On a separate approved load action, read local encrypted WinPilot profiles/snippets via the restricted Windows companion. Manual use works without this permission.

## Materials and account gaps

| Item | State |
| --- | --- |
| MV3 runtime ZIP with manifest at root | CI stages runtime-only files; source gate passed locally. ZIP still requires loading in real Chrome. |
| 128 PNG package icon and toolbar sizes | Added from existing artwork; final visual review in Chrome remains pending. |
| At least one genuine screenshot, 1280×800 or 640×400 | Missing. Capture actual tested popup and synthetic form, not a mock represented as working evidence. |
| Small promotional image, 440×280 | Missing. Optional marquee is 1400×560. |
| Description, single purpose, permission justifications | Drafted above; no dashboard entry performed. |
| Public privacy policy and support/homepage URLs | Not configured/verified. Contact draft uses existing project email `danya@dynamicbridge.io`; inbox handling not tested. |
| Reviewer instructions and Windows companion delivery | Test steps below; approved signed download URL/build identity still missing. |
| Developer account, registration fee if needed, 2-step verification, verified contact/trader disclosures if applicable | Account state not inspected. No signup, fee, identity verification or legal declaration made. |
| Store ID, distribution/visibility and release control | Unverified. Do not assume a prior submission is absent, or create duplicate items without checking the dashboard after approval. |

## Acceptance record: all Pending until observed on the exact candidate

Use PR #17's `docs/manual-test/bridge-form.html` and `docs/manual-test/README.md` when available; those are a separate PR, not copied or treated as merged here. Serve locally with its instructions. For this branch explicitly click **Approve and load profiles from Windows**, choose the synthetic profile and press the popup Fill button. There is no automatic page chip.

Record commit, extension/host/installer versions, SHA-256s, browser version, Windows build, extension ID, permission state, date, tester and actual outcomes. Do not put real profile data or API keys in logs/screenshots.

1. Clean standard-user install and native registration. Load unpacked candidate, verify exact ID. Host absent, denied permission, wrong origin, malformed/truncated/oversized messages fail safely; no native access on popup open or page load. Test packaged C# host as well as TS helpers.
2. Create a synthetic desktop profile. Retrieve that exact profile through real Chrome, choose it and fill the fixture. Confirm expected empty fields fill and populated/password/hidden/file/disabled/read-only/invisible controls remain unchanged. Manual fallback is a separate result, never proof of the native bridge.
3. Verify site input/change events, top-frame limit, dynamic forms, snippet focus before first injection, repeated clicks (no duplicate listener), no overwrites, restricted Chrome pages and remote HTTP rejection. Loopback HTTP is for synthetic testing only.
4. Confirm no extension code runs on unrelated unactivated websites. Denied/revoked native permission must not disclose profiles. Content-script attempts to invoke native loading must fail. Inspect extension traffic and all storage areas: no developer upload, no persistent profile/reminder data; desktop AI traffic is separate.
5. Request reminder; observe 15-minute notification and URL reopening, deletion on click and explicit clear. Clear while a reminder is pending. Restart the browser fully, including background processes: session data/reminders disappear. Check extension disable/update/reload and upgrade from the older locally stored reminder version.
6. Validate actual store-assigned identity with the signed companion, clean-machine install/upgrade/uninstall, DPAPI retrieval and rollback. Native registry cleanup, Windows signature trust, security software and Chrome UI must be observed; CI cannot substitute for this.

First supported action: finish and record the synthetic Chrome↔Windows acceptance on a Windows test machine. No submission/public release until failures are resolved and Danya approves the concrete candidate.

## Verification performed for this change

Locally on Linux: 59 tests passed (48 existing + 11 extension security/activation tests), TypeScript/Vite build passed, extension source/package gate and JS syntax checks passed; dependency audit reported zero vulnerabilities at inspection. New tests execute scripts with simulated Chrome/DOM boundaries: least privilege, ID consistency, native permission denial, rejected senders, URL validation, reminder deletion/clear/migration, protected fields, on-demand injection, HTTPS gating and no automatic native reads. These are **not** Chrome/Windows acceptance. Windows CI, real 15-minute notifications, native retrieval, visual popup review and signatures remain separate pending evidence.

## Official references checked October 18, 2026

- [Program policies: privacy, limited use, least permissions, MV3 and account verification](https://developer.chrome.com/docs/webstore/program-policies/policies)
- [User Data FAQ: local handling must be disclosed; local native transport exception](https://developer.chrome.com/docs/webstore/program-policies/user-data-faq)
- [Privacy dashboard fields](https://developer.chrome.com/docs/webstore/cws-dashboard-privacy/)
- [activeTab temporary access](https://developer.chrome.com/docs/extensions/develop/concepts/activeTab)
- [Permission declarations](https://developer.chrome.com/docs/extensions/develop/concepts/declare-permissions)
- [Native Messaging framing, origins and Windows registration](https://developer.chrome.com/docs/extensions/develop/concepts/native-messaging)
- [Public key and store/development ID alignment](https://developer.chrome.com/docs/extensions/reference/manifest/key)
- [Preparing the ZIP](https://developer.chrome.com/docs/webstore/prepare)
- [Required icons, promotional image and screenshots](https://developer.chrome.com/docs/webstore/images)
- [Accurate listing requirements](https://developer.chrome.com/docs/webstore/program-policies/listing-requirements/)

Policy compliance is assessed from current official guidance, not guaranteed by a passing code gate. Recheck the dashboard and policy changes before an approved submission.
