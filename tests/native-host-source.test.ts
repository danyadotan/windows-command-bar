import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

describe('native host source', () => {
  it('pins the extension origin, DPAPI scope, and read-only response fields', async () => {
    const source = await readFile(path.join(process.cwd(), 'native-host', 'WinPilotNativeHost.cs'), 'utf8');
    expect(source).toContain('chrome-extension://dbkcdkaciiebdadcnmbmeljjfalbobkh/');
    expect(source).toContain('DataProtectionScope.CurrentUser');
    expect(source).toContain('{ "profiles", profiles }');
    expect(source).toContain('{ "snippets", snippets }');
    expect(source).not.toContain('{ "drafts",');
  });
});
