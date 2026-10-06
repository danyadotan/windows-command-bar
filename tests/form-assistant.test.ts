import { mkdtemp, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { FormAssistantStore } from '../src/main/form-assistant';
import type { SecretCipher } from '../src/main/provider-vault';

const cipher: SecretCipher = { available: () => true, encrypt: value => Buffer.from(value).map(byte => byte ^ 42), decrypt: value => Buffer.from(value.map(byte => byte ^ 42)).toString() };

describe('FormAssistantStore', () => {
  it('encrypts personal profiles at rest', async () => {
    const root = await mkdtemp(path.join(tmpdir(), 'winpilot-forms-'));
    const store = new FormAssistantStore(root, cipher);
    await store.saveProfile({ label: 'עבודה', fullName: 'Test User', email: 'private@example.com', phone: '', signature: 'Regards' });
    expect((await store.get()).profiles[0].email).toBe('private@example.com');
    expect(await readFile(path.join(root, 'form-assistant.enc'), 'utf8')).not.toContain('private@example.com');
  });

  it('accepts only web links for unfinished forms', async () => {
    const root = await mkdtemp(path.join(tmpdir(), 'winpilot-forms-'));
    const store = new FormAssistantStore(root, cipher);
    await expect(store.saveDraft({ title: 'unsafe', url: 'file:///secret' })).rejects.toThrow('http');
  });
});
