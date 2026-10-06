import { mkdtemp, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { ProviderVault, type SecretCipher } from '../src/main/provider-vault';

const cipher: SecretCipher = {
  available: () => true,
  encrypt: value => Buffer.from([...value].reverse().join('')),
  decrypt: value => [...value.toString()].reverse().join('')
};

describe('ProviderVault', () => {
  it('stores only encrypted provider credentials', async () => {
    const root = await mkdtemp(path.join(tmpdir(), 'winpilot-vault-'));
    const vault = new ProviderVault(root, cipher);
    await vault.configure('anthropic', 'secret-key-123');
    expect(await vault.get('anthropic')).toBe('secret-key-123');
    expect((await vault.statuses()).find(item => item.id === 'anthropic')?.configured).toBe(true);
    expect(await readFile(path.join(root, 'provider-secrets.json'), 'utf8')).not.toContain('secret-key-123');
  });

  it('rejects suspiciously short keys', async () => {
    const root = await mkdtemp(path.join(tmpdir(), 'winpilot-vault-'));
    await expect(new ProviderVault(root, cipher).configure('openai', 'short')).rejects.toThrow('קצר');
  });
});
