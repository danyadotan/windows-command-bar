(() => {
  if (globalThis.WinPilotContentInstalled) return;
  globalThis.WinPilotContentInstalled = true;
  const detector = globalThis.WinPilotFieldDetector;
  if (!detector) return;
  let lastFocused = document.activeElement;

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

  function writableTextField(element) {
    if (!(element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement)) return false;
    if (element.disabled || element.readOnly || !element.getClientRects().length) return false;
    if (getComputedStyle(element).visibility !== 'visible') return false;
    return element instanceof HTMLTextAreaElement || ['text', 'search', 'email', 'tel', 'url', 'number'].includes(element.type);
  }

  function eligibleFields() {
    return Array.from(document.querySelectorAll('input, textarea')).filter(element => {
      return writableTextField(element) && classify(element);
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

  document.addEventListener('focusin', event => {
    const target = event.target;
    if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) lastFocused = target;
  }, true);

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (sender.id !== chrome.runtime.id || sender.url !== chrome.runtime.getURL('popup.html')) return;
    if (message?.type === 'fill-profile') { sendResponse({ filled: fill(message.profile || {}) }); return; }
    if (message?.type === 'insert-snippet') {
      const target = lastFocused;
      if (!writableTextField(target)) { sendResponse({ inserted: false }); return; }
      sendResponse({ inserted: setValue(target, String(message.value || '')) });
    }
  });

})();
