import { execFile } from 'node:child_process';

export interface ProcessRunner {
  run(file: string, args: string[]): Promise<{ stdout: string; stderr: string; exitCode: number }>;
}

const defaultRunner: ProcessRunner = {
  run: (file, args) => new Promise(resolve => {
    execFile(file, args, { windowsHide: true, timeout: 120_000, maxBuffer: 1024 * 1024 }, (error, stdout, stderr) => {
      resolve({ stdout, stderr, exitCode: typeof error?.code === 'number' ? error.code : error ? 1 : 0 });
    });
  })
};

const UPDATE_SCAN_SCRIPT = [
  "$session = New-Object -ComObject Microsoft.Update.Session",
  "$searcher = $session.CreateUpdateSearcher()",
  "$result = $searcher.Search(\"IsInstalled=0 and Type='Software'\")",
  "$result.Updates | Select-Object Title, @{Name='KB';Expression={$_.KBArticleIDs -join ','}}, IsDownloaded | ConvertTo-Json -Compress"
].join('; ');

function cleanOutput(stdout: string, stderr: string): string {
  return (stdout.trim() || stderr.trim() || 'הפעולה הסתיימה ללא פלט').slice(0, 100_000);
}

export class WindowsHelper {
  constructor(private readonly runner: ProcessRunner = defaultRunner, private readonly platform = process.platform) {}

  private assertWindows() { if (this.platform !== 'win32') throw new Error('כלי Windows זמינים רק במחשב Windows'); }

  async searchApps(query: string) {
    this.assertWindows();
    const clean = query.trim();
    if (clean.length < 2 || clean.length > 80 || /[\x00-\x1f]/.test(clean)) throw new Error('שאילתת חיפוש אינה תקינה');
    const result = await this.runner.run('winget.exe', ['search', '--query', clean, '--source', 'winget', '--accept-source-agreements', '--disable-interactivity']);
    return { action: 'winget-search' as const, output: cleanOutput(result.stdout, result.stderr), exitCode: result.exitCode };
  }

  async installApp(packageId: string, confirmed: boolean) {
    this.assertWindows();
    if (!confirmed) throw new Error('נדרש אישור מפורש להתקנת אפליקציה');
    const clean = packageId.trim();
    if (!/^[A-Za-z0-9][A-Za-z0-9._+-]{1,127}$/.test(clean)) throw new Error('מזהה חבילה אינו תקין');
    const result = await this.runner.run('winget.exe', ['install', '--id', clean, '--exact', '--source', 'winget', '--accept-source-agreements', '--accept-package-agreements', '--disable-interactivity']);
    return { action: 'winget-install' as const, output: cleanOutput(result.stdout, result.stderr), exitCode: result.exitCode };
  }

  async scanUpdates() {
    this.assertWindows();
    const result = await this.runner.run('powershell.exe', ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'RemoteSigned', '-Command', UPDATE_SCAN_SCRIPT]);
    return { action: 'update-scan' as const, output: cleanOutput(result.stdout, result.stderr), exitCode: result.exitCode };
  }
}
