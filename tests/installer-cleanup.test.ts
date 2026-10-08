import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

describe('Windows uninstaller cleanup', () => {
  it('registers after install and removes entries only on a real uninstall', async () => {
    const script = await readFile(path.join(process.cwd(), 'build', 'installer.nsh'), 'utf8');
    expect(script).toContain('Software\\Google\\Chrome\\NativeMessagingHosts\\io.dynamicbridge.winpilot');
    expect(script).toContain('Software\\Microsoft\\Edge\\NativeMessagingHosts\\io.dynamicbridge.winpilot');
    expect(script).toContain('$INSTDIR\\resources\\native-host\\io.dynamicbridge.winpilot.json');
    expect(script).toMatch(/!macro customInstall[\s\S]*WriteRegStr HKCU/);
    expect(script).toContain('$APPDATA\\WinPilot\\native-messaging\\io.dynamicbridge.winpilot.json');
    expect(script).toContain('${IfNot} ${isUpdated}');
    expect(script).toContain('${EndIf}');
    expect(script).not.toMatch(/RMDir\s+\/r/i);
  });
});
