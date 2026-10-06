import { mkdir, mkdtemp, readFile, stat, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { FileOrganizer } from '../src/main/file-organizer';
import type { SecretCipher } from '../src/main/provider-vault';

const cipher: SecretCipher = { available: () => true, encrypt: value => Buffer.from(value).map(byte => byte ^ 19), decrypt: value => Buffer.from(value.map(byte => byte ^ 19)).toString() };

async function setup() { const root = await mkdtemp(path.join(tmpdir(), 'winpilot-files-')); const downloads = path.join(root, 'Downloads'); const data = path.join(root, 'data'); await mkdir(downloads); return { root, downloads, data, organizer: new FileOrganizer(downloads, data, cipher) }; }

describe('FileOrganizer', () => {
  it('previews without moving and excludes directories and symlinks', async () => {
    const { downloads, organizer } = await setup(); await writeFile(path.join(downloads, 'photo.jpg'), 'image'); await mkdir(path.join(downloads, 'folder')); try { await symlink(path.join(downloads, 'photo.jpg'), path.join(downloads, 'link.jpg')); } catch { /* Windows CI may not grant symlink privileges. */ }
    const plan = await organizer.preview();
    expect(plan.moves).toEqual([{ source: 'photo.jpg', destination: path.join('Images', 'photo.jpg'), category: 'Images', size: 5 }]);
    expect(await readFile(path.join(downloads, 'photo.jpg'), 'utf8')).toBe('image');
  });

  it('requires confirmation, moves files, and performs undo', async () => {
    const { downloads, data, organizer } = await setup(); await writeFile(path.join(downloads, 'report.pdf'), 'report'); const plan = await organizer.preview();
    await expect(organizer.execute(plan.id, false)).rejects.toThrow('אישור');
    const result = await organizer.execute(plan.id, true); expect(result.moved).toBe(1); expect((await stat(path.join(downloads, 'Documents', 'report.pdf'))).isFile()).toBe(true);
    expect(await readFile(path.join(data, 'file-actions.enc'), 'utf8')).not.toContain('report.pdf');
    const undone = await organizer.undoLast(true); expect(undone.moved).toBe(1); expect((await stat(path.join(downloads, 'report.pdf'))).isFile()).toBe(true);
  });

  it('skips a file changed after preview', async () => {
    const { downloads, organizer } = await setup(); const file = path.join(downloads, 'notes.txt'); await writeFile(file, 'one'); const plan = await organizer.preview(); await writeFile(file, 'changed content');
    const result = await organizer.execute(plan.id, true); expect(result).toMatchObject({ moved: 0, skipped: 1 });
  });

  it('does not overwrite a destination created after preview', async () => {
    const { downloads, organizer } = await setup(); await writeFile(path.join(downloads, 'archive.zip'), 'source'); const plan = await organizer.preview(); await mkdir(path.join(downloads, 'Archives')); await writeFile(path.join(downloads, 'Archives', 'archive.zip'), 'existing');
    const result = await organizer.execute(plan.id, true); expect(result.skipped).toBe(1); expect(await readFile(path.join(downloads, 'Archives', 'archive.zip'), 'utf8')).toBe('existing');
  });
});
