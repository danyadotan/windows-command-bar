import { randomUUID } from 'node:crypto';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { FormAssistantData, FormDraft, FormProfile, FormSnippet } from '../shared/contracts';
import type { SecretCipher } from './provider-vault';

const EMPTY: FormAssistantData = { profiles: [], snippets: [], drafts: [] };

export class FormAssistantStore {
  private readonly file: string;
  constructor(private readonly root: string, private readonly cipher: SecretCipher) {
    this.file = path.join(root, 'form-assistant.enc');
  }

  async get(): Promise<FormAssistantData> { return this.read(); }

  async saveProfile(profile: Omit<FormProfile, 'id'> & { id?: string }): Promise<FormProfile> {
    if (!profile.label.trim() || !profile.email.trim()) throw new Error('נדרשים שם לפרופיל וכתובת אימייל');
    const data = await this.read();
    const saved = { ...profile, id: profile.id || randomUUID() } as FormProfile;
    const index = data.profiles.findIndex(item => item.id === saved.id);
    if (index >= 0) data.profiles[index] = saved; else data.profiles.push(saved);
    await this.write(data); return saved;
  }

  async saveSnippet(snippet: Omit<FormSnippet, 'id'>): Promise<FormSnippet> {
    if (!snippet.trigger.trim() || !snippet.value.trim()) throw new Error('נדרשים קיצור ותוכן');
    const data = await this.read();
    const saved = { ...snippet, trigger: snippet.trigger.replace(/^\//, ''), id: randomUUID() };
    data.snippets.unshift(saved); await this.write(data); return saved;
  }

  async saveDraft(draft: Omit<FormDraft, 'id' | 'createdAt'>): Promise<FormDraft> {
    let url: URL;
    try { url = new URL(draft.url); } catch { throw new Error('נדרש קישור תקין לטופס'); }
    if (!['https:', 'http:'].includes(url.protocol)) throw new Error('מותר לשמור רק קישור http או https');
    const data = await this.read();
    const saved: FormDraft = { ...draft, url: url.toString(), id: randomUUID(), createdAt: new Date().toISOString() };
    data.drafts.unshift(saved); await this.write(data); return saved;
  }

  async due(now = new Date()): Promise<FormDraft[]> {
    return (await this.read()).drafts.filter(draft => draft.reminderAt && new Date(draft.reminderAt) <= now);
  }

  private async read(): Promise<FormAssistantData> {
    try {
      const encrypted = Buffer.from(await readFile(this.file, 'utf8'), 'base64');
      return JSON.parse(this.cipher.decrypt(encrypted)) as FormAssistantData;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return structuredClone(EMPTY);
      throw error;
    }
  }

  private async write(data: FormAssistantData) {
    if (!this.cipher.available()) throw new Error('הצפנה מאובטחת אינה זמינה במחשב זה');
    await mkdir(this.root, { recursive: true });
    const temporary = `${this.file}.tmp`;
    const encrypted = this.cipher.encrypt(JSON.stringify(data)).toString('base64');
    await writeFile(temporary, encrypted, { encoding: 'utf8', mode: 0o600 });
    await rename(temporary, this.file);
  }
}
