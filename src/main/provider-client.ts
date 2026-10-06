import type { ProviderGeneration, ProviderId } from '../shared/contracts';

type FetchLike = typeof fetch;

function openAIText(payload: Record<string, unknown>): string {
  if (typeof payload.output_text === 'string') return payload.output_text;
  const output = Array.isArray(payload.output) ? payload.output : [];
  return output.flatMap(item => typeof item === 'object' && item && Array.isArray((item as { content?: unknown[] }).content) ? (item as { content: unknown[] }).content : [])
    .filter(item => typeof item === 'object' && item && (item as { type?: string }).type === 'output_text')
    .map(item => String((item as { text?: string }).text ?? '')).join('');
}

async function apiError(response: Response): Promise<Error> {
  let detail = '';
  try { const body = await response.json() as { error?: { message?: string; code?: string } }; detail = body.error?.message || body.error?.code || ''; } catch { detail = await response.text().catch(() => ''); }
  const category = response.status === 401 ? 'מפתח API אינו תקין' : response.status === 429 ? 'חריגה ממכסה או מקצב הבקשות' : response.status === 403 ? 'אין הרשאה למודל או לפרויקט' : 'שגיאת ספק AI';
  return new Error(`${category} (${response.status})${detail ? `: ${detail}` : ''}`);
}

export class ProviderGateway {
  constructor(private readonly request: FetchLike = fetch) {}

  async generate(provider: ProviderId, apiKey: string, prompt: string): Promise<ProviderGeneration> {
    if (provider === 'openai') return this.openAI(apiKey, prompt);
    if (provider === 'anthropic') return this.anthropic(apiKey, prompt);
    throw new Error(`${provider} עדיין אינו מחובר ליצירת טקסט`);
  }

  private async openAI(apiKey: string, prompt: string): Promise<ProviderGeneration> {
    const model = process.env.WINPILOT_OPENAI_MODEL || 'gpt-5-mini';
    const response = await this.request('https://api.openai.com/v1/responses', {
      method: 'POST', headers: { authorization: `Bearer ${apiKey}`, 'content-type': 'application/json' },
      body: JSON.stringify({ model, input: prompt, store: false })
    });
    if (!response.ok) throw await apiError(response);
    const payload = await response.json() as Record<string, unknown>;
    const usage = (payload.usage ?? {}) as { input_tokens?: number; output_tokens?: number };
    const text = openAIText(payload);
    if (!text) throw new Error('OpenAI החזיר תשובה ללא טקסט');
    return { text, model: String(payload.model ?? model), inputTokens: usage.input_tokens ?? 0, outputTokens: usage.output_tokens ?? 0 };
  }

  private async anthropic(apiKey: string, prompt: string): Promise<ProviderGeneration> {
    const model = process.env.WINPILOT_ANTHROPIC_MODEL || 'claude-sonnet-4-6';
    const response = await this.request('https://api.anthropic.com/v1/messages', {
      method: 'POST', headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({ model, max_tokens: 2048, messages: [{ role: 'user', content: prompt }] })
    });
    if (!response.ok) throw await apiError(response);
    const payload = await response.json() as { model?: string; content?: Array<{ type: string; text?: string }>; usage?: { input_tokens?: number; output_tokens?: number } };
    const text = (payload.content ?? []).filter(item => item.type === 'text').map(item => item.text ?? '').join('');
    if (!text) throw new Error('Anthropic החזיר תשובה ללא טקסט');
    return { text, model: payload.model ?? model, inputTokens: payload.usage?.input_tokens ?? 0, outputTokens: payload.usage?.output_tokens ?? 0 };
  }
}
