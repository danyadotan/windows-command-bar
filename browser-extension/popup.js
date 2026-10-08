const ids = ['fullName', 'email', 'workEmail', 'phone', 'signature'];
const status = document.querySelector('#status');
let nativeProfiles = [];

async function activeTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

async function load() {
  const { profile, snippet } = await chrome.storage.session.get(['profile', 'snippet']);
  for (const id of ids) document.querySelector(`#${id}`).value = profile?.[id] || '';
  document.querySelector('#snippet').value = snippet || '';
  const native = await chrome.runtime.sendMessage({ type: 'get-native-form-data' });
  const select = document.querySelector('#nativeProfile'); select.replaceChildren();
  if (!native?.ok || !native.profiles?.length) {
    const option = document.createElement('option'); option.value = ''; option.textContent = 'לא מחובר — אפשר להשתמש בפרופיל סשן'; select.append(option); return;
  }
  nativeProfiles = native.profiles;
  const placeholder = document.createElement('option'); placeholder.value = ''; placeholder.textContent = 'בחירת פרופיל'; select.append(placeholder);
  nativeProfiles.forEach((profile, index) => { const option = document.createElement('option'); option.value = String(index); option.textContent = profile.label; select.append(option); });
}

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
  try { const response = await chrome.tabs.sendMessage(tab.id, { type: 'fill-profile', profile }); status.textContent = `מולאו ${response?.filled || 0} שדות ריקים`; }
  catch { status.textContent = 'העמוד אינו מאפשר מילוי מההרחבה'; }
});

document.querySelector('#insert').addEventListener('click', async () => {
  const value = document.querySelector('#snippet').value;
  await chrome.storage.session.set({ snippet: value });
  const tab = await activeTab();
  if (!tab?.id) return;
  try { const response = await chrome.tabs.sendMessage(tab.id, { type: 'insert-snippet', value }); status.textContent = response?.inserted ? 'הסניפט נוסף' : 'יש לבחור תחילה שדה ריק בדף'; }
  catch { status.textContent = 'לא ניתן לגשת לשדה בדף זה'; }
});

document.querySelector('#remind').addEventListener('click', async () => {
  const tab = await activeTab();
  if (!tab?.url) return;
  const response = await chrome.runtime.sendMessage({ type: 'schedule-reminder', url: tab.url, title: tab.title });
  status.textContent = response?.ok ? 'התזכורת נקבעה לעוד 15 דקות' : 'ניתן לתזכר רק דפי http/https';
});

void load();
