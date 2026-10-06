import { describe, expect, it, vi } from 'vitest';
import { WindowsHelper, type ProcessRunner } from '../src/main/windows-helper';

function fakeRunner(): ProcessRunner & { run: ReturnType<typeof vi.fn> } {
  return { run: vi.fn(async () => ({ stdout: 'ok', stderr: '', exitCode: 0 })) };
}

describe('WindowsHelper', () => {
  it('passes search text as one argument without a shell', async () => {
    const runner = fakeRunner(); const helper = new WindowsHelper(runner, 'win32');
    await helper.searchApps('Power Toys & calc.exe');
    expect(runner.run).toHaveBeenCalledWith('winget.exe', ['search', '--query', 'Power Toys & calc.exe', '--source', 'winget', '--accept-source-agreements', '--disable-interactivity']);
  });

  it('requires confirmation and a strict package ID', async () => {
    const runner = fakeRunner(); const helper = new WindowsHelper(runner, 'win32');
    await expect(helper.installApp('Microsoft.PowerToys', false)).rejects.toThrow('אישור');
    await expect(helper.installApp('PowerToys & calc.exe', true)).rejects.toThrow('אינו תקין');
    expect(runner.run).not.toHaveBeenCalled();
  });

  it('installs only an exact winget package', async () => {
    const runner = fakeRunner(); const helper = new WindowsHelper(runner, 'win32');
    await helper.installApp('Microsoft.PowerToys', true);
    expect(runner.run).toHaveBeenCalledWith('winget.exe', ['install', '--id', 'Microsoft.PowerToys', '--exact', '--source', 'winget', '--accept-source-agreements', '--accept-package-agreements', '--disable-interactivity']);
  });

  it('blocks execution off Windows', async () => {
    const runner = fakeRunner();
    await expect(new WindowsHelper(runner, 'linux').scanUpdates()).rejects.toThrow('Windows');
    expect(runner.run).not.toHaveBeenCalled();
  });

  it('uses a fixed non-interactive PowerShell update scan', async () => {
    const runner = fakeRunner(); await new WindowsHelper(runner, 'win32').scanUpdates();
    const [file, args] = runner.run.mock.calls[0];
    expect(file).toBe('powershell.exe'); expect(args).toContain('-NonInteractive'); expect(args.join(' ')).toContain('Microsoft.Update.Session');
  });
});
