import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { RuntimeMonitor } from '../src/main/runtime-monitor';
import type { SecretCipher } from '../src/main/provider-vault';

const cipher: SecretCipher = { available: () => true, encrypt: value => Buffer.from(value).map(byte => byte ^ 7), decrypt: value => Buffer.from(value.map(byte => byte ^ 7)).toString() };

describe('RuntimeMonitor', () => {
  it('separates local and cloud token usage', async () => {
    const monitor = new RuntimeMonitor(await mkdtemp(path.join(tmpdir(), 'winpilot-runtime-')), cipher);
    await monitor.record({ taskLabel: 'private form', provider: 'local', model: 'phi', tier: 'on-device', inputTokens: 20, outputTokens: 5, latencyMs: 10, success: true });
    await monitor.record({ taskLabel: 'research', provider: 'openai', model: 'reasoning', tier: 'cloud-reasoning', inputTokens: 40, outputTokens: 10, latencyMs: 20, success: true });
    expect(await monitor.summary()).toMatchObject({ totalTokens: 75, localTokens: 25, cloudTokens: 50, estimatedCloudTokensSaved: 25 });
  });
});
