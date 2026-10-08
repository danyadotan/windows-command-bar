# WinPilot Command Bar

MVP for a Windows command bar that combines AI text assistance with safe local automation.

## What is implemented

- Floating Electron command bar (`Alt+Space`)
- Hebrew-first RTL interface
- Provider selector for OpenAI, Anthropic, Z.ai and Devin
- Local intent planner for Windows Update, file organization and app installation
- Risk labels and explicit approval boundaries for the small allow-listed set of supported system actions
- Context-isolated renderer with a narrow IPC bridge
- Local memory library for links, notes, inspiration and screenshots copied to the clipboard
- Automatic local collections and tags, plus library search
- Encrypted credential vault and connection status for OpenAI, Anthropic, Z.ai and Devin
- Live OpenAI Responses, Anthropic Messages, and Z.ai GLM adapters with provider-reported token usage
- Encrypted form profiles, reusable text/search/signature snippets, and unfinished-form reminders with safe return links
- Privacy-aware model routing, local/cloud token accounting, and encrypted searchable activity memory
- Windows Helper for read-only Update scans, safe winget search, and explicitly confirmed exact-package installs
- Downloads organizer with a 15-minute preview plan, change detection, collision protection, encrypted action journal, and explicit undo

The on-device path uses the built-in deterministic planner for supported Windows actions and an OpenAI-compatible loopback adapter for local text generation. Connecting Microsoft Foundry Local or an MCP-to-OpenAI-compatible bridge requires installing and configuring that runtime; the app does not silently fall back to uploading private content.

Configure a local OpenAI-compatible SDK or MCP bridge when starting the app:

```powershell
$env:WINPILOT_LOCAL_AI_ENDPOINT = "http://127.0.0.1:5272/v1"
$env:WINPILOT_LOCAL_AI_MODEL = "your-installed-local-model"
$env:WINPILOT_LOCAL_AI_TRANSPORT = "mcp" # optional; defaults to Microsoft local SDK
npm start
```

Only loopback endpoints are accepted, redirects are blocked, and local generation times out after 45 seconds. If private data is detected while no local runtime is configured—or if local generation fails—WinPilot keeps the task local and reports the error instead of falling back to a cloud provider.

See [the capability validation report](docs/VALIDATION.md) for evidence, primary sources, and production gaps.

Windows Helper never invokes a shell: executable names and argument arrays are fixed separately. App installation accepts only a strict package ID, adds `--exact`, and requires a second confirmation click. Update scanning uses the built-in Windows Update COM searcher and does not install or reboot.

OpenAI requests set `store: false`. Override default text models with `WINPILOT_OPENAI_MODEL`, `WINPILOT_ANTHROPIC_MODEL`, and `WINPILOT_ZAI_MODEL`. Devin uses API v3 organization sessions and requires a second, explicit confirmation before session creation because it can consume paid agent capacity.

## Run

```bash
npm install
npm run build
npm start
```

## Build the Windows installer

```bash
npm run package:win
```

The NSIS installer is written to `release/`. Pull requests also publish it as the `WinPilot-Windows-unsigned` GitHub Actions artifact. It is suitable for internal testing only until an Authenticode certificate is configured; see [the release guide](docs/RELEASE.md).

Saved content lives under Electron's per-user application-data directory and is not sent to an AI provider. Supported changes remain narrowly allow-listed and require explicit confirmation; Windows may display a separate elevation prompt when winget or an installer requires it.
