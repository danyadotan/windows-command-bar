import { randomUUID } from 'node:crypto';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { ExecutionTier, RuntimeSummary, UsageEvent } from '../shared/contracts';
import type { SecretCipher } from './provider-vault';

interface PrivateUsageEvent extends UsageEvent { searchableText: string }

export class RuntimeMonitor {
  private readonly file: string;
  constructor(private readonly root: string, private readonly cipher: SecretCipher) { this.file = path.join(root, 'runtime-memory.enc'); }

  async record(input: { taskLabel: string; provider: string; model: string; tier: ExecutionTier; inputTokens: number; outputTokens?: number; latencyMs: number; success: boolean }): Promise<void> {
    const events = await this.read();
    events.unshift({ ...input, outputTokens: input.outputTokens ?? 0, id: randomUUID(), createdAt: new Date().toISOString(), searchableText: input.taskLabel.toLocaleLowerCase('he') });
    await this.write(events.slice(0, 1000));
  }

  async summary(): Promise<RuntimeSummary> {
    const events = (await this.read()).map(({ searchableText: _private, ...event }) => event);
    const localTokens = events.filter(event => event.tier === 'on-device').reduce((sum, event) => sum + event.inputTokens + event.outputTokens, 0);
    const cloudTokens = events.filter(event => event.tier === 'cloud-fast' || event.tier === 'cloud-reasoning').reduce((sum, event) => sum + event.inputTokens + event.outputTokens, 0);
    return { totalTokens: localTokens + cloudTokens, localTokens, cloudTokens, estimatedCloudTokensSaved: localTokens, events: events.slice(0, 20) };
  }

  async search(query: string): Promise<UsageEvent[]> {
    const normalized = query.trim().toLocaleLowerCase('he');
    return (await this.read()).filter(event => event.searchableText.includes(normalized)).map(({ searchableText: _private, ...event }) => event).slice(0, 20);
  }

  private async read(): Promise<PrivateUsageEvent[]> {
    try { return JSON.parse(this.cipher.decrypt(Buffer.from(await readFile(this.file, 'utf8'), 'base64'))) as PrivateUsageEvent[]; }
    catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') return []; throw error; }
  }

  private async write(events: PrivateUsageEvent[]) {
    if (!this.cipher.available()) throw new Error('הצפנה מאובטחת אינה זמינה');
    await mkdir(this.root, { recursive: true });
    const temporary = `${this.file}.tmp`;
    await writeFile(temporary, this.cipher.encrypt(JSON.stringify(events)).toString('base64'), { encoding: 'utf8', mode: 0o600 });
    await rename(temporary, this.file);
  }
}
