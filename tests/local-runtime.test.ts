import { afterEach, describe, expect, it } from 'vitest';
import { LocalRuntime } from '../src/main/local-runtime';

afterEach(() => {
  delete process.env.WINPILOT_LOCAL_AI_ENDPOINT;
  delete process.env.WINPILOT_LOCAL_AI_MODEL;
  delete process.env.WINPILOT_LOCAL_AI_TRANSPORT;
});

describe('LocalRuntime', () => {
  it('accepts a configured loopback runtime', () => {
    process.env.WINPILOT_LOCAL_AI_ENDPOINT = 'http://127.0.0.1:5272/v1';
    process.env.WINPILOT_LOCAL_AI_MODEL = 'phi-local';
    expect(new LocalRuntime().status()).toMatchObject({ configured: true, endpoint: 'http://127.0.0.1:5272/v1', model: 'phi-local' });
  });

  it('rejects a remote endpoint posing as local', () => {
    process.env.WINPILOT_LOCAL_AI_ENDPOINT = 'https://example.com/v1';
    process.env.WINPILOT_LOCAL_AI_MODEL = 'phi-local';
    expect(new LocalRuntime().status().configured).toBe(false);
  });
});
