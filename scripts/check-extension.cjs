// Validate the extension and optionally stage only runtime files for a review ZIP.
// This is a source/package gate, not Chrome/Windows acceptance or store approval.
const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const { Script } = require('node:vm');
const root = path.resolve(__dirname, '..');
const directory = path.join(root, 'browser-extension');
const manifest = JSON.parse(fs.readFileSync(path.join(directory, 'manifest.json'), 'utf8'));
function check(value, message) { if (!value) throw new Error(message); }
check(manifest.manifest_version === 3, 'Manifest V3 required');
check(!manifest.host_permissions?.length && !manifest.content_scripts?.length, 'Unexpected persistent page access');
check(manifest.permissions.includes('activeTab') && manifest.permissions.includes('scripting'), 'Missing user-activated access');
check(!manifest.permissions.includes('tabs') && !manifest.permissions.includes('nativeMessaging'), 'Overbroad required permission');
const id = createHash('sha256').update(Buffer.from(manifest.key, 'base64')).digest('hex').slice(0, 32)
  .replace(/[0-9a-f]/g, char => String.fromCharCode(97 + parseInt(char, 16)));
const host = JSON.parse(fs.readFileSync(path.join(root, 'native-host/io.dynamicbridge.winpilot.json'), 'utf8'));
check(JSON.stringify(host.allowed_origins) === JSON.stringify([`chrome-extension://${id}/`]), 'Host manifest ID mismatch');
for (const file of ['native-host/WinPilotNativeHost.cs', 'src/main/native-messaging.ts', 'scripts/native-host-smoke.cjs']) {
  check(fs.readFileSync(path.join(root, file), 'utf8').includes(id), `Native ID mismatch: ${file}`);
}
const expectedIndex = process.argv.indexOf('--expected-id');
if (expectedIndex !== -1) check(process.argv[expectedIndex + 1] === id, 'Store item ID differs: update every allowlist and rebuild Windows host before proceeding');
for (const [size, file] of Object.entries(manifest.icons)) {
  const png = fs.readFileSync(path.join(directory, file));
  check(png.subarray(1, 4).toString() === 'PNG' && png.readUInt32BE(16) === Number(size) && png.readUInt32BE(20) === Number(size), `Invalid PNG: ${file}`);
}
const files = ['manifest.json', 'background.js', 'popup.html', 'popup.css', 'popup.js', 'field-detector.js', 'content.js', 'privacy.html', ...Object.values(manifest.icons)];
for (const file of files) {
  check(fs.existsSync(path.join(directory, file)), `Missing runtime resource: ${file}`);
  if (file.endsWith('.js')) new Script(fs.readFileSync(path.join(directory, file), 'utf8'), { filename: file });
}
if (process.argv.includes('--stage')) {
  const stage = path.join(root, 'release/extension');
  fs.rmSync(stage, { recursive: true, force: true });
  for (const file of files) {
    const target = path.join(stage, file);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.copyFileSync(path.join(directory, file), target);
  }
}
console.log(`Extension source/package gate passed; development ID ${id}. Store identity and browser acceptance remain unverified.`);
