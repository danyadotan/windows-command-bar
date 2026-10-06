import { describe, expect, it, vi } from 'vitest';
import { DevinClient } from '../src/main/devin-client';

describe('DevinClient', () => {
  it('creates an organization session with a bearer token', async () => {
    const request = vi.fn(async () => new Response(JSON.stringify({ session_id: 'session-123', status: 'new' }), { status: 200 }));
    const result = await new DevinClient(request as typeof fetch).createSession('cog_secret', 'org/example', 'Fix the tests');
    expect(result).toEqual({ id: 'session-123', status: 'new', url: 'https://app.devin.ai/sessions/session-123' });
    expect(request.mock.calls[0][0]).toBe('https://api.devin.ai/v3/organizations/org%2Fexample/sessions');
    expect((request.mock.calls[0][1]?.headers as Record<string, string>).authorization).toBe('Bearer cog_secret');
    expect(JSON.parse(String(request.mock.calls[0][1]?.body))).toEqual({ prompt: 'Fix the tests' });
  });

  it('rejects an untrusted response URL', async () => {
    const request = vi.fn(async () => new Response(JSON.stringify({ id: 'safe-id', url: 'https://evil.example/session' }), { status: 200 }));
    const result = await new DevinClient(request as typeof fetch).createSession('cog_secret', 'org', 'task');
    expect(result.url).toBe('https://app.devin.ai/sessions/safe-id');
  });
});
