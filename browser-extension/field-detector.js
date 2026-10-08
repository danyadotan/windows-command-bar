(function attach(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.WinPilotFieldDetector = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function createDetector() {
  function classifyDescriptor(field) {
    const type = String(field.type || '').toLowerCase();
    if (['password', 'hidden', 'file', 'checkbox', 'radio', 'submit', 'button'].includes(type)) return null;
    const autocomplete = String(field.autocomplete || '').toLowerCase();
    const text = [field.name, field.id, field.placeholder, field.label, autocomplete].filter(Boolean).join(' ').toLowerCase();
    const isWork = /work|business|company|office|עבודה|עסקי|ארגוני/.test(text);
    if (type === 'email' || /(^|\s)e-?mail(\s|$)|אימייל|דוא.?ל/.test(text)) return isWork ? 'workEmail' : 'email';
    if (type === 'tel' || /phone|mobile|telephone|טלפון|נייד/.test(text)) return 'phone';
    if (autocomplete === 'name' || /full.?name|display.?name|שם מלא/.test(text)) return 'fullName';
    if ((field.tagName === 'TEXTAREA' || type === 'text') && /signature|חתימה|sign.?off/.test(text)) return 'signature';
    if (type === 'search' || /search|query|חיפוש/.test(text)) return 'search';
    return null;
  }

  return { classifyDescriptor };
});
