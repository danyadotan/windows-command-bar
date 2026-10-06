import { describe, expect, it } from 'vitest';
import { planCommand } from '../src/main/planner';

describe('planCommand', () => {
  it('never installs updates without approval', () => {
    const result = planCommand({ text: 'בדוק עדכוני Windows', provider: 'openai', previewOnly: true });
    expect(result.kind).toBe('plan');
    expect(result.actions.find(action => action.id === 'windows-update-install')?.requiresApproval).toBe(true);
  });

  it('keeps file discovery read-only', () => {
    const result = planCommand({ text: 'סדר את תיקיית ההורדות', provider: 'anthropic', previewOnly: true });
    expect(result.actions[0]).toMatchObject({ id: 'files-scan', risk: 'read', requiresApproval: false });
    expect(result.actions[1]).toMatchObject({ id: 'files-organize', requiresApproval: true });
  });
});
