// Verify that every internal link and asset reference in the built site resolves.
//
//   npm run build && npm run check:links
//
// Honors BASE_PATH (e.g. /NASA-ULI-Web-App/) so it also works for GitHub Pages builds.
import { readdir, readFile, stat } from 'node:fs/promises';
import { join } from 'node:path';

const dist = process.argv[2] ?? 'dist';
const base = (process.env.BASE_PATH ?? '/').replace(/\/$/, '');

async function* htmlFiles(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, entry.name);
    if (entry.isDirectory()) yield* htmlFiles(p);
    else if (entry.name.endsWith('.html')) yield p;
  }
}

const exists = async (p) => !!(await stat(p).catch(() => null))?.isFile();

let checked = 0;
const broken = [];
for await (const file of htmlFiles(dist)) {
  const html = await readFile(file, 'utf8');
  for (const [, ref] of html.matchAll(/(?:href|src)="(\/[^"#?]*)/g)) {
    checked++;
    if (base && !ref.startsWith(`${base}/`) && ref !== base) {
      broken.push(`${file}: ${ref} (missing base ${base})`);
      continue;
    }
    const path = ref.slice(base.length) || '/';
    const candidates = [join(dist, path), join(dist, path, 'index.html'), join(dist, `${path}.html`)];
    if (!(await Promise.all(candidates.map(exists))).some(Boolean)) broken.push(`${file}: ${ref}`);
  }
}

console.log(`Checked ${checked} internal references.`);
if (broken.length) {
  console.error(`Broken (${broken.length}):\n  ${broken.join('\n  ')}`);
  process.exit(1);
}
