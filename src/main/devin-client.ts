import type { DevinSession } from '../shared/contracts';

type FetchLike = typeof fetch;

export class DevinClient {
  constructor(private readonly request: FetchLike = fetch) {}

  async createSession(apiKey: string, organizationId: string, prompt: string): Promise<DevinSession> {
    if (!prompt.trim()) throw new Error('נדרשת משימה ל־Devin');
    if (!organizationId.trim()) throw new Error('נדרש Devin Organization ID');
    const response = await this.request(`https://api.devin.ai/v3/organizations/${encodeURIComponent(organizationId)}/sessions`, {
      method: 'POST', headers: { authorization: `Bearer ${apiKey}`, 'content-type': 'application/json' },
      body: JSON.stringify({ prompt: prompt.trim() })
    });
    if (!response.ok) {
      const category = response.status === 401 ? 'טוקן Devin אינו תקין' : response.status === 403 ? 'אין הרשאה ליצור session בארגון' : 'יצירת Devin session נכשלה';
      throw new Error(`${category} (${response.status})`);
    }
    const payload = await response.json() as { session_id?: string; id?: string; url?: string; status?: string };
    const id = payload.session_id || payload.id;
    if (!id) throw new Error('Devin לא החזיר מזהה session');
    const fallback = `https://app.devin.ai/sessions/${encodeURIComponent(id)}`;
    const url = payload.url && new URL(payload.url).hostname === 'app.devin.ai' ? payload.url : fallback;
    return { id, url, status: payload.status || 'created' };
  }
}
