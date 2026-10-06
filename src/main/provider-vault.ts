import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { ProviderId, ProviderStatus } from '../shared/contracts';

export interface SecretCipher {
  encrypt(value: string): Buffer;
  decrypt(value: Buffer): string;
  available(): boolean;
}

const PROVIDERS: Array<Omit<ProviderStatus, 'configured'>> = [
  { id: 'openai', name: 'OpenAI', mode: 'chat' },
  { id: 'anthropic', name: 'Anthropic', mode: 'chat' },
  { id: 'zai', name: 'Z.ai', mode: 'chat' },
  { id: 'devin', name: 'Devin', mode: 'agent' }
];

type EncryptedSecrets = Partial<Record<ProviderId, string>>;

export class ProviderVault {
  private readonly file: string;
  constructor(private readonly root: string, private readonly cipher: SecretCipher) {
    this.file = path.join(root, 'provider-secrets.json');
  }

  async statuses(): Promise<ProviderStatus[]> {
    const secrets = await this.read();
    return PROVIDERS.map(provider => ({ ...provider, configured: Boolean(secrets[provider.id]) }));
  }

  async configure(id: ProviderId, apiKey: string): Promise<void> {
    if (!this.cipher.available()) throw new Error('הצפנה מאובטחת אינה זמינה במחשב זה');
    const clean = apiKey.trim();
    if (clean.length < 8) throw new Error('מפתח ה־API קצר מדי');
    if (!PROVIDERS.some(provider => provider.id === id)) throw new Error('ספק לא מוכר');
    const secrets = await this.read();
    secrets[id] = this.cipher.encrypt(clean).toString('base64');
    await this.write(secrets);
  }

  async remove(id: ProviderId): Promise<void> {
    const secrets = await this.read();
    delete secrets[id];
    await this.write(secrets);
  }

  async get(id: ProviderId): Promise<string | undefined> {
    const encrypted = (await this.read())[id];
    return encrypted ? this.cipher.decrypt(Buffer.from(encrypted, 'base64')) : undefined;
  }

  private async read(): Promise<EncryptedSecrets> {
    try { return JSON.parse(await readFile(this.file, 'utf8')) as EncryptedSecrets; }
    catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') return {}; throw error; }
  }

  private async write(secrets: EncryptedSecrets) {
    await mkdir(this.root, { recursive: true });
    const temporary = `${this.file}.tmp`;
    await writeFile(temporary, JSON.stringify(secrets), { encoding: 'utf8', mode: 0o600 });
    await rename(temporary, this.file);
  }
}
