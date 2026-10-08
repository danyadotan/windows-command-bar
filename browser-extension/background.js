const REMINDERS_KEY = 'formReminders';
const NATIVE_HOST = 'io.dynamicbridge.winpilot';

function nativeFormData() {
  return new Promise(resolve => {
    chrome.runtime.sendNativeMessage(NATIVE_HOST, { type: 'get-form-data' }, response => {
      if (chrome.runtime.lastError || !response?.ok) resolve(null); else resolve(response);
    });
  });
}

function safeUrl(value) {
  try { const url = new URL(value); return ['http:', 'https:'].includes(url.protocol) ? url.toString() : null; }
  catch { return null; }
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === 'get-session-profile') {
    chrome.storage.session.get('profile').then(async ({ profile }) => {
      if (profile) { sendResponse({ profile, source: 'session' }); return; }
      const native = await nativeFormData();
      sendResponse({ profile: native?.profiles?.[0] || null, source: native ? 'winpilot' : 'none' });
    });
    return true;
  }
  if (message?.type === 'get-native-form-data') {
    nativeFormData().then(data => sendResponse(data || { ok: false }));
    return true;
  }
  if (message?.type === 'schedule-reminder') {
    const url = safeUrl(message.url);
    if (!url) { sendResponse({ ok: false }); return;
    }
    const id = crypto.randomUUID();
    chrome.storage.local.get(REMINDERS_KEY).then(data => {
      const reminders = data[REMINDERS_KEY] || {};
      reminders[id] = { url, title: String(message.title || 'טופס שלא הושלם').slice(0, 120) };
      return chrome.storage.local.set({ [REMINDERS_KEY]: reminders });
    }).then(() => {
      chrome.alarms.create(`form:${id}`, { delayInMinutes: 15 }); sendResponse({ ok: true });
    });
    return true;
  }
});

chrome.alarms.onAlarm.addListener(async alarm => {
  if (!alarm.name.startsWith('form:')) return;
  const id = alarm.name.slice(5);
  const data = await chrome.storage.local.get(REMINDERS_KEY);
  const reminder = data[REMINDERS_KEY]?.[id];
  if (!reminder) return;
  await chrome.notifications.create(`form:${id}`, {
    type: 'basic',
    iconUrl: 'icon.svg',
    title: 'טופס ממתין להשלמה',
    message: reminder.title,
    priority: 1
  });
});

chrome.notifications.onClicked.addListener(async notificationId => {
  if (!notificationId.startsWith('form:')) return;
  const id = notificationId.slice(5);
  const data = await chrome.storage.local.get(REMINDERS_KEY);
  const reminders = data[REMINDERS_KEY] || {};
  const reminder = reminders[id];
  if (reminder?.url && safeUrl(reminder.url)) await chrome.tabs.create({ url: reminder.url });
  delete reminders[id];
  await chrome.storage.local.set({ [REMINDERS_KEY]: reminders });
  await chrome.notifications.clear(notificationId);
});
