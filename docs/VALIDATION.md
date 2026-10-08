# Capability validation

Validated on 2026-10-08 against primary documentation and automated tests.

## Confirmed by current implementation

- Electron renderer isolation (`contextIsolation: true`, `nodeIntegration: false`, sandboxed preload) and a restrictive Content Security Policy.
- Personal form data, provider keys, and activity memory are encrypted through Electron `safeStorage` before being written.
- Private-data detection places work on `privacy-hold` when no local runtime is configured; there is no silent cloud fallback.
- Local runtime URLs are accepted only on `localhost`, `127.0.0.1`, or `::1`; redirects are blocked and requests time out after 45 seconds.
- OpenAI, Anthropic, Z.ai, and the local adapter record provider-returned usage. The local adapter estimates tokens only when the runtime omits usage.
- Cloud routing changes the model sent to each provider: a lower-latency model for fast work and a stronger reasoning model for complex work. Every default can be overridden without a code change.
- Windows Update scans, exact-package winget installs, and Downloads file moves are implemented behind scoped previews and explicit approval boundaries. Update installation and restart remain out of scope.
- The optional browser companion detects a narrow allowlist of form-field types locally, fills empty fields only after a click, excludes password/hidden/file fields, and stores sensitive fill data in session memory rather than persistent extension storage.

## External facts checked

- [Microsoft Foundry Local](https://learn.microsoft.com/en-us/azure/foundry-local/what-is-foundry-local) supports OpenAI-compatible request/response formats and Windows.
- [Foundry Local JavaScript setup](https://learn.microsoft.com/en-us/azure/foundry-local/get-started?pivots=programming-language-javascript&tabs=windows) documents the Windows/WinML package and local SDK flow. The endpoint is discovered/configured by the runtime; WinPilot does not assume a fixed port.
- [MCP transports](https://modelcontextprotocol.io/specification/2025-06-18/basic/transports) distinguish local stdio from Streamable HTTP. WinPilot can call an OpenAI-compatible loopback bridge, but does not yet implement a native MCP handshake.
- [OpenAI's model catalog](https://developers.openai.com/api/docs/models) recommends GPT-6 Astra for complex reasoning and GPT-6 Luna for cost-sensitive, high-volume work.
- [Anthropic's model overview](https://platform.claude.com/docs/en/about-claude/models/overview) identifies Claude Fable 5.1 for demanding reasoning and Claude Haiku 5.5 for latency-sensitive workloads.
- [Z.ai's GLM-5.3 documentation](https://docs.z.ai/guides/llm/glm-5.3) and [GLM-5.3-Flash documentation](https://docs.z.ai/guides/vlm/glm-5.3-flash) distinguish the flagship and lower-compute variants.
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

The suite covers action approval boundaries, encrypted-at-rest storage, URL protocol checks, private-data routing, local generation and loopback enforcement, redirect blocking, and local/cloud token accounting. GitHub Actions repeats the suite and packages the NSIS installer on `windows-latest`.

## Known gaps before production

1. Install and exercise a real Foundry Local runtime on Windows hardware (CPU/GPU/NPU), recording model download consent, latency, memory, and power use.
2. Implement a full MCP client with capability negotiation and tool-level allowlists.
3. Add Authenticode signing and verify update integrity before public distribution.
4. Pair the browser extension with the encrypted Electron profile through an authenticated native-messaging bridge before offering cross-app profile sync.
5. Publish the extension through the Microsoft Edge Add-ons review process before presenting it as a production installation.
6. Execute an online dependency audit in CI; the current managed workspace blocked npm's advisory endpoint.
