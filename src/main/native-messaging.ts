import { execFile } from 'node:child_process';
import { mkdir, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { Readable, Writable } from 'node:stream';
import type { FormAssistantData } from '../shared/contracts';
import type { FormAssistantStore } from './form-assistant';

export const NATIVE_HOST_NAME = 'io.dynamicbridge.winpilot';
export const EXTENSION_ID = 'dbkcdkaciiebdadcnmbmeljjfalbobkh';
export const ALLOWED_EXTENSION_ORIGIN = `chrome-extension://${EXTENSION_ID}/`;
const MAX_MESSAGE_BYTES = 1024 * 1024;
const NATIVE_ORIGIN_SWITCH = '--winpilot-native-origin=';

export function nativeOriginFromArgs(args: string[]): string | undefined {
  const value = args.find(argument => argument.startsWith(NATIVE_ORIGIN_SWITCH))?.slice(NATIVE_ORIGIN_SWITCH.length)
    ?? args.find(argument => /^chrome-extension:\/\/[a-p]{32}\/$/.test(argument));
  return value && /^chrome-extension:\/\/[a-p]{32}\/$/.test(value) ? value : undefined;
}

export function nativeOriginForLaunch(args: string[], switchValue: string, launchedByBrowser: boolean): string | undefined {
  const candidate = switchValue || nativeOriginFromArgs(args) || (launchedByBrowser ? ALLOWED_EXTENSION_ORIGIN : undefined);
  return candidate === ALLOWED_EXTENSION_ORIGIN ? candidate : undefined;
}

export function encodeNativeMessage(value: unknown): Buffer {
  const body = Buffer.from(JSON.stringify(value), 'utf8');
  if (body.length > MAX_MESSAGE_BYTES) throw new Error('Native message is too large');
  const frame = Buffer.allocUnsafe(body.length + 4);
  frame.writeUInt32LE(body.length, 0);
  body.copy(frame, 4);
  return frame;
}

export class NativeMessageDecoder {
  private buffer = Buffer.alloc(0);

  push(chunk: Buffer): unknown[] {
    this.buffer = Buffer.concat([this.buffer, chunk]);
    const messages: unknown[] = [];
    while (this.buffer.length >= 4) {
      const length = this.buffer.readUInt32LE(0);
      if (length > MAX_MESSAGE_BYTES) throw new Error('Native message is too large');
      if (this.buffer.length < length + 4) break;
      messages.push(JSON.parse(this.buffer.subarray(4, length + 4).toString('utf8')));
      this.buffer = this.buffer.subarray(length + 4);
    }
    return messages;
  }
}

export async function handleNativeMessage(message: unknown, load: () => Promise<FormAssistantData>): Promise<unknown> {
  if (!message || typeof message !== 'object') return { ok: false, error: 'invalid-request' };
  const type = (message as { type?: unknown }).type;
  if (type === 'ping') return { ok: true, type: 'pong' };
  if (type !== 'get-form-data') return { ok: false, error: 'unsupported-request' };
  const data = await load();
  return { ok: true, type: 'form-data', profiles: data.profiles, snippets: data.snippets };
}

export async function serveNativeMessaging(store: FormAssistantStore, origin: string, input: Readable, output: Writable): Promise<void> {
  if (origin !== ALLOWED_EXTENSION_ORIGIN) throw new Error('Native messaging origin is not allowed');
  const decoder = new NativeMessageDecoder();
  for await (const chunk of input) {
    for (const message of decoder.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))) {
      try {
        output.write(encodeNativeMessage(await handleNativeMessage(message, () => store.get())));
      } catch {
        output.write(encodeNativeMessage({ ok: false, error: 'native-host-failure' }));
      }
    }
  }
}

type RegistryWriter = (args: string[]) => Promise<void>;

function writeRegistry(args: string[]): Promise<void> {
  return new Promise((resolve, reject) => execFile('reg.exe', args, { windowsHide: true }, error => error ? reject(error) : resolve()));
}

export async function installNativeMessagingHost(root: string, executablePath: string, registryWriter: RegistryWriter = writeRegistry): Promise<string> {
  if (!path.win32.isAbsolute(executablePath) || !executablePath.toLowerCase().endsWith('.exe')) throw new Error('Native host executable must be an absolute Windows executable path');
  const directory = path.join(root, 'native-messaging');
  const manifestPath = path.join(directory, `${NATIVE_HOST_NAME}.json`);
  const temporary = `${manifestPath}.tmp`;
  const manifest = { name: NATIVE_HOST_NAME, description: 'WinPilot encrypted form profile bridge', path: executablePath, type: 'stdio', allowed_origins: [ALLOWED_EXTENSION_ORIGIN] };
  await mkdir(directory, { recursive: true });
  await writeFile(temporary, JSON.stringify(manifest, null, 2), { encoding: 'utf8', mode: 0o600 });
  await rename(temporary, manifestPath);
  for (const browser of ['Google\\Chrome', 'Microsoft\\Edge']) {
    const key = `HKCU\\Software\\${browser}\\NativeMessagingHosts\\${NATIVE_HOST_NAME}`;
    await registryWriter(['ADD', key, '/ve', '/t', 'REG_SZ', '/d', manifestPath, '/f']);
  }
  return manifestPath;
}
