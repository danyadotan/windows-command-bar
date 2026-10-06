import { randomUUID } from 'node:crypto';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { SaveItemRequest, SavedItem, SavedItemKind } from '../shared/contracts';

const TOPICS: Array<[RegExp, string, string[]]> = [
  [/עיצוב|design|ui|ux|צבע|font|ממשק/i, 'עיצוב והשראה', ['עיצוב', 'השראה']],
  [/מתכון|אוכל|recipe|cook/i, 'בית ואוכל', ['אוכל']],
  [/קוד|code|github|program|api|פיתוח/i, 'פיתוח', ['פיתוח', 'טכנולוגיה']],
  [/טיול|travel|מלון|flight|טיסה/i, 'נסיעות', ['נסיעות']],
  [/ללמוד|קורס|article|מאמר|research/i, 'לקרוא וללמוד', ['למידה']],
  [/לקנות|מחיר|shop|product|amazon/i, 'רשימת קניות', ['קניות']]
];

function inferKind(content: string, requested?: SavedItemKind): SavedItemKind {
  if (requested) return requested;
  try { new URL(content.trim()); return 'link'; } catch { return /השראה|inspir/i.test(content) ? 'inspiration' : 'note'; }
}

function organize(content: string, kind: SavedItemKind) {
  const match = TOPICS.find(([pattern]) => pattern.test(content));
  if (match) return { collection: match[1], tags: [...match[2], kind] };
  if (kind === 'screenshot' || kind === 'inspiration') return { collection: 'השראה', tags: ['השראה', kind] };
  if (kind === 'link') return { collection: 'לקרוא אחר כך', tags: ['קישור'] };
  return { collection: 'תיבת כניסה', tags: ['הערה'] };
}

export class LocalLibrary {
  private readonly file: string;
  private readonly mediaDir: string;

  constructor(private readonly root: string) {
    this.file = path.join(root, 'library.json');
    this.mediaDir = path.join(root, 'media');
  }

  async list(): Promise<SavedItem[]> {
    try { return JSON.parse(await readFile(this.file, 'utf8')) as SavedItem[]; }
    catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') return []; throw error; }
  }

  async save(request: SaveItemRequest): Promise<SavedItem> {
    const content = request.content.trim();
    if (!content) throw new Error('אי אפשר לשמור פריט ריק');
    const kind = inferKind(content, request.kind);
    const context = organize(`${request.title ?? ''} ${content}`, kind);
    const url = kind === 'link' ? new URL(content) : undefined;
    const item: SavedItem = {
      id: randomUUID(), kind,
      title: request.title?.trim() || (url ? url.hostname.replace(/^www\./, '') : content.slice(0, 70)),
      content, source: url?.hostname, ...context, createdAt: new Date().toISOString()
    };
    const items = await this.list();
    items.unshift(item);
    await this.write(items);
    return item;
  }

  async saveScreenshot(png: Buffer): Promise<SavedItem> {
    if (!png.length) throw new Error('לא נמצאה תמונה בלוח ההעתקה');
    await mkdir(this.mediaDir, { recursive: true });
    const id = randomUUID();
    const imagePath = path.join(this.mediaDir, `${id}.png`);
    await writeFile(imagePath, png);
    const item: SavedItem = {
      id, kind: 'screenshot', title: `צילום מסך ${new Date().toLocaleString('he-IL')}`,
      content: imagePath, tags: ['צילום מסך', 'השראה'], collection: 'השראה', createdAt: new Date().toISOString()
    };
    const items = await this.list();
    items.unshift(item);
    await this.write(items);
    return item;
  }

  private async write(items: SavedItem[]) {
    await mkdir(this.root, { recursive: true });
    const temporary = `${this.file}.tmp`;
    await writeFile(temporary, JSON.stringify(items, null, 2), 'utf8');
    await rename(temporary, this.file);
  }
}
