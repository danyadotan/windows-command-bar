import { describe, expect, it } from 'vitest';

const { classifyDescriptor } = require('../browser-extension/field-detector.js') as {
  classifyDescriptor(field: Record<string, string>): string | null;
};

describe('browser form field detector', () => {
  it('distinguishes personal and work email fields', () => {
    expect(classifyDescriptor({ type: 'email', name: 'email' })).toBe('email');
    expect(classifyDescriptor({ type: 'email', name: 'company_email' })).toBe('workEmail');
  });

  it('recognizes Hebrew labels for name, phone, and signature', () => {
    expect(classifyDescriptor({ type: 'text', label: 'שם מלא' })).toBe('fullName');
    expect(classifyDescriptor({ type: 'tel', label: 'מספר נייד' })).toBe('phone');
    expect(classifyDescriptor({ type: 'text', label: 'חתימה' })).toBe('signature');
  });

  it('never classifies passwords, hidden fields, or file inputs', () => {
    expect(classifyDescriptor({ type: 'password', name: 'email' })).toBeNull();
    expect(classifyDescriptor({ type: 'hidden', name: 'fullName' })).toBeNull();
    expect(classifyDescriptor({ type: 'file', name: 'signature' })).toBeNull();
  });

  it('recognizes repeated search fields', () => {
    expect(classifyDescriptor({ type: 'search', placeholder: 'חיפוש בהגדרות' })).toBe('search');
  });
});
