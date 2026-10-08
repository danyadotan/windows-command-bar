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

  it('sends text to the configured local chat-completions endpoint', async () => {
    process.env.WINPILOT_LOCAL_AI_ENDPOINT = 'http://127.0.0.1:5272/v1';
    process.env.WINPILOT_LOCAL_AI_MODEL = 'phi-local';
    let requestUrl = '';
    let requestBody = '';
    const runtime = new LocalRuntime(async (input, init) => {
      requestUrl = String(input);
      requestBody = String(init?.body);
      return new Response(JSON.stringify({ model: 'phi-local', choices: [{ message: { content: 'תשובה מקומית' } }], usage: { prompt_tokens: 4, completion_tokens: 3 } }), { status: 200 });
    });
    await expect(runtime.generate('שלום')).resolves.toEqual({ text: 'תשובה מקומית', model: 'phi-local', inputTokens: 4, outputTokens: 3 });
    expect(requestUrl).toBe('http://127.0.0.1:5272/v1/chat/completions');
    expect(JSON.parse(requestBody)).toMatchObject({ model: 'phi-local', messages: [{ role: 'user', content: 'שלום' }] });
  });

  it('does not follow redirects from the loopback runtime', async () => {
    process.env.WINPILOT_LOCAL_AI_ENDPOINT = 'http://localhost:5272/v1';
    process.env.WINPILOT_LOCAL_AI_MODEL = 'phi-local';
    const runtime = new LocalRuntime(async (_input, init) => {
      expect(init?.redirect).toBe('error');
      return new Response('', { status: 500 });
    });
    await expect(runtime.generate('שלום')).rejects.toThrow('runtime המקומי החזיר שגיאה (500)');
  });

  it('rejects endpoints containing embedded credentials', () => {
    process.env.WINPILOT_LOCAL_AI_ENDPOINT = 'http://user:secret@127.0.0.1:5272/v1';
    process.env.WINPILOT_LOCAL_AI_MODEL = 'phi-local';
    expect(new LocalRuntime().status().configured).toBe(false);
  });
});
