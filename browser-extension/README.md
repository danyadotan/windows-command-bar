# WinPilot Form Assistant extension

This unpacked Manifest V3 companion extension runs in Microsoft Edge or Google Chrome. It detects likely full-name, personal/work email, phone, signature, and search fields without reading or uploading their values.

## Install for testing

1. Open `edge://extensions` or `chrome://extensions`.
2. Enable **Developer mode**.
3. Download and extract the `WinPilot-Browser-Extension` GitHub Actions artifact, or use this source directory.
4. Choose **Load unpacked** and select the extracted directory containing `manifest.json`.
5. Pin **WinPilot Form Assistant** to the toolbar.

Enter a profile in the popup and save it for the current browser session. A WinPilot chip appears only on pages with recognized fields. Filling requires an explicit click and affects empty fields only. Password, hidden, file, disabled, and read-only fields are never filled.

After installing and opening the packaged WinPilot desktop app once, the popup can also load its encrypted profiles on demand through the browser's Native Messaging protocol. The host registration is per-user for Edge and Chrome and is restricted to this extension's fixed ID. Native data is returned only to memory and is not copied into persistent browser storage.

The profile and temporary snippet use `chrome.storage.session`, so they are removed when the browser exits. Form reminders persist only the validated HTTP(S) URL and page title in `chrome.storage.local`; clicking the notification returns directly to that page.

## Current integration boundary

The bridge is intentionally read-only and exposes only profiles and snippets. Draft URLs remain inside the desktop app. If the native host is unavailable, the extension falls back to session-only manual profiles.
