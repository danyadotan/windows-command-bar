const { mkdirSync } = require('node:fs');
const { spawnSync } = require('node:child_process');
const path = require('node:path');

if (process.platform !== 'win32') throw new Error('The WinPilot native host can only be built on Windows');
const windows = process.env.WINDIR || 'C:\\Windows';
const candidates = [
  path.join(windows, 'Microsoft.NET', 'Framework64', 'v4.0.30319', 'csc.exe'),
  path.join(windows, 'Microsoft.NET', 'Framework', 'v4.0.30319', 'csc.exe')
];
const compiler = candidates.find(candidate => require('node:fs').existsSync(candidate));
if (!compiler) throw new Error('The .NET Framework C# compiler was not found');
const output = path.resolve('native-host/bin/WinPilotNativeHost.exe');
mkdirSync(path.dirname(output), { recursive: true });
const result = spawnSync(compiler, [
  '/nologo', '/optimize+', '/target:exe', `/out:${output}`,
  '/reference:System.Security.dll', '/reference:System.Web.Extensions.dll',
  path.resolve('native-host/WinPilotNativeHost.cs')
], { stdio: 'inherit' });
if (result.status !== 0) process.exit(result.status || 1);
