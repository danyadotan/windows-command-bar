const REMINDERS_KEY = 'formReminders';
const NATIVE_HOST = 'io.dynamicbridge.winpilot';
let reminderQueue = Promise.resolve();

function nativeFormData() {
  return new Promise(resolve => {
    chrome.runtime.sendNativeMessage(NATIVE_HOST, { type: 'get-form-data' }, response => {
      if (chrome.runtime.lastError || !response?.ok) resolve(null); else resolve(response);
    });
  });
}

function safeUrl(value) {
  try {
    const url = new URL(value);
    return ['http:', 'https:'].includes(url.protocol) && !url.username && !url.password ? url.toString() : null;
  } catch { return null; }
}

// Only the packaged popup may request native data or change reminders. Content
// scripts and other extension pages do not get a bridge to the local vault.
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (sender.id !== chrome.runtime.id || sender.url !== chrome.runtime.getURL('popup.html') || sender.tab) return;
  if (message?.type === 'get-native-form-data') {
    chrome.permissions.contains({ permissions: ['nativeMessaging'] }).then(async granted => {
      sendResponse(granted ? await nativeFormData() || { ok: false } : { ok: false });
    }).catch(() => sendResponse({ ok: false }));
    return true;
  }
  if (message?.type === 'schedule-reminder') {
    const url = safeUrl(message.url);
    if (!url) { sendResponse({ ok: false }); return; }
    reminderQueue = reminderQueue.then(async () => {
      const id = crypto.randomUUID();
      const data = await chrome.storage.session.get(REMINDERS_KEY);
      const reminders = data[REMINDERS_KEY] || {};
      reminders[id] = { url, title: String(message.title || 'טופס שלא הושלם').slice(0, 120) };
      await chrome.storage.session.set({ [REMINDERS_KEY]: reminders });
      await chrome.alarms.create(`form:${id}`, { delayInMinutes: 15 });
      sendResponse({ ok: true });
    }).catch(() => sendResponse({ ok: false }));
    return true;
  }
  if (message?.type === 'clear-session-data') {
    reminderQueue = reminderQueue.then(async () => {
      for (const alarm of await chrome.alarms.getAll()) {
        if (alarm.name.startsWith('form:')) await chrome.alarms.clear(alarm.name);
      }
      for (const id of Object.keys(await chrome.notifications.getAll())) {
        if (id.startsWith('form:')) await chrome.notifications.clear(id);
      }
      await chrome.storage.session.clear();
      sendResponse({ ok: true });
    }).catch(() => sendResponse({ ok: false }));
    return true;
  }
});

chrome.alarms.onAlarm.addListener(async alarm => {
  if (!alarm.name.startsWith('form:')) return;
  const id = alarm.name.slice(5);
  const data = await chrome.storage.session.get(REMINDERS_KEY);
  const reminder = data[REMINDERS_KEY]?.[id];
  if (!reminder) return;
  await chrome.notifications.create(`form:${id}`, {
    type: 'basic', iconUrl: 'icons/icon-128.png',
    title: 'טופס ממתין להשלמה', message: reminder.title, priority: 1
  });
});

chrome.notifications.onClicked.addListener(notificationId => {
  if (!notificationId.startsWith('form:')) return;
  reminderQueue = reminderQueue.then(async () => {
    const id = notificationId.slice(5);
    const data = await chrome.storage.session.get(REMINDERS_KEY);
    const reminders = data[REMINDERS_KEY] || {};
    const reminder = reminders[id];
    if (reminder?.url && safeUrl(reminder.url)) await chrome.tabs.create({ url: reminder.url });
    delete reminders[id];
    await chrome.storage.session.set({ [REMINDERS_KEY]: reminders });
    await chrome.notifications.clear(notificationId);
  }).catch(() => {});
});

// Remove URLs/titles persisted by older unpacked versions. New versions use only
// storage.session (not exposed to content scripts by default).
chrome.runtime.onInstalled.addListener(() => chrome.storage.local.remove(REMINDERS_KEY));
