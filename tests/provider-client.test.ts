import { describe, expect, it, vi } from 'vitest';
import { ProviderGateway } from '../src/main/provider-client';

describe('ProviderGateway', () => {
  it('uses OpenAI Responses with storage disabled and exact usage', async () => {
    const request = vi.fn(async () => new Response(JSON.stringify({ model: 'gpt-test', output: [{ content: [{ type: 'output_text', text: 'שלום' }] }], usage: { input_tokens: 11, output_tokens: 4 } }), { status: 200 }));
    const result = await new ProviderGateway(request as typeof fetch).generate('openai', 'secret-key', 'hello');
    expect(result).toMatchObject({ text: 'שלום', inputTokens: 11, outputTokens: 4 });
    expect(JSON.parse(String(request.mock.calls[0][1]?.body))).toMatchObject({ store: false, input: 'hello' });
    expect((request.mock.calls[0][1]?.headers as Record<string, string>).authorization).toBe('Bearer secret-key');
  });

  it('uses Anthropic Messages and reports usage', async () => {
    const request = vi.fn(async () => new Response(JSON.stringify({ model: 'claude-test', content: [{ type: 'text', text: 'ready' }], usage: { input_tokens: 8, output_tokens: 2 } }), { status: 200 }));
    const result = await new ProviderGateway(request as typeof fetch).generate('anthropic', 'anthropic-key', 'hello');
    expect(result).toMatchObject({ text: 'ready', model: 'claude-test', inputTokens: 8, outputTokens: 2 });
    expect((request.mock.calls[0][1]?.headers as Record<string, string>)['x-api-key']).toBe('anthropic-key');
  });

  it('does not leak keys in normalized errors', async () => {
    const request = vi.fn(async () => new Response(JSON.stringify({ error: { message: 'invalid key' } }), { status: 401 }));
    await expect(new ProviderGateway(request as typeof fetch).generate('openai', 'super-secret', 'hello')).rejects.toThrow('מפתח API');
  });

  it('uses the documented Z.ai chat completions endpoint', async () => {
    const request = vi.fn(async () => new Response(JSON.stringify({ model: 'glm-test', choices: [{ message: { content: 'בוצע' } }], usage: { prompt_tokens: 9, completion_tokens: 3 } }), { status: 200 }));
    const result = await new ProviderGateway(request as typeof fetch).generate('zai', 'zai-secret', 'hello');
    expect(result).toMatchObject({ text: 'בוצע', model: 'glm-test', inputTokens: 9, outputTokens: 3 });
    expect(request.mock.calls[0][0]).toBe('https://api.z.ai/api/paas/v4/chat/completions');
    expect((request.mock.calls[0][1]?.headers as Record<string, string>).authorization).toBe('Bearer zai-secret');
  });
});
