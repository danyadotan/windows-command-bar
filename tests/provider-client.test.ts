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
});
