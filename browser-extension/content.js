(() => {
  const detector = globalThis.WinPilotFieldDetector;
  if (!detector) return;
  let lastFocused = null;

  function labelFor(element) {
    if (element.labels?.length) return Array.from(element.labels).map(label => label.textContent || '').join(' ');
    const labelledBy = element.getAttribute('aria-labelledby');
    if (labelledBy) return labelledBy.split(/\s+/).map(id => document.getElementById(id)?.textContent || '').join(' ');
    return element.getAttribute('aria-label') || '';
  }

  function classify(element) {
    return detector.classifyDescriptor({
      type: element.type,
      autocomplete: element.autocomplete,
      name: element.name,
      id: element.id,
      placeholder: element.placeholder,
      label: labelFor(element),
      tagName: element.tagName
    });
  }

  function eligibleFields() {
    return Array.from(document.querySelectorAll('input, textarea')).filter(element => {
      return !element.disabled && !element.readOnly && classify(element);
    });
  }

  function setValue(element, value) {
    if (!value || element.value) return false;
    const prototype = element instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
    const setter = Object.getOwnPropertyDescriptor(prototype, 'value')?.set;
    if (setter) setter.call(element, value); else element.value = value;
    element.dispatchEvent(new Event('input', { bubbles: true }));
    element.dispatchEvent(new Event('change', { bubbles: true }));
    return true;
  }

  function fill(profile) {
    let filled = 0;
    for (const field of eligibleFields()) {
      const kind = classify(field);
      if (!kind || kind === 'search') continue;
      if (setValue(field, profile[kind])) filled += 1;
    }
    return filled;
  }

  function showChip() {
    const fields = eligibleFields();
    if (!fields.length || document.getElementById('winpilot-form-chip')) return;
    const host = document.createElement('div'); host.id = 'winpilot-form-chip';
    host.style.cssText = 'all:initial;position:fixed;right:18px;bottom:18px;z-index:2147483647';
    const shadow = host.attachShadow({ mode: 'closed' });
    const button = document.createElement('button');
    button.textContent = `WinPilot · ${fields.length} שדות`;
    button.style.cssText = 'font:600 13px system-ui;color:#fff;background:#171923;border:1px solid #ffffff30;border-radius:999px;padding:10px 14px;box-shadow:0 8px 30px #0005;cursor:pointer;direction:rtl';
    button.addEventListener('click', () => chrome.runtime.sendMessage({ type: 'get-session-profile' }, response => {
      if (chrome.runtime.lastError) return;
      if (!response?.profile) { button.textContent = 'פתחו את ההרחבה והזינו פרופיל'; return; }
      const count = fill(response.profile); button.textContent = count ? `מולאו ${count} שדות` : 'אין שדות ריקים למילוי';
    }));
    shadow.append(button); document.documentElement.append(host);
  }

  document.addEventListener('focusin', event => {
    const target = event.target;
    if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) lastFocused = target;
  }, true);

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message?.type === 'fill-profile') { sendResponse({ filled: fill(message.profile || {}) }); return; }
    if (message?.type === 'insert-snippet') {
      const target = lastFocused;
      if (!target || target.disabled || target.readOnly || ['password', 'hidden'].includes(target.type)) { sendResponse({ inserted: false }); return; }
      sendResponse({ inserted: setValue(target, String(message.value || '')) });
    }
  });

  showChip();
  new MutationObserver(() => showChip()).observe(document.documentElement, { childList: true, subtree: true });
})();
