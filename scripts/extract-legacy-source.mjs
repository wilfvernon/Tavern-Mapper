import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const sourcePath = resolve(root, 'tavern-mapper_6.html');
const source = await readFile(sourcePath, 'utf8');

if (process.env.CONFIRM_LEGACY_MIGRATION !== '1') {
  throw new Error('Legacy extraction overwrites modular source. Re-run with CONFIRM_LEGACY_MIGRATION=1 only to restart the migration.');
}

const styleMatch = source.match(/<style>\n([\s\S]*?)\n<\/style>/);
const bodyMatch = source.match(/<body>\n([\s\S]*?)\n<script>\n\(function \(\) \{/);
const scriptMatch = source.match(/<script>\n(\(function \(\) \{[\s\S]*?\n\}\)\(\);)\n<\/script>\n<\/body>/);

if (!styleMatch || !bodyMatch || !scriptMatch) {
  throw new Error('The legacy HTML boundaries changed; extraction was aborted.');
}

await mkdir(resolve(root, 'src'), { recursive: true });
await writeFile(resolve(root, 'src/app.html'), `${bodyMatch[1]}\n`, 'utf8');
await writeFile(resolve(root, 'src/styles.css'), `${styleMatch[1]}\n`, 'utf8');
await writeFile(resolve(root, 'src/main.js'), `${scriptMatch[1]}\n`, 'utf8');

console.log('Extracted the complete application template, styles, and controller.');
