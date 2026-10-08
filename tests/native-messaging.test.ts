import { mkdtemp, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { ALLOWED_EXTENSION_ORIGIN, encodeNativeMessage, EXTENSION_ID, handleNativeMessage, installNativeMessagingHost, NativeMessageDecoder, nativeOriginForLaunch, nativeOriginFromArgs } from '../src/main/native-messaging';

const temporaryDirectories: string[] = [];
afterEach(async () => { await Promise.all(temporaryDirectories.splice(0).map(directory => rm(directory, { recursive: true, force: true }))); });

describe('native messaging bridge', () => {
  it('decodes length-prefixed messages split across chunks', () => {
    const frame = encodeNativeMessage({ type: 'ping' }); const decoder = new NativeMessageDecoder();
    expect(decoder.push(frame.subarray(0, 3))).toEqual([]);
    expect(decoder.push(frame.subarray(3))).toEqual([{ type: 'ping' }]);
  });

  it('allows only the fixed extension origin argument', () => {
    expect(nativeOriginFromArgs(['WinPilot.exe', ALLOWED_EXTENSION_ORIGIN])).toBe(ALLOWED_EXTENSION_ORIGIN);
    expect(nativeOriginFromArgs(['WinPilot.exe', `--winpilot-native-origin=${ALLOWED_EXTENSION_ORIGIN}`])).toBe(ALLOWED_EXTENSION_ORIGIN);
    expect(nativeOriginFromArgs(['WinPilot.exe', '--winpilot-native-origin=https://example.com'])).toBeUndefined();
    expect(nativeOriginFromArgs(['WinPilot.exe', 'https://example.com'])).toBeUndefined();
    expect(nativeOriginForLaunch(['WinPilot.exe'], ALLOWED_EXTENSION_ORIGIN, false)).toBe(ALLOWED_EXTENSION_ORIGIN);
    expect(nativeOriginForLaunch(['WinPilot.exe'], '', true)).toBe(ALLOWED_EXTENSION_ORIGIN);
    expect(nativeOriginForLaunch(['WinPilot.exe'], 'chrome-extension://aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa/', true)).toBeUndefined();
    expect(ALLOWED_EXTENSION_ORIGIN).toBe(`chrome-extension://${EXTENSION_ID}/`);
  });

  it('exposes only profiles and snippets through the read-only request', async () => {
    const data = { profiles: [{ id: 'p', label: 'פרטי', fullName: 'Dana', email: 'd@example.com', phone: '', signature: '' }], snippets: [], drafts: [{ id: 'd', title: 'secret draft', url: 'https://example.com', createdAt: '' }] };
    await expect(handleNativeMessage({ type: 'get-form-data' }, async () => data)).resolves.toEqual({ ok: true, type: 'form-data', profiles: data.profiles, snippets: [] });
    await expect(handleNativeMessage({ type: 'delete-all' }, async () => data)).resolves.toEqual({ ok: false, error: 'unsupported-request' });
  });

  it('writes an allowlisted host manifest and exact Chrome and Edge registry commands', async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), 'winpilot-native-')); temporaryDirectories.push(root);
    const calls: string[][] = [];
    const manifestPath = await installNativeMessagingHost(root, 'C:\\Program Files\\WinPilot\\WinPilot.exe', async args => { calls.push(args); });
    const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
    expect(manifest).toMatchObject({ name: 'io.dynamicbridge.winpilot', path: 'C:\\Program Files\\WinPilot\\WinPilot.exe', allowed_origins: [ALLOWED_EXTENSION_ORIGIN] });
    expect(calls).toHaveLength(2);
    expect(calls[0]).toContain('HKCU\\Software\\Google\\Chrome\\NativeMessagingHosts\\io.dynamicbridge.winpilot');
    expect(calls[1]).toContain('HKCU\\Software\\Microsoft\\Edge\\NativeMessagingHosts\\io.dynamicbridge.winpilot');
  });
});
