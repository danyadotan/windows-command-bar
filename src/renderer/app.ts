import './styles.css';
import type { CommandResponse, FormAssistantData, ProviderId, ProviderStatus, SavedItem } from '../shared/contracts';

const prompt = document.querySelector<HTMLTextAreaElement>('#prompt')!;
const provider = document.querySelector<HTMLSelectElement>('#provider')!;
const preview = document.querySelector<HTMLInputElement>('#preview')!;
const result = document.querySelector<HTMLElement>('#result')!;
const saveInput = document.querySelector<HTMLInputElement>('#save-input')!;
const saveStatus = document.querySelector<HTMLElement>('#save-status')!;
const library = document.querySelector<HTMLElement>('#library')!;
const librarySearch = document.querySelector<HTMLInputElement>('#library-search')!;
let savedItems: SavedItem[] = [];
const settingsDialog = document.querySelector<HTMLDialogElement>('#settings-dialog')!;
const providerList = document.querySelector<HTMLElement>('#provider-list')!;
const formsDialog = document.querySelector<HTMLDialogElement>('#forms-dialog')!;
const formsStatus = document.querySelector<HTMLElement>('#forms-status')!;
const formItems = document.querySelector<HTMLElement>('#form-items')!;
const runtimeDialog = document.querySelector<HTMLDialogElement>('#runtime-dialog')!;
const runtimeMetrics = document.querySelector<HTMLElement>('#runtime-metrics')!;
const runtimeEvents = document.querySelector<HTMLElement>('#runtime-events')!;
const localRuntimeStatus = document.querySelector<HTMLElement>('#local-runtime-status')!;

function render(response: CommandResponse) {
  result.hidden = false;
  result.replaceChildren();
  const heading = document.createElement('h2'); heading.textContent = response.kind === 'plan' ? 'תוכנית מוצעת' : 'תשובה';
  const message = document.createElement('p'); message.textContent = response.message;
  result.append(heading, message);
  for (const item of response.actions) {
    const row = document.createElement('article');
    const info = document.createElement('div'); const title = document.createElement('strong'); title.textContent = item.title; const explanation = document.createElement('p'); explanation.textContent = item.explanation; info.append(title, explanation);
    const risk = document.createElement('span'); risk.className = `risk ${item.risk}`; risk.textContent = item.risk === 'read' ? 'קריאה בלבד' : item.risk === 'change' ? 'דורש אישור' : 'אישור מנהל'; row.append(info, risk);
    result.append(row);
  }
}

async function submit() {
  const request = { text: prompt.value, provider: provider.value as ProviderId, previewOnly: preview.checked };
  const route = await window.winpilot.routePreview(request);
  saveStatus.textContent = `${route.model} · ${route.reason} · כ־${route.estimatedInputTokens} טוקנים`;
  if (route.tier === 'privacy-hold') { result.hidden = false; result.replaceChildren(); const message = document.createElement('p'); message.textContent = route.reason; result.append(message); return; }
  try { render(await window.winpilot.plan(request)); }
  catch (error) { result.hidden = false; result.textContent = error instanceof Error ? error.message : 'המשימה נכשלה'; }
}

function showLibrary(items: SavedItem[]) {
  library.replaceChildren();
  const query = librarySearch.value.trim().toLocaleLowerCase('he');
  const visible = items.filter(item => !query || `${item.title} ${item.collection} ${item.tags.join(' ')}`.toLocaleLowerCase('he').includes(query));
  if (!visible.length) { const empty = document.createElement('p'); empty.className = 'empty'; empty.textContent = query ? 'לא נמצאו פריטים' : 'הפריטים שתשמרו יופיעו כאן'; library.append(empty); return; }
  for (const item of visible.slice(0, 6)) {
    const card = document.createElement('article');
    const icon = document.createElement('b');
    icon.textContent = item.kind === 'link' ? '↗' : item.kind === 'screenshot' ? '▣' : item.kind === 'inspiration' ? '✦' : '✎';
    const info = document.createElement('div');
    const title = document.createElement('strong'); title.textContent = item.title;
    const context = document.createElement('small'); context.textContent = `${item.collection} · ${item.tags.slice(0, 2).join(', ')}`;
    info.append(title, context); card.append(icon, info); library.append(card);
  }
}

async function refreshLibrary() { savedItems = await window.winpilot.listSaved(); showLibrary(savedItems); }

async function showProviderSettings() {
  const statuses = await window.winpilot.providerStatuses();
  providerList.replaceChildren();
  for (const status of statuses) providerList.append(providerRow(status));
  settingsDialog.showModal();
}

function providerRow(status: ProviderStatus) {
  const row = document.createElement('article');
  const info = document.createElement('div');
  const name = document.createElement('strong'); name.textContent = status.name;
  const state = document.createElement('small'); state.textContent = status.configured ? `מחובר · ${status.mode === 'agent' ? 'סוכן' : 'צ׳אט'}` : 'לא מחובר';
  info.append(name, state);
  const input = document.createElement('input'); input.type = 'password'; input.placeholder = 'API key'; input.autocomplete = 'off';
  const button = document.createElement('button'); button.textContent = status.configured ? 'ניתוק' : 'חיבור';
  button.addEventListener('click', async () => {
    try {
      if (status.configured) await window.winpilot.removeProvider(status.id);
      else await window.winpilot.configureProvider({ id: status.id, apiKey: input.value });
      settingsDialog.close(); await showProviderSettings();
    } catch (error) { state.textContent = error instanceof Error ? error.message : 'הפעולה נכשלה'; state.className = 'error'; }
  });
  row.append(info, input, button); return row;
}

async function refreshForms() {
  const data = await window.winpilot.getFormData(); renderFormItems(data);
}

function renderFormItems(data: FormAssistantData) {
  formItems.replaceChildren();
  for (const profile of data.profiles) {
    const item = document.createElement('article'); item.textContent = `◉ ${profile.label} · ${profile.email}`; formItems.append(item);
  }
  for (const snippet of data.snippets.slice(0, 4)) {
    const item = document.createElement('article'); item.textContent = `/${snippet.trigger} · ${snippet.label}`;
    item.addEventListener('click', () => { prompt.value = snippet.value; formsDialog.close(); prompt.focus(); }); formItems.append(item);
  }
  for (const draft of data.drafts.slice(0, 4)) {
    const item = document.createElement('button'); item.textContent = `↗ ${draft.title}`; item.addEventListener('click', () => void window.winpilot.openForm(draft.url)); formItems.append(item);
  }
}

function fields(form: HTMLFormElement) { return new FormData(form); }

async function saveCurrent() {
  try {
    const item = await window.winpilot.save({ content: saveInput.value });
    saveInput.value = ''; saveStatus.textContent = `נשמר ב״${item.collection}״ עם התגיות ${item.tags.join(', ')}`;
    await refreshLibrary();
  } catch (error) { saveStatus.textContent = error instanceof Error ? error.message : 'השמירה נכשלה'; }
}

document.querySelector('#go')!.addEventListener('click', submit);
prompt.addEventListener('keydown', event => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); void submit(); } });
document.querySelectorAll<HTMLButtonElement>('[data-prompt]').forEach(button => button.addEventListener('click', () => { prompt.value = button.dataset.prompt ?? ''; prompt.focus(); }));
window.addEventListener('keydown', event => { if (event.key === 'Escape') window.close(); });
document.querySelector('#save-item')!.addEventListener('click', () => void saveCurrent());
saveInput.addEventListener('keydown', event => { if (event.key === 'Enter') void saveCurrent(); });
document.querySelector('#save-screenshot')!.addEventListener('click', async () => {
  try { const item = await window.winpilot.saveScreenshot(); saveStatus.textContent = `צילום המסך נשמר ב״${item.collection}״`; await refreshLibrary(); }
  catch (error) { saveStatus.textContent = error instanceof Error ? error.message : 'לא נמצאה תמונה בלוח'; }
});
librarySearch.addEventListener('input', () => showLibrary(savedItems));
document.querySelector('#provider-settings')!.addEventListener('click', () => void showProviderSettings());
document.querySelector('#runtime-button')!.addEventListener('click', async () => {
  const [summary, local] = await Promise.all([window.winpilot.runtimeSummary(), window.winpilot.localRuntimeStatus()]);
  localRuntimeStatus.textContent = `${local.configured ? '● מחובר' : '○ לא מחובר'} · ${local.transport} · ${local.message}${local.model ? ` · ${local.model}` : ''}`;
  localRuntimeStatus.classList.toggle('connected', local.configured);
  runtimeMetrics.replaceChildren();
  for (const [label, value] of [['סה״כ טוקנים', summary.totalTokens], ['עובדו מקומית', summary.localTokens], ['נחסכו מהענן', summary.estimatedCloudTokensSaved]] as const) {
    const card = document.createElement('article'); const strong = document.createElement('strong'); strong.textContent = String(value); const small = document.createElement('small'); small.textContent = label; card.append(strong, small); runtimeMetrics.append(card);
  }
  runtimeEvents.replaceChildren();
  for (const event of summary.events) { const row = document.createElement('article'); row.textContent = `${event.tier === 'on-device' ? 'מקומי' : 'ענן'} · ${event.model} · ${event.inputTokens + event.outputTokens} טוקנים`; runtimeEvents.append(row); }
  runtimeDialog.showModal();
});
document.querySelector('#forms-button')!.addEventListener('click', async () => { await refreshForms(); formsDialog.showModal(); });
document.querySelectorAll<HTMLButtonElement>('[data-form-tab]').forEach(button => button.addEventListener('click', () => {
  document.querySelectorAll('[data-form-tab]').forEach(item => item.classList.toggle('active', item === button));
  document.querySelectorAll<HTMLElement>('.form-panel').forEach(panel => { panel.hidden = panel.id !== `${button.dataset.formTab}-form`; });
}));
document.querySelector<HTMLFormElement>('#profile-form')!.addEventListener('submit', async event => { event.preventDefault(); const form = event.currentTarget; const data = fields(form); try { await window.winpilot.saveFormProfile({ label: String(data.get('label')), fullName: String(data.get('fullName')), email: String(data.get('email')), phone: String(data.get('phone')), signature: String(data.get('signature')) }); formsStatus.textContent = 'הפרופיל נשמר באופן מוצפן'; form.reset(); await refreshForms(); } catch (error) { formsStatus.textContent = error instanceof Error ? error.message : 'השמירה נכשלה'; } });
document.querySelector<HTMLFormElement>('#snippet-form')!.addEventListener('submit', async event => { event.preventDefault(); const form = event.currentTarget; const data = fields(form); try { await window.winpilot.saveFormSnippet({ trigger: String(data.get('trigger')), label: String(data.get('label')), value: String(data.get('value')), kind: String(data.get('kind')) as 'text' | 'search' | 'signature' }); formsStatus.textContent = 'הסניפט מוכן לשימוש'; form.reset(); await refreshForms(); } catch (error) { formsStatus.textContent = error instanceof Error ? error.message : 'השמירה נכשלה'; } });
document.querySelector<HTMLFormElement>('#draft-form')!.addEventListener('submit', async event => { event.preventDefault(); const form = event.currentTarget; const data = fields(form); const reminderAt = String(data.get('reminderAt')); try { await window.winpilot.saveFormDraft({ title: String(data.get('title')), url: String(data.get('url')), reminderAt: reminderAt ? new Date(reminderAt).toISOString() : undefined }); formsStatus.textContent = 'הטופס נשמר עם קישור חזרה'; form.reset(); await refreshForms(); } catch (error) { formsStatus.textContent = error instanceof Error ? error.message : 'השמירה נכשלה'; } });
void refreshLibrary();
