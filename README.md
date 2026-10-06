# WinPilot Command Bar

MVP for a Windows command bar that combines AI text assistance with safe local automation.

## What is implemented

- Floating Electron command bar (`Alt+Space`)
- Hebrew-first RTL interface
- Provider selector for OpenAI, Anthropic, Z.ai and Devin
- Local intent planner for Windows Update, file organization and app installation
- Risk labels and explicit approval boundaries; this version does **not** execute system commands
- Context-isolated renderer with a narrow IPC bridge
- Local memory library for links, notes, inspiration and screenshots copied to the clipboard
- Automatic local collections and tags, plus library search
- Encrypted credential vault and connection status for OpenAI, Anthropic, Z.ai and Devin
- Live OpenAI Responses, Anthropic Messages, and Z.ai GLM adapters with provider-reported token usage
- Encrypted form profiles, reusable text/search/signature snippets, and unfinished-form reminders with safe return links
- Privacy-aware model routing, local/cloud token accounting, and encrypted searchable activity memory
- Windows Helper for read-only Update scans, safe winget search, and explicitly confirmed exact-package installs

The on-device runtime is represented by a narrow adapter boundary and currently uses the built-in deterministic planner. Connecting Microsoft Foundry Local, Windows AI APIs, or a specific MCP server requires installing and configuring that runtime; the app does not silently fall back to uploading private content.

Configure a local OpenAI-compatible SDK or MCP bridge when starting the app:

```powershell
$env:WINPILOT_LOCAL_AI_ENDPOINT = "http://127.0.0.1:5272/v1"
$env:WINPILOT_LOCAL_AI_MODEL = "your-installed-local-model"
$env:WINPILOT_LOCAL_AI_TRANSPORT = "mcp" # optional; defaults to Microsoft local SDK
npm start
```

Only loopback endpoints are accepted. If private data is detected while no local runtime is configured, WinPilot places the task on privacy hold instead of sending it to a cloud provider.

See [the capability validation report](docs/VALIDATION.md) for evidence, primary sources, and production gaps.

Windows Helper never invokes a shell: executable names and argument arrays are fixed separately. App installation accepts only a strict package ID, adds `--exact`, and requires a second confirmation click. Update scanning uses the built-in Windows Update COM searcher and does not install or reboot.

OpenAI requests set `store: false`. Override default text models with `WINPILOT_OPENAI_MODEL`, `WINPILOT_ANTHROPIC_MODEL`, and `WINPILOT_ZAI_MODEL`. Devin uses API v3 organization sessions and requires a second, explicit confirmation before session creation because it can consume paid agent capacity.

## Run

```bash
npm install
npm run build
npm start
```

Saved content lives under Electron's per-user application-data directory and is not sent to an AI provider. The first release deliberately stops at previewing plans. The next milestone is a signed Windows helper that executes allow-listed PowerShell/winget actions only after explicit approval, plus encrypted API-key storage using Windows Credential Manager.
