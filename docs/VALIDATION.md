# Capability validation

Validated on 2026-10-06 against primary documentation and automated tests.

## Confirmed by current implementation

- Electron renderer isolation (`contextIsolation: true`, `nodeIntegration: false`, sandboxed preload) and a restrictive Content Security Policy.
- Personal form data, provider keys, and activity memory are encrypted through Electron `safeStorage` before being written.
- Private-data detection places work on `privacy-hold` when no local runtime is configured; there is no silent cloud fallback.
- Local runtime URLs are accepted only on `localhost`, `127.0.0.1`, or `::1`.
- Token counts before inference are estimates, not provider billing totals. Actual provider usage must replace estimates when adapters are connected.
- System changes remain preview-only; Windows Update, file moves, and winget installation are not executed by this milestone.

## External facts checked

- [Microsoft Foundry Local](https://learn.microsoft.com/en-us/azure/foundry-local/what-is-foundry-local) supports OpenAI-compatible request/response formats and Windows.
- [Foundry Local JavaScript setup](https://learn.microsoft.com/en-us/azure/foundry-local/get-started?pivots=programming-language-javascript&tabs=windows) documents the Windows/WinML package and local SDK flow. The endpoint is discovered/configured by the runtime; WinPilot does not assume a fixed port.
- [MCP transports](https://modelcontextprotocol.io/specification/2025-06-18/basic/transports) distinguish local stdio from Streamable HTTP. WinPilot's current environment-variable boundary is configuration scaffolding, not a complete MCP client handshake.
- [Electron context isolation](https://www.electronjs.org/docs/latest/tutorial/context-isolation) recommends a narrow `contextBridge`; isolation alone does not make arbitrary IPC safe.
- [Electron safeStorage](https://www.electronjs.org/docs/latest/api/safe-storage) uses operating-system cryptography, with platform-specific security semantics.
- [Electron security guidance](https://www.electronjs.org/docs/latest/tutorial/security) recommends isolation, no Node integration for renderer content, validation of IPC senders, and a restrictive CSP.

## Test evidence

Run:

```bash
npm ci
npm test
npm run build
```

The suite covers action approval boundaries, encrypted-at-rest storage, URL protocol checks, private-data routing, local runtime loopback enforcement, and local/cloud token accounting. GitHub Actions repeats the suite on `windows-latest`.

## Known gaps before production

1. Install and exercise a real Foundry Local runtime on Windows hardware (CPU/GPU/NPU), recording model download consent, latency, memory, and power use.
2. Implement provider adapters and use their returned usage fields for exact token accounting.
3. Implement a full MCP client with capability negotiation and tool-level allowlists.
4. Add signed Windows packaging and verify update integrity.
5. Add a companion browser extension before claiming automatic form-field detection.
6. Execute an online dependency audit in CI; the current managed workspace blocked npm's advisory endpoint.
