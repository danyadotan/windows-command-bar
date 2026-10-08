import type { LocalRuntimeStatus, ProviderGeneration } from '../shared/contracts';
import { estimateTokens } from './model-router';

type FetchLike = typeof fetch;

const REQUEST_TIMEOUT_MS = 45_000;

function isLoopback(hostname: string): boolean {
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1';
}

export class LocalRuntime {
  constructor(private readonly request: FetchLike = fetch) {}

  status(): LocalRuntimeStatus {
    const endpoint = process.env.WINPILOT_LOCAL_AI_ENDPOINT?.trim();
    const model = process.env.WINPILOT_LOCAL_AI_MODEL?.trim();
    const transport = process.env.WINPILOT_LOCAL_AI_TRANSPORT === 'mcp' ? 'mcp-loopback' : 'microsoft-local-sdk';
    if (!endpoint || !model) return { configured: false, transport: 'none', message: 'יש להגדיר Local SDK או שרת MCP מקומי' };
    try {
      const parsed = new URL(endpoint);
      if (!isLoopback(parsed.hostname)) return { configured: false, transport: 'none', message: 'מטעמי פרטיות, endpoint מקומי חייב להיות loopback' };
      if (!['http:', 'https:'].includes(parsed.protocol)) return { configured: false, transport: 'none', message: 'פרוטוקול runtime לא נתמך' };
      if (parsed.username || parsed.password || parsed.search || parsed.hash) return { configured: false, transport: 'none', message: 'כתובת runtime לא יכולה לכלול credentials, query או hash' };
      return { configured: true, endpoint: parsed.toString().replace(/\/$/, ''), model, transport, message: 'runtime מקומי מוגדר' };
    } catch { return { configured: false, transport: 'none', message: 'כתובת runtime מקומי אינה תקינה' }; }
  }

  async generate(prompt: string): Promise<ProviderGeneration> {
    const runtime = this.status();
    if (!runtime.configured || !runtime.endpoint || !runtime.model) throw new Error(runtime.message);
    const url = new URL('chat/completions', `${runtime.endpoint}/`).toString();
    let response: Response;
    try {
      response = await this.request(url, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ model: runtime.model, messages: [{ role: 'user', content: prompt }] }),
        redirect: 'error',
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS)
      });
    } catch (error) {
      if (error instanceof Error && error.name === 'TimeoutError') throw new Error('ה־runtime המקומי לא הגיב בזמן');
      throw new Error('לא ניתן להתחבר ל־runtime המקומי');
    }
    if (!response.ok) throw new Error(`ה־runtime המקומי החזיר שגיאה (${response.status})`);
    const payload = await response.json() as {
      model?: string;
      choices?: Array<{ message?: { content?: string } }>;
      usage?: { prompt_tokens?: number; completion_tokens?: number };
    };
    const text = payload.choices?.[0]?.message?.content?.trim() ?? '';
    if (!text) throw new Error('ה־runtime המקומי החזיר תשובה ללא טקסט');
    return {
      text,
      model: payload.model ?? runtime.model,
      inputTokens: payload.usage?.prompt_tokens ?? estimateTokens(prompt),
      outputTokens: payload.usage?.completion_tokens ?? estimateTokens(text)
    };
  }
}
