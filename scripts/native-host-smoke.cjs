const { spawn } = require('node:child_process');
const path = require('node:path');

const executable = process.argv[2];
const origin = 'chrome-extension://dbkcdkaciiebdadcnmbmeljjfalbobkh/';
if (!executable || !path.isAbsolute(path.resolve(executable))) throw new Error('Expected a packaged WinPilot executable path');

const body = Buffer.from(JSON.stringify({ type: 'ping' }), 'utf8');
const frame = Buffer.alloc(body.length + 4);
frame.writeUInt32LE(body.length, 0); body.copy(frame, 4);

// A URL-shaped positional argument can be consumed by Chromium when an Electron
// executable is launched directly. Chrome and Edge still use the standard
// positional origin; this explicit switch only makes the packaged smoke test
// exercise the same host transport deterministically.
const child = spawn(path.resolve(executable), [`--winpilot-native-origin=${origin}`, '--parent-window=0'], { stdio: ['pipe', 'pipe', 'pipe'], windowsHide: true });
const stdout = [];
const stderr = [];
const timeout = setTimeout(() => { child.kill(); throw new Error('Packaged native host timed out'); }, 20_000);

child.stdout.on('data', chunk => stdout.push(chunk));
child.stderr.on('data', chunk => stderr.push(chunk));
child.on('error', error => { clearTimeout(timeout); throw error; });
child.on('close', code => {
  clearTimeout(timeout);
  const output = Buffer.concat(stdout);
  if (code !== 0) throw new Error(`Native host exited with ${code}: ${Buffer.concat(stderr).toString('utf8')}`);
  if (output.length < 4) throw new Error('Native host returned no framed response');
  const length = output.readUInt32LE(0);
  if (output.length !== length + 4) throw new Error('Native host returned an invalid frame');
  const response = JSON.parse(output.subarray(4).toString('utf8'));
  if (response.ok !== true || response.type !== 'pong') throw new Error(`Unexpected native host response: ${JSON.stringify(response)}`);
  process.stdout.write('packaged native host ping passed\n');
});

child.stdin.end(frame);
