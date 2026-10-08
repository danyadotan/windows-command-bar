import type { CommandRequest, RoutingDecision, TaskComplexity } from '../shared/contracts';
import { selectCloudModel } from './model-selection';

const PRIVATE_PATTERN = /\b[\w.+-]+@[\w.-]+\.[a-z]{2,}\b|\b(?:\+?972|0)5\d[- ]?\d{3}[- ]?\d{4}\b|תעודת זהות|סיסמה|פרטי אשראי|כתובת מגורים/i;
const COMPLEX_PATTERN = /תכנן|השווה|נתח|אסטרטג|ארכיטקט|debug|research|מחקר|מספר שלבים|סוכנים/i;
const MEDIUM_PATTERN = /סכם|נסח|תרגם|ארגן|התקן|עדכון|קבצים|טופס|חפש/i;

export function estimateTokens(text: string): number {
  return Math.max(1, Math.ceil(text.length / 3.2));
}

export function routeTask(request: CommandRequest, localModelAvailable = true, localModel = 'phi-4-mini-local'): RoutingDecision {
  const text = request.text.trim();
  const containsPrivateData = PRIVATE_PATTERN.test(text);
  const complexity: TaskComplexity = COMPLEX_PATTERN.test(text) || text.length > 600 ? 'complex' : MEDIUM_PATTERN.test(text) || text.length > 180 ? 'medium' : 'simple';
  const estimatedInputTokens = estimateTokens(text);
  if (containsPrivateData && localModelAvailable) return { tier: 'on-device', model: localModel, complexity, reason: 'זוהה מידע פרטי; העיבוד נשאר במכשיר', containsPrivateData, estimatedInputTokens };
  if (containsPrivateData) return { tier: 'privacy-hold', model: 'none', complexity, reason: 'המשימה נעצרה: מידע פרטי זוהה אך runtime מקומי אינו מוגדר', containsPrivateData, estimatedInputTokens };
  if (complexity === 'simple' && localModelAvailable) return { tier: 'on-device', model: localModel, complexity, reason: 'משימה קצרה שמתאימה למודל חסכוני מקומי', containsPrivateData, estimatedInputTokens };
  if (complexity === 'complex') return { tier: 'cloud-reasoning', model: selectCloudModel(request.provider, 'cloud-reasoning'), complexity, reason: 'נדרש תכנון רב־שלבי והסקה עמוקה', containsPrivateData, estimatedInputTokens };
  return { tier: 'cloud-fast', model: selectCloudModel(request.provider, 'cloud-fast'), complexity, reason: 'איזון בין מהירות לאיכות', containsPrivateData, estimatedInputTokens };
}
