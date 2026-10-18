const ids = ['fullName', 'email', 'workEmail', 'phone', 'signature'];
const status = document.querySelector('#status');
let nativeProfiles = [];

async function activeTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

async function prepareTab(tab) {
  if (!tab?.id || !tab.url) throw new Error('No active web page');
  const url = new URL(tab.url);
  const local = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
  if (url.protocol !== 'https:' && !(url.protocol === 'http:' && local)) throw new Error('HTTPS required');
  await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ['field-detector.js', 'content.js'] });
}

async function load() {
  const { profile, snippet } = await chrome.storage.session.get(['profile', 'snippet']);
  for (const id of ids) document.querySelector(`#${id}`).value = profile?.[id] || '';
  document.querySelector('#snippet').value = snippet || '';
}

document.querySelector('#loadNative').addEventListener('click', async () => {
  const granted = await chrome.permissions.request({ permissions: ['nativeMessaging'] });
  if (!granted) { status.textContent = 'החיבור ל־Windows לא אושר'; return; }
  const native = await chrome.runtime.sendMessage({ type: 'get-native-form-data' });
  const select = document.querySelector('#nativeProfile'); select.replaceChildren();
  if (!native?.ok || !native.profiles?.length) {
    const option = document.createElement('option'); option.value = ''; option.textContent = 'לא מחובר — אפשר להשתמש בפרופיל סשן'; select.append(option); status.textContent = 'WinPilot לא זמין או שאין פרופילים; אפשר להזין פרופיל זמני'; return;
  }
  nativeProfiles = native.profiles;
  const placeholder = document.createElement('option'); placeholder.value = ''; placeholder.textContent = 'בחירת פרופיל'; select.append(placeholder);
  nativeProfiles.forEach((profile, index) => { const option = document.createElement('option'); option.value = String(index); option.textContent = profile.label; select.append(option); });
});

document.querySelector('#nativeProfile').addEventListener('change', event => {
  if (event.currentTarget.value === '') return;
  const index = Number(event.currentTarget.value); const profile = nativeProfiles[index]; if (!profile) return;
  for (const id of ids) document.querySelector(`#${id}`).value = profile[id] || '';
  status.textContent = 'הפרופיל נטען מ־WinPilot לזיכרון בלבד';
});

document.querySelector('#save').addEventListener('click', async () => {
  const profile = Object.fromEntries(ids.map(id => [id, document.querySelector(`#${id}`).value.trim()]));
  await chrome.storage.session.set({ profile }); status.textContent = 'נשמר לסשן הנוכחי בלבד';
});

document.querySelector('#fill').addEventListener('click', async () => {
  const profile = Object.fromEntries(ids.map(id => [id, document.querySelector(`#${id}`).value.trim()]));
  if (!Object.values(profile).some(Boolean)) { status.textContent = 'יש לבחור פרופיל או להזין פרטים'; return; }
  const tab = await activeTab();
  if (!tab?.id) return;
  try { await prepareTab(tab); const response = await chrome.tabs.sendMessage(tab.id, { type: 'fill-profile', profile }); status.textContent = `מולאו ${response?.filled || 0} שדות ריקים`; }
  catch { status.textContent = 'נדרש דף HTTPS (או localhost לבדיקה); דפים מוגנים אינם נתמכים'; }
});

document.querySelector('#insert').addEventListener('click', async () => {
  const value = document.querySelector('#snippet').value;
  await chrome.storage.session.set({ snippet: value });
  const tab = await activeTab();
  if (!tab?.id) return;
  try { await prepareTab(tab); const response = await chrome.tabs.sendMessage(tab.id, { type: 'insert-snippet', value }); status.textContent = response?.inserted ? 'הסניפט נוסף' : 'יש לבחור תחילה שדה ריק בדף'; }
  catch { status.textContent = 'יש לבחור שדה טקסט ריק בדף HTTPS (או localhost לבדיקה)'; }
});

document.querySelector('#remind').addEventListener('click', async () => {
  const tab = await activeTab();
  if (!tab?.url) return;
  const response = await chrome.runtime.sendMessage({ type: 'schedule-reminder', url: tab.url, title: tab.title });
  status.textContent = response?.ok ? 'התזכורת נקבעה לסשן זה בלבד' : 'ניתן לתזכר רק דפי http/https';
});

document.querySelector('#clear').addEventListener('click', async () => {
  const result = await chrome.runtime.sendMessage({ type: 'clear-session-data' });
  if (!result?.ok) { status.textContent = 'המחיקה לא הושלמה; נסו שוב'; return; }
  nativeProfiles = [];
  for (const id of [...ids, 'snippet']) document.querySelector(`#${id}`).value = '';
  document.querySelector('#nativeProfile').replaceChildren();
  status.textContent = 'נתוני הסשן והתזכורות נמחקו; פרופילי Windows לא שונו';
});

void load();
