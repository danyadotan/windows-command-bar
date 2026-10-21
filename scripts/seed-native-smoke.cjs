// Run with Electron, only in a disposable Windows CI account. Never overwrites a store.
const { app, safeStorage } = require('electron');
const { mkdir } = require('node:fs/promises');
const path = require('node:path');
const { FormAssistantStore } = require('../dist/main/form-assistant');

app.whenReady().then(async () => {
  if (process.platform !== 'win32' || process.env.CI !== 'true') throw new Error('Disposable Windows CI account required');
  if (!safeStorage.isEncryptionAvailable()) throw new Error('safeStorage unavailable');
  const root = path.join(app.getPath('appData'), 'WinPilot', 'secure');
  await mkdir(root); // Fail if any existing secure store is present.
  const store = new FormAssistantStore(root, {
    available: () => safeStorage.isEncryptionAvailable(),
    encrypt: value => safeStorage.encryptString(value),
    decrypt: value => safeStorage.decryptString(value)
  });
  await store.saveProfile(require('./synthetic-native-profile.cjs'));
  app.quit();
}).catch(error => { console.error(error); app.exit(1); });
