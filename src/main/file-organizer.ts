import { randomUUID } from 'node:crypto';
import { lstat, mkdir, readdir, readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { FileOrganizationPlan, FileOrganizationResult } from '../shared/contracts';
import type { SecretCipher } from './provider-vault';

interface PlannedMove { source: string; destination: string; category: string; size: number; mtimeMs: number }
interface InternalPlan { id: string; expiresAt: number; moves: PlannedMove[] }
interface JournalEntry { id: string; createdAt: string; undoneAt?: string; moves: Array<{ source: string; destination: string }> }

const CATEGORIES: Array<[Set<string>, string]> = [
  [new Set(['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.heic']), 'Images'],
  [new Set(['.pdf', '.doc', '.docx', '.txt', '.rtf', '.xls', '.xlsx', '.ppt', '.pptx', '.csv']), 'Documents'],
  [new Set(['.zip', '.rar', '.7z', '.tar', '.gz']), 'Archives'],
  [new Set(['.mp3', '.wav', '.m4a', '.flac', '.ogg']), 'Audio'],
  [new Set(['.mp4', '.mov', '.avi', '.mkv', '.webm']), 'Video'],
  [new Set(['.exe', '.msi', '.msix', '.appx']), 'Installers']
];

function categoryFor(file: string) { const ext = path.extname(file).toLowerCase(); return CATEGORIES.find(([extensions]) => extensions.has(ext))?.[1] ?? 'Other'; }

export class FileOrganizer {
  private readonly plans = new Map<string, InternalPlan>();
  private readonly journalFile: string;
  constructor(private readonly downloads: string, private readonly dataRoot: string, private readonly cipher: SecretCipher) { this.journalFile = path.join(dataRoot, 'file-actions.enc'); }

  async preview(): Promise<FileOrganizationPlan> {
    const entries = await readdir(this.downloads, { withFileTypes: true });
    const moves: PlannedMove[] = [];
    for (const entry of entries) {
      if (!entry.isFile() || entry.isSymbolicLink() || entry.name.startsWith('.')) continue;
      const source = path.join(this.downloads, entry.name); const stat = await lstat(source);
      if (stat.isSymbolicLink()) continue;
      const category = categoryFor(entry.name); const destination = await this.availableDestination(category, entry.name);
      moves.push({ source, destination, category, size: stat.size, mtimeMs: stat.mtimeMs });
    }
    const plan: InternalPlan = { id: randomUUID(), expiresAt: Date.now() + 15 * 60_000, moves };
    this.plans.set(plan.id, plan);
    return { id: plan.id, expiresAt: new Date(plan.expiresAt).toISOString(), moves: moves.map(move => ({ source: path.basename(move.source), destination: path.relative(this.downloads, move.destination), category: move.category, size: move.size })) };
  }

  async execute(planId: string, confirmed: boolean): Promise<FileOrganizationResult> {
    if (!confirmed) throw new Error('נדרש אישור מפורש לארגון הקבצים');
    if (!this.cipher.available()) throw new Error('הצפנה מאובטחת אינה זמינה; הארגון נעצר כדי לשמור יכולת Undo');
    const plan = this.plans.get(planId); this.plans.delete(planId);
    if (!plan || plan.expiresAt < Date.now()) throw new Error('תוכנית הארגון פגה; יש ליצור preview חדש');
    const completed: Array<{ source: string; destination: string }> = []; const errors: string[] = []; let skipped = 0;
    for (const move of plan.moves) {
      try {
        this.assertInside(move.source); this.assertInside(move.destination);
        const current = await lstat(move.source);
        if (!current.isFile() || current.isSymbolicLink() || current.size !== move.size || current.mtimeMs !== move.mtimeMs) { skipped++; continue; }
        await mkdir(path.dirname(move.destination), { recursive: true });
        try { await lstat(move.destination); skipped++; continue; } catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }
        await rename(move.source, move.destination); completed.push({ source: move.source, destination: move.destination });
      } catch (error) { errors.push(`${path.basename(move.source)}: ${error instanceof Error ? error.message : 'שגיאה'}`); }
    }
    const actionId = randomUUID(); if (completed.length) await this.appendJournal({ id: actionId, createdAt: new Date().toISOString(), moves: completed });
    return { actionId, moved: completed.length, skipped, errors };
  }

  async undoLast(confirmed: boolean): Promise<FileOrganizationResult> {
    if (!confirmed) throw new Error('נדרש אישור מפורש לביטול הארגון');
    const journal = await this.readJournal(); const entry = journal.find(item => !item.undoneAt);
    if (!entry) throw new Error('לא נמצאה פעולת ארגון שניתן לבטל');
    let moved = 0; let skipped = 0; const errors: string[] = [];
    for (const move of [...entry.moves].reverse()) {
      try {
        this.assertInside(move.source); this.assertInside(move.destination);
        try { await lstat(move.source); skipped++; continue; } catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }
        await rename(move.destination, move.source); moved++;
      } catch (error) { errors.push(`${path.basename(move.destination)}: ${error instanceof Error ? error.message : 'שגיאה'}`); }
    }
    entry.undoneAt = new Date().toISOString(); await this.writeJournal(journal);
    return { actionId: entry.id, moved, skipped, errors };
  }

  private assertInside(target: string) { const relative = path.relative(path.resolve(this.downloads), path.resolve(target)); if (relative.startsWith('..') || path.isAbsolute(relative)) throw new Error('נתיב מחוץ ל־Downloads נחסם'); }
  private async availableDestination(category: string, name: string) {
    const parsed = path.parse(name); let candidate = path.join(this.downloads, category, name); let counter = 1;
    while (true) { try { await lstat(candidate); candidate = path.join(this.downloads, category, `${parsed.name} (${counter++})${parsed.ext}`); } catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') return candidate; throw error; } }
  }
  private async readJournal(): Promise<JournalEntry[]> { try { return JSON.parse(this.cipher.decrypt(Buffer.from(await readFile(this.journalFile, 'utf8'), 'base64'))) as JournalEntry[]; } catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') return []; throw error; } }
  private async appendJournal(entry: JournalEntry) { const journal = await this.readJournal(); journal.unshift(entry); await this.writeJournal(journal.slice(0, 100)); }
  private async writeJournal(journal: JournalEntry[]) { if (!this.cipher.available()) throw new Error('הצפנה מאובטחת אינה זמינה'); await mkdir(this.dataRoot, { recursive: true }); const temporary = `${this.journalFile}.tmp`; await writeFile(temporary, this.cipher.encrypt(JSON.stringify(journal)).toString('base64'), { encoding: 'utf8', mode: 0o600 }); await rename(temporary, this.journalFile); }
}
