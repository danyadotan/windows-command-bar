import { app, BrowserWindow, clipboard, globalShortcut, ipcMain, Notification, safeStorage, shell } from 'electron';
import path from 'node:path';
import { planCommand } from './planner';
import type { CommandRequest } from '../shared/contracts';
import type { ConfigureProviderRequest, FormDraft, FormProfile, FormSnippet, ProviderId, SaveItemRequest } from '../shared/contracts';
import { LocalLibrary } from './library';
import { ProviderVault } from './provider-vault';
import { FormAssistantStore } from './form-assistant';
import { routeTask } from './model-router';
import { RuntimeMonitor } from './runtime-monitor';
import { LocalRuntime } from './local-runtime';
import { ProviderGateway } from './provider-client';
import { DevinClient } from './devin-client';
import { WindowsHelper } from './windows-helper';
import { FileOrganizer } from './file-organizer';
import { installNativeMessagingHost, nativeOriginForLaunch, serveNativeMessaging } from './native-messaging';

let window: BrowserWindow | null = null;
const nativeMessagingOrigin = nativeOriginForLaunch(
  process.argv,
  app.commandLine.getSwitchValue('winpilot-native-origin'),
  process.platform === 'win32' && app.commandLine.hasSwitch('parent-window')
);

if (process.platform === 'win32') app.setAppUserModelId('io.dynamicbridge.winpilot');

function createWindow() {
  window = new BrowserWindow({
    width: 780, height: 650, minWidth: 620, minHeight: 520,
    frame: false, transparent: true, resizable: true, show: false,
    webPreferences: { preload: path.join(__dirname, '../preload/preload.js'), contextIsolation: true, nodeIntegration: false, sandbox: true }
  });
  const devUrl = process.env.VITE_DEV_SERVER_URL;
  if (devUrl) void window.loadURL(devUrl); else void window.loadFile(path.join(__dirname, '../index.html'));
  window.once('ready-to-show', () => window?.show());
}

app.whenReady().then(() => {
  const cipher = {
    available: () => safeStorage.isEncryptionAvailable(),
    encrypt: (value: string) => safeStorage.encryptString(value),
    decrypt: (value: Buffer) => safeStorage.decryptString(value)
  };
  const vault = new ProviderVault(path.join(app.getPath('userData'), 'secure'), cipher);
  const forms = new FormAssistantStore(path.join(app.getPath('userData'), 'secure'), cipher);
  if (nativeMessagingOrigin) {
    void serveNativeMessaging(forms, nativeMessagingOrigin, process.stdin, process.stdout).finally(() => app.quit());
    return;
  }
  if (process.platform === 'win32' && app.isPackaged) void installNativeMessagingHost(app.getPath('userData'), process.execPath).catch(() => undefined);
  const library = new LocalLibrary(path.join(app.getPath('userData'), 'saved'));
  const monitor = new RuntimeMonitor(path.join(app.getPath('userData'), 'secure'), cipher);
  const localRuntime = new LocalRuntime();
  const providers = new ProviderGateway();
  const devin = new DevinClient();
  const windows = new WindowsHelper();
  const organizer = new FileOrganizer(app.getPath('downloads'), path.join(app.getPath('userData'), 'secure'), cipher);
  ipcMain.handle('command:plan', async (_event, request: CommandRequest) => {
    const started = Date.now();
    const localStatus = localRuntime.status();
    const route = routeTask(request, localStatus.configured, localStatus.model);
    if (route.tier === 'privacy-hold') throw new Error(route.reason);
    const response = planCommand(request);
    if (response.kind === 'plan') {
      await monitor.record({ taskLabel: request.text.slice(0, 120), provider: 'local', model: 'deterministic-planner', tier: 'on-device', inputTokens: route.estimatedInputTokens, latencyMs: Date.now() - started, success: true });
      return response;
    }
    if (route.tier === 'on-device') {
      try {
        const generated = await localRuntime.generate(request.text);
        await monitor.record({ taskLabel: request.text.slice(0, 120), provider: 'local', model: generated.model, tier: 'on-device', inputTokens: generated.inputTokens, outputTokens: generated.outputTokens, latencyMs: Date.now() - started, success: true });
        return { kind: 'answer' as const, message: generated.text, actions: [] };
      } catch (error) {
        await monitor.record({ taskLabel: request.text.slice(0, 120), provider: 'local', model: route.model, tier: 'on-device', inputTokens: route.estimatedInputTokens, latencyMs: Date.now() - started, success: false });
        throw error;
      }
    }
    if (!['openai', 'anthropic', 'zai'].includes(request.provider)) {
      await monitor.record({ taskLabel: request.text.slice(0, 120), provider: request.provider, model: 'deterministic-planner', tier: 'on-device', inputTokens: route.estimatedInputTokens, latencyMs: Date.now() - started, success: true });
      return response;
    }
    const apiKey = await vault.get(request.provider);
    if (!apiKey) throw new Error(`יש לחבר את ${request.provider} במסך חיבור הספקים`);
    try {
      const generated = await providers.generate(request.provider, apiKey, request.text, route.tier);
      await monitor.record({ taskLabel: request.text.slice(0, 120), provider: request.provider, model: generated.model, tier: route.tier, inputTokens: generated.inputTokens, outputTokens: generated.outputTokens, latencyMs: Date.now() - started, success: true });
      return { kind: 'answer' as const, message: generated.text, actions: [] };
    } catch (error) {
      await monitor.record({ taskLabel: request.text.slice(0, 120), provider: request.provider, model: route.model, tier: route.tier, inputTokens: route.estimatedInputTokens, latencyMs: Date.now() - started, success: false });
      throw error;
    }
  });
  ipcMain.handle('library:list', () => library.list());
  ipcMain.handle('library:save', (_event, request: SaveItemRequest) => library.save(request));
  ipcMain.handle('library:save-screenshot', () => library.saveScreenshot(clipboard.readImage().toPNG()));
  ipcMain.handle('provider:statuses', () => vault.statuses());
  ipcMain.handle('provider:configure', (_event, request: ConfigureProviderRequest) => vault.configure(request.id, request.apiKey, request.organizationId));
  ipcMain.handle('provider:remove', (_event, id: ProviderId) => vault.remove(id));
  ipcMain.handle('forms:get', () => forms.get());
  ipcMain.handle('forms:save-profile', (_event, profile: Omit<FormProfile, 'id'> & { id?: string }) => forms.saveProfile(profile));
  ipcMain.handle('forms:save-snippet', (_event, snippet: Omit<FormSnippet, 'id'>) => forms.saveSnippet(snippet));
  ipcMain.handle('forms:save-draft', (_event, draft: Omit<FormDraft, 'id' | 'createdAt'>) => forms.saveDraft(draft));
  ipcMain.handle('forms:open', (_event, url: string) => { const parsed = new URL(url); if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error('קישור לא בטוח'); return shell.openExternal(parsed.toString()); });
  ipcMain.handle('runtime:summary', () => monitor.summary());
  ipcMain.handle('runtime:route-preview', (_event, request: CommandRequest) => { const status = localRuntime.status(); return routeTask(request, status.configured, status.model); });
  ipcMain.handle('runtime:local-status', () => localRuntime.status());
  ipcMain.handle('devin:create-session', async (_event, request: { prompt: string; confirmed: boolean }) => {
    if (!request.confirmed) throw new Error('נדרש אישור מפורש להפעלת Devin');
    const [apiKey, organizationId] = await Promise.all([vault.get('devin'), vault.getDevinOrganizationId()]);
    if (!apiKey || !organizationId) throw new Error('יש להגדיר טוקן ו־Organization ID עבור Devin');
    return devin.createSession(apiKey, organizationId, request.prompt);
  });
  ipcMain.handle('windows:search-apps', (_event, query: string) => windows.searchApps(query));
  ipcMain.handle('windows:install-app', (_event, request: { packageId: string; confirmed: boolean }) => windows.installApp(request.packageId, request.confirmed));
  ipcMain.handle('windows:scan-updates', () => windows.scanUpdates());
  ipcMain.handle('files:preview-organize', () => organizer.preview());
  ipcMain.handle('files:execute-organize', (_event, request: { planId: string; confirmed: boolean }) => organizer.execute(request.planId, request.confirmed));
  ipcMain.handle('files:undo-organize', (_event, confirmed: boolean) => organizer.undoLast(confirmed));
  const notifiedDrafts = new Set<string>();
  setInterval(async () => {
    for (const draft of await forms.due()) {
      if (notifiedDrafts.has(draft.id)) continue;
      notifiedDrafts.add(draft.id);
      const notice = new Notification({ title: 'טופס ממתין להשלמה', body: draft.title });
      notice.on('click', () => void shell.openExternal(draft.url)); notice.show();
    }
  }, 60_000).unref();
  createWindow();
  globalShortcut.register('Alt+Space', () => window?.isVisible() ? window.hide() : window?.show());
});

app.on('will-quit', () => globalShortcut.unregisterAll());
app.on('window-all-closed', () => { if (!nativeMessagingOrigin) app.quit(); });
