import { readFileSync } from 'node:fs';
import { createHash, webcrypto } from 'node:crypto';
import vm from 'node:vm';
import { describe, expect, it, vi } from 'vitest';
import { EXTENSION_ID } from '../src/main/native-messaging';

const source = (file: string) => readFileSync(`browser-extension/${file}`, 'utf8');
const popupSender = { id: EXTENSION_ID, url: `chrome-extension://${EXTENSION_ID}/popup.html` };

function background(granted = true) {
  let listener: Function;
  let clicked: Function;
  let installed: Function;
  const data: Record<string, any> = {};
  const native = vi.fn((_host, _request, callback) => callback({ ok: true, profiles: [{ fullName: 'Synthetic User' }] }));
  const chrome = {
    runtime: { id: EXTENSION_ID, getURL: (path: string) => `chrome-extension://${EXTENSION_ID}/${path}`, sendNativeMessage: native,
      onMessage: { addListener: (fn: Function) => { listener = fn; } }, onInstalled: { addListener: (fn: Function) => { installed = fn; } } },
    permissions: { contains: async () => granted },
    storage: { session: {
      get: async (key: string) => ({ [key]: data[key] }),
      set: async (value: object) => { Object.assign(data, value); },
      clear: async () => { for (const key of Object.keys(data)) delete data[key]; }
    }, local: { remove: vi.fn() } },
    alarms: { create: vi.fn(), getAll: async () => [{ name: 'form:test' }], clear: vi.fn(), onAlarm: { addListener: vi.fn() } },
    notifications: { create: vi.fn(), clear: vi.fn(), getAll: async () => ({ 'form:test': {} }), onClicked: { addListener: (fn: Function) => { clicked = fn; } } },
    tabs: { create: vi.fn() }
  };
  vm.runInNewContext(source('background.js'), { chrome, URL, crypto: webcrypto });
  const request = (message: object, sender = popupSender) => new Promise<any>(resolve => {
    const result = listener!(message, sender, resolve);
    if (result !== true) resolve(undefined);
  });
  return { chrome, data, native, request, click: async (id: string) => { clicked!(id); await new Promise(resolve => setTimeout(resolve, 0)); }, install: () => installed!() };
}

describe('extension least privilege and identity', () => {
  it('has no persistent host access or automatic page scripts; native access is optional', () => {
    const manifest = JSON.parse(source('manifest.json'));
    expect(manifest.manifest_version).toBe(3);
    expect(manifest.host_permissions).toBeUndefined();
    expect(manifest.content_scripts).toBeUndefined();
    expect(manifest.permissions).toEqual(['storage', 'alarms', 'notifications', 'activeTab', 'scripting']);
    expect(manifest.optional_permissions).toEqual(['nativeMessaging']);
  });
  it('derives the same ID from the public key as both native allowlists', () => {
    const manifest = JSON.parse(source('manifest.json'));
    const id = createHash('sha256').update(Buffer.from(manifest.key, 'base64')).digest('hex').slice(0, 32)
      .replace(/[0-9a-f]/g, char => String.fromCharCode(97 + parseInt(char, 16)));
    expect(id).toBe(EXTENSION_ID);
    const host = JSON.parse(readFileSync('native-host/io.dynamicbridge.winpilot.json', 'utf8'));
    expect(host.allowed_origins).toEqual([`chrome-extension://${id}/`]);
    expect(readFileSync('native-host/WinPilotNativeHost.cs', 'utf8')).toContain(`chrome-extension://${id}/`);
    for (const [size, file] of Object.entries(manifest.icons)) {
      const png = readFileSync(`browser-extension/${file}`);
      expect(png.subarray(1, 4).toString()).toBe('PNG');
      expect(png.readUInt32BE(16)).toBe(Number(size));
      expect(png.readUInt32BE(20)).toBe(Number(size));
    }
  });
});

describe('extension background boundary', () => {
  it('does not read native data at startup or for content-script/foreign messages', async () => {
    const app = background();
    expect(app.native).not.toHaveBeenCalled();
    for (const sender of [
      { id: EXTENSION_ID, url: 'https://example.com/', tab: { id: 1 } },
      { ...popupSender, tab: { id: 1 } },
      { id: 'other', url: popupSender.url }
    ]) {
      expect(await app.request({ type: 'get-native-form-data' }, sender)).toBeUndefined();
      expect(await app.request({ type: 'schedule-reminder', url: 'https://example.com/' }, sender)).toBeUndefined();
    }
    expect(app.native).not.toHaveBeenCalled();
    expect(app.data).toEqual({});
  });
  it('checks optional permission before reading native profiles', async () => {
    const denied = background(false);
    expect(await denied.request({ type: 'get-native-form-data' })).toEqual({ ok: false });
    expect(denied.native).not.toHaveBeenCalled();
    const allowed = background();
    expect((await allowed.request({ type: 'get-native-form-data' })).ok).toBe(true);
    expect(allowed.native).toHaveBeenCalledOnce();
    expect(allowed.data).toEqual({});
  });
  it('rejects credentials and non-web URLs without storing them', async () => {
    const app = background();
    for (const url of ['file:///secret', 'javascript:alert(1)', 'https://user:password@example.com/']) {
      expect(await app.request({ type: 'schedule-reminder', url })).toEqual({ ok: false });
    }
    expect(app.data).toEqual({});
  });
  it('serializes reminder writes, reopens only the clicked URL and clears user data', async () => {
    const app = background();
    await Promise.all(['a', 'b'].map(path => app.request({ type: 'schedule-reminder', url: `https://example.com/${path}`, title: path })));
    expect(Object.keys(app.data.formReminders)).toHaveLength(2);
    const id = Object.keys(app.data.formReminders)[0];
    await app.click(`form:${id}`);
    expect(app.chrome.tabs.create).toHaveBeenCalledWith({ url: 'https://example.com/a' });
    expect(Object.keys(app.data.formReminders)).toHaveLength(1);
    app.data.profile = { fullName: 'Synthetic' };
    expect(await app.request({ type: 'clear-session-data' })).toEqual({ ok: true });
    expect(app.data).toEqual({});
    expect(app.chrome.alarms.clear).toHaveBeenCalledWith('form:test');
    expect(app.chrome.notifications.clear).toHaveBeenCalledWith('form:test');
    app.install();
    expect(app.chrome.storage.local.remove).toHaveBeenCalledWith('formReminders');
  });
});

function content() {
  class Input {
    tagName = 'INPUT'; type = 'text'; disabled = false; readOnly = false;
    name = 'fullName'; id = ''; placeholder = ''; autocomplete = ''; labels = [];
    visible = true; _value = '';
    get value() { return this._value; } set value(value) { this._value = value; }
    getClientRects() { return this.visible ? [{}] : []; }
    getAttribute() { return null; }
    dispatchEvent = vi.fn();
  }
  class Textarea extends Input { tagName = 'TEXTAREA'; }
  let listener: Function;
  const fields: Input[] = [];
  const focused = new Input();
  const document = { activeElement: focused, querySelectorAll: () => fields, addEventListener: vi.fn() };
  const chrome = { runtime: { id: EXTENSION_ID, getURL: (path: string) => `chrome-extension://${EXTENSION_ID}/${path}`, onMessage: { addListener: (fn: Function) => { listener = fn; } } } };
  const context = vm.createContext({ chrome, document, HTMLInputElement: Input, HTMLTextAreaElement: Textarea, Event: class {}, getComputedStyle: () => ({ visibility: 'visible' }) });
  vm.runInContext(source('field-detector.js'), context);
  vm.runInContext(source('content.js'), context);
  function request(message: object, sender = popupSender) { let result; listener!(message, sender, (value: any) => { result = value; }); return result; }
  return { Input, focused, fields, request };
}

describe('on-demand content script', () => {
  it('fills only visible, empty, writable text fields and dispatches site events', () => {
    const app = content();
    const good = new app.Input();
    const blocked = ['password', 'hidden', 'file', 'checkbox'].map(type => Object.assign(new app.Input(), { type }));
    blocked.push(Object.assign(new app.Input(), { value: 'existing' }), Object.assign(new app.Input(), { disabled: true }), Object.assign(new app.Input(), { readOnly: true }), Object.assign(new app.Input(), { visible: false }));
    app.fields.push(good, ...blocked);
    const original = blocked.map(field => field.value);
    expect(app.request({ type: 'fill-profile', profile: { fullName: 'Synthetic' } })).toEqual({ filled: 1 });
    expect(good.value).toBe('Synthetic');
    expect(good.dispatchEvent).toHaveBeenCalledTimes(2);
    expect(blocked.map(field => field.value)).toEqual(original);
  });
  it('inserts into the field focused before injection, rejects file inputs and untrusted senders', () => {
    const app = content();
    expect(app.request({ type: 'insert-snippet', value: 'Synthetic' }, { ...popupSender, id: 'other' })).toBeUndefined();
    expect(app.focused.value).toBe('');
    expect(app.request({ type: 'insert-snippet', value: 'Synthetic' })).toEqual({ inserted: true });
    app.focused.value = ''; app.focused.type = 'file';
    expect(app.request({ type: 'insert-snippet', value: 'Synthetic' })).toEqual({ inserted: false });
  });
});

async function popup(url: string, granted = true, nativeProfiles: object[] = []) {
  const controls = new Map<string, any>();
  const control = (id: string) => {
    if (!controls.has(id)) controls.set(id, { value: '', textContent: '', listeners: {}, addEventListener(type: string, fn: Function) { this.listeners[type] = fn; }, replaceChildren() {}, append() {} });
    return controls.get(id);
  };
  const chrome = {
    tabs: { query: async () => [{ id: 7, url }], sendMessage: vi.fn(async () => ({ filled: 1, inserted: true })) },
    scripting: { executeScript: vi.fn(async () => []) },
    permissions: { request: vi.fn(async () => granted) },
    runtime: { sendMessage: vi.fn(async () => ({ ok: true, profiles: nativeProfiles })) },
    storage: { session: { get: async () => ({}), set: vi.fn() } }
  };
  vm.runInNewContext(source('popup.js'), { chrome, URL, document: { querySelector: control, createElement: () => ({}) } });
  await Promise.resolve(); await Promise.resolve();
  return { chrome, control, click: (id: string) => control(id).listeners.click() };
}

describe('popup user activation', () => {
  it('does not request native data merely by opening the popup; denial sends no native request', async () => {
    const app = await popup('https://example.com/', false);
    expect(app.chrome.runtime.sendMessage).not.toHaveBeenCalled();
    await app.click('#loadNative');
    expect(app.chrome.permissions.request).toHaveBeenCalledWith({ permissions: ['nativeMessaging'] });
    expect(app.chrome.runtime.sendMessage).not.toHaveBeenCalled();
  });
  it('injects packaged code only when fill is clicked on HTTPS or a loopback fixture', async () => {
    for (const url of ['https://example.com/', 'http://127.0.0.1:8765/form']) {
      const app = await popup(url);
      expect(app.chrome.scripting.executeScript).not.toHaveBeenCalled();
      app.control('#fullName').value = 'Synthetic';
      await app.click('#fill');
      expect(app.chrome.scripting.executeScript).toHaveBeenCalledWith({ target: { tabId: 7 }, files: ['field-detector.js', 'content.js'] });
      expect(app.chrome.tabs.sendMessage).toHaveBeenCalledOnce();
    }
  });
  it('never sends profile data to remote HTTP, file or browser pages', async () => {
    for (const url of ['http://example.com/', 'file:///secret', 'chrome://settings/']) {
      const app = await popup(url);
      app.control('#fullName').value = 'Synthetic';
      await app.click('#fill');
      expect(app.chrome.scripting.executeScript).not.toHaveBeenCalled();
      expect(app.chrome.tabs.sendMessage).not.toHaveBeenCalled();
    }
  });
});


describe('popup action results', () => {
  it('loads and selects a synthetic native profile, saves it for the session, then clears it', async () => {
    const profile = { label: 'Synthetic', fullName: 'Synthetic User', email: 'test@example.invalid' };
    const app = await popup('https://example.com/', true, [profile]);
    await app.click('#loadNative');
    expect(app.chrome.runtime.sendMessage).toHaveBeenCalledWith({ type: 'get-native-form-data' });
    app.control('#nativeProfile').listeners.change({ currentTarget: { value: '0' } });
    expect(app.control('#fullName').value).toBe(profile.fullName);
    expect(app.control('#email').value).toBe(profile.email);
    await app.click('#save');
    expect(app.chrome.storage.session.set).toHaveBeenCalledWith({ profile: { fullName: profile.fullName, email: profile.email, workEmail: '', phone: '', signature: '' } });
    await app.click('#clear');
    expect(app.chrome.runtime.sendMessage).toHaveBeenCalledWith({ type: 'clear-session-data' });
    expect(app.control('#fullName').value).toBe('');
    expect(app.control('#email').value).toBe('');
  });
  it('inserts the chosen snippet and schedules a reminder for the active page', async () => {
    const app = await popup('https://example.com/');
    app.control('#snippet').value = 'Synthetic snippet';
    await app.click('#insert');
    expect(app.chrome.tabs.sendMessage).toHaveBeenCalledWith(7, { type: 'insert-snippet', value: 'Synthetic snippet' });
    expect(app.control('#status').textContent).toContain('הסניפט נוסף');
    await app.click('#remind');
    expect(app.chrome.runtime.sendMessage).toHaveBeenCalledWith({ type: 'schedule-reminder', url: 'https://example.com/', title: undefined });
    expect(app.control('#status').textContent).toContain('התזכורת נקבעה');
  });
});
