import { describe, expect, it } from 'vitest';
import { routeTask } from '../src/main/model-router';

describe('routeTask', () => {
  it('keeps private tasks on-device', () => {
    const route = routeTask({ text: 'נסח מייל עבור private@example.com', provider: 'openai', previewOnly: true });
    expect(route).toMatchObject({ tier: 'on-device', containsPrivateData: true });
  });

  it('uses reasoning tier for complex work', () => {
    const route = routeTask({ text: 'נתח ותכנן ארכיטקטורה מרובת סוכנים', provider: 'anthropic', previewOnly: true });
    expect(route).toMatchObject({ tier: 'cloud-reasoning', complexity: 'complex' });
  });

  it('blocks private data when no local runtime exists', () => {
    const route = routeTask({ text: 'האימייל שלי הוא private@example.com', provider: 'zai', previewOnly: true }, false);
    expect(route).toMatchObject({ tier: 'privacy-hold', model: 'none' });
  });

  it('reports the configured local model in its decision', () => {
    const route = routeTask({ text: 'שלום קצר', provider: 'openai', previewOnly: true }, true, 'foundry-phi');
    expect(route).toMatchObject({ tier: 'on-device', model: 'foundry-phi' });
  });
});
