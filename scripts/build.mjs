import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { build } from 'esbuild';

const root = resolve(import.meta.dirname, '..');
const sourceDirectory = resolve(root, 'src');

const [template, styles, bundleResult] = await Promise.all([
  readFile(resolve(sourceDirectory, 'app.html'), 'utf8'),
  readFile(resolve(sourceDirectory, 'styles.css'), 'utf8'),
  build({
    entryPoints: [resolve(sourceDirectory, 'main.js')],
    bundle: true,
    format: 'iife',
    target: ['chrome90', 'firefox88', 'safari14'],
    write: false,
  }),
]);
const controller = bundleResult.outputFiles[0].text;

const output = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Tavern Mapper — Table Control</title>
<style>
${styles.trimEnd()}
</style>
</head>
<body>
${template.trimEnd()}
<script>
${controller.trimEnd()}
</script>
</body>
</html>
`;

const forbiddenExternalReferences = [
  /<script\b[^>]*\bsrc\s*=/i,
  /<link\b[^>]*\brel\s*=\s*["']?stylesheet/i,
  /<script\b[^>]*\btype\s*=\s*["']module["']/i,
  /(?:src|href)\s*=\s*["']https?:\/\//i,
];
if (forbiddenExternalReferences.some(pattern => pattern.test(output))) {
  throw new Error('Build aborted: tavern-mapper.html must remain a self-contained, offline HTML file.');
}

await writeFile(resolve(root, 'tavern-mapper.html'), output, 'utf8');
console.log(`Built self-contained tavern-mapper.html (${Buffer.byteLength(output)} bytes)`);