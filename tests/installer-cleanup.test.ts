import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

describe('Windows uninstaller cleanup', () => {
  it('removes only the WinPilot native-host entries and generated files', async () => {
    const script = await readFile(path.join(process.cwd(), 'build', 'installer.nsh'), 'utf8');
    expect(script).toContain('Software\\Google\\Chrome\\NativeMessagingHosts\\io.dynamicbridge.winpilot');
    expect(script).toContain('Software\\Microsoft\\Edge\\NativeMessagingHosts\\io.dynamicbridge.winpilot');
    expect(script).toContain('$APPDATA\\WinPilot\\native-messaging\\io.dynamicbridge.winpilot.json');
    expect(script).toContain('${IfNot} ${isUpdated}');
    expect(script).toContain('${EndIf}');
    expect(script).not.toMatch(/RMDir\s+\/r/i);
  });
});
