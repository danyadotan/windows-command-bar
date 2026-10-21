import { readFileSync } from 'node:fs';
import { EventEmitter } from 'node:events';
import { createRequire } from 'node:module';
import vm from 'node:vm';
import { describe, expect, it, vi } from 'vitest';

const require = createRequire(import.meta.url);
const source = readFileSync('scripts/native-host-smoke.cjs', 'utf8');
const profile = require('../scripts/synthetic-native-profile.cjs');

function run(response: unknown, mode = '--form-data', code = 0) {
  const child = Object.assign(new EventEmitter(), {
    stdout: new EventEmitter(), stderr: new EventEmitter(), kill: vi.fn(),
    stdin: { end: vi.fn((frame: Buffer) => {
      expect(JSON.parse(frame.subarray(4).toString())).toEqual({ type: mode === '--form-data' ? 'get-form-data' : 'ping' });
      const body = Buffer.from(JSON.stringify(response));
      const reply = Buffer.alloc(body.length + 4);
      reply.writeUInt32LE(body.length); body.copy(reply, 4);
      child.stdout.emit('data', reply); child.emit('close', code);
    }) }
  });
  const spawn = vi.fn(() => child);
  const write = vi.fn();
  vm.runInNewContext(source, {
    require: (id: string) => id === 'node:child_process' ? { spawn } : id === './synthetic-native-profile.cjs' ? profile : id === 'node:util' ? {
      // Normalize VM prototypes while retaining Node's strict value comparison.
      isDeepStrictEqual: (a: unknown, b: unknown) => require('node:util').isDeepStrictEqual(JSON.parse(JSON.stringify(a)), JSON.parse(JSON.stringify(b)))
    } : require(id),
    process: { argv: ['node', 'smoke', process.execPath, mode], stdout: { write } },
    Buffer, JSON, setTimeout: () => 1, clearTimeout: vi.fn()
  });
  expect(spawn).toHaveBeenCalledWith(process.execPath, ['chrome-extension://dbkcdkaciiebdadcnmbmeljjfalbobkh/', '--parent-window=0', '--no-stdio-init'], expect.any(Object));
  return write;
}

describe('packaged native smoke verdict', () => {
  it('requires the complete synthetic profile returned by get-form-data', () => {
    expect(run({ ok: true, type: 'form-data', profiles: [profile], snippets: [] })).toHaveBeenCalled();
  });
  it('rejects an empty store, a wrong profile and decryption failure', () => {
    for (const response of [
      { ok: true, type: 'form-data', profiles: [], snippets: [] },
      { ok: true, type: 'form-data', profiles: [{ ...profile, email: 'wrong@example.invalid' }], snippets: [] },
      { ok: false, error: 'native-host-failure' },
      { ok: true, type: 'pong' }
    ]) expect(() => run(response)).toThrow('Unexpected native host response');
  });
  it('retains the ping check and rejects unsuccessful process exits', () => {
    expect(run({ ok: true, type: 'pong' }, '')).toHaveBeenCalled();
    expect(() => run({ ok: true, type: 'pong' }, '', 1)).toThrow('Native host exited');
  });
});
