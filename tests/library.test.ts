import { mkdtemp, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { LocalLibrary } from '../src/main/library';

describe('LocalLibrary', () => {
  it('recognizes and organizes links locally', async () => {
    const root = await mkdtemp(path.join(tmpdir(), 'winpilot-'));
    const library = new LocalLibrary(root);
    const item = await library.save({ content: 'https://github.com/example/design-system' });
    expect(item).toMatchObject({ kind: 'link', collection: 'עיצוב והשראה', source: 'github.com' });
    expect(await library.list()).toHaveLength(1);
    expect(await readFile(path.join(root, 'library.json'), 'utf8')).toContain(item.id);
  });

  it('rejects empty items', async () => {
    const root = await mkdtemp(path.join(tmpdir(), 'winpilot-'));
    await expect(new LocalLibrary(root).save({ content: '   ' })).rejects.toThrow('ריק');
  });
});
