import { afterEach, describe, expect, it } from 'vitest';
import { selectCloudModel } from '../src/main/model-selection';

afterEach(() => {
  delete process.env.WINPILOT_OPENAI_MODEL;
  delete process.env.WINPILOT_OPENAI_FAST_MODEL;
  delete process.env.WINPILOT_OPENAI_REASONING_MODEL;
});

describe('selectCloudModel', () => {
  it('uses distinct current defaults for fast and reasoning work', () => {
    expect(selectCloudModel('openai', 'cloud-fast')).toBe('gpt-6-luna');
    expect(selectCloudModel('openai', 'cloud-reasoning')).toBe('gpt-6-astra');
    expect(selectCloudModel('anthropic', 'cloud-fast')).toBe('claude-haiku-5-5');
    expect(selectCloudModel('anthropic', 'cloud-reasoning')).toBe('claude-fable-5-1');
    expect(selectCloudModel('zai', 'cloud-fast')).toBe('glm-5.3-flash');
    expect(selectCloudModel('zai', 'cloud-reasoning')).toBe('glm-5.3');
  });

  it('prefers a tier override over the backwards-compatible provider override', () => {
    process.env.WINPILOT_OPENAI_MODEL = 'general-model';
    process.env.WINPILOT_OPENAI_FAST_MODEL = 'fast-model';
    expect(selectCloudModel('openai', 'cloud-fast')).toBe('fast-model');
    expect(selectCloudModel('openai', 'cloud-reasoning')).toBe('general-model');
  });
});
