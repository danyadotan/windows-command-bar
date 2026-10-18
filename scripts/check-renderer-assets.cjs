const { readFileSync, statSync } = require('node:fs');
const path = require('node:path');
const { pathToFileURL, fileURLToPath } = require('node:url');

// Validate the built output using the same file URL resolution as loadFile().
const root = path.resolve('dist');
const documentUrl = pathToFileURL(path.join(root, 'index.html'));
const html = readFileSync(fileURLToPath(documentUrl), 'utf8');
let scripts = 0;
let styles = 0;
for (const tag of html.matchAll(/<(script|link)\b[^>]*>/gi)) {
  const attributes = Object.fromEntries([...tag[0].matchAll(/([\w-]+)\s*=\s*["']([^"']*)["']/g)].map(match => [match[1].toLowerCase(), match[2]]));
  const script = tag[1].toLowerCase() === 'script';
  if (!script && !['stylesheet', 'modulepreload'].includes(attributes.rel)) continue;
  const reference = script ? attributes.src : attributes.href;
  if (!reference) continue;
  if (/^(?:[a-z]+:|\/|\\)/i.test(reference)) throw new Error(`Renderer asset must be relative for Electron: ${reference}`);
  const resolved = fileURLToPath(new URL(reference, documentUrl));
  const relative = path.relative(root, resolved);
  if (relative.startsWith('..') || path.isAbsolute(relative)) throw new Error(`Renderer asset escapes dist: ${reference}`);
  if (!statSync(resolved).isFile()) throw new Error(`Missing renderer asset: ${reference}`);
  if (script) scripts++;
  if (attributes.rel === 'stylesheet') styles++;
}
if (!scripts || !styles) throw new Error('Built renderer must reference both JavaScript and CSS.');
console.log(`Renderer file URLs verified: ${scripts} script(s), ${styles} stylesheet(s).`);
