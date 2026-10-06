import type { LocalRuntimeStatus } from '../shared/contracts';

function isLoopback(hostname: string): boolean {
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1';
}

export class LocalRuntime {
  status(): LocalRuntimeStatus {
    const endpoint = process.env.WINPILOT_LOCAL_AI_ENDPOINT?.trim();
    const model = process.env.WINPILOT_LOCAL_AI_MODEL?.trim();
    const transport = process.env.WINPILOT_LOCAL_AI_TRANSPORT === 'mcp' ? 'mcp-loopback' : 'microsoft-local-sdk';
    if (!endpoint || !model) return { configured: false, transport: 'none', message: 'יש להגדיר Local SDK או שרת MCP מקומי' };
    try {
      const parsed = new URL(endpoint);
      if (!isLoopback(parsed.hostname)) return { configured: false, transport: 'none', message: 'מטעמי פרטיות, endpoint מקומי חייב להיות loopback' };
      if (!['http:', 'https:'].includes(parsed.protocol)) return { configured: false, transport: 'none', message: 'פרוטוקול runtime לא נתמך' };
      return { configured: true, endpoint: parsed.toString().replace(/\/$/, ''), model, transport, message: 'runtime מקומי מוגדר' };
    } catch { return { configured: false, transport: 'none', message: 'כתובת runtime מקומי אינה תקינה' }; }
  }
}
