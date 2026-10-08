import { createRequire } from 'node:module';
import { mkdtemp, open, readFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);
const { patchToConsoleSubsystem } = require('../scripts/after-pack.cjs') as { patchToConsoleSubsystem: (file: string) => Promise<void> };

describe('Windows native host packaging', () => {
  it('patches a copied PE executable from GUI to console subsystem', async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), 'winpilot-pe-'));
    const executable = path.join(root, 'host.exe');
    const peOffset = 0x80;
    const optionalHeaderOffset = peOffset + 24;
    const image = Buffer.alloc(512);
    image.write('MZ', 0, 'ascii');
    image.writeUInt32LE(peOffset, 0x3c);
    image.write('PE\0\0', peOffset, 'ascii');
    image.writeUInt16LE(0x20b, optionalHeaderOffset);
    image.writeUInt16LE(2, optionalHeaderOffset + 68);
    const file = await open(executable, 'w');
    await file.write(image); await file.close();

    await patchToConsoleSubsystem(executable);

    expect((await readFile(executable)).readUInt16LE(optionalHeaderOffset + 68)).toBe(3);
  });
});
