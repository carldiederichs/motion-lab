import { readFile, writeFile, mkdir, rm, readdir, lstat } from 'node:fs/promises';
import path from 'node:path';

import { build } from 'esbuild';

import { toolkitZip } from './archive.ts';
import { compileBrowser } from './browser.ts';
import { printLine } from './output.ts';
import { ROOT, render, slugPattern, validate } from './renderer.ts';
import { catalogueSchema } from '../engine/model.ts';
const out = path.join(ROOT, 'dist');
if ((await lstat(out).catch(() => null))?.isSymbolicLink() === true)
  throw Error('dist cannot be a symlink');
await rm(out, { recursive: true, force: true });
await mkdir(path.join(out, 'lessons'), { recursive: true });
await mkdir(path.join(out, 'downloads'), { recursive: true });
const catalogue = catalogueSchema.parse(
  JSON.parse(await readFile(path.join(ROOT, 'examples/catalogue.json'), 'utf8')),
);
if (!Array.isArray(catalogue) || new Set(catalogue.map((x) => x.slug)).size !== catalogue.length)
  throw Error('Invalid catalogue');
for (const item of catalogue) {
  if (!slugPattern.test(item.slug)) throw Error('Invalid catalogue slug');
  const spec = validate(
    JSON.parse(await readFile(path.join(ROOT, 'examples', `${item.slug}.json`), 'utf8')),
  );
  if (spec.slug !== item.slug) throw Error('Catalogue and spec differ');
  await writeFile(path.join(out, 'lessons', `${spec.slug}.html`), await render(spec));
}
for (const file of await readdir(path.join(ROOT, 'site'))) {
  if (!['index.html', 'app.ts', 'style.css', 'icon.svg', '404.html'].includes(file))
    throw Error(`Unexpected site file: ${file}`);
  const info = await lstat(path.join(ROOT, 'site', file));
  if (!info.isFile() || info.isSymbolicLink()) throw Error('Site assets must be regular files');
  if (file === 'app.ts') {
    await build({
      entryPoints: [path.join(ROOT, 'site/app.ts')],
      outfile: path.join(out, 'app.js'),
      bundle: true,
      format: 'iife',
      platform: 'browser',
      target: 'es2023',
      legalComments: 'none',
    });
    continue;
  }
  if (file === 'index.html') {
    const template = await readFile(path.join(ROOT, 'site/index.html'), 'utf8');
    const theme = await compileBrowser('engine/theme-init.ts');
    await writeFile(
      path.join(out, file),
      template.replace('/*__THEME__*/', () => theme),
    );
    continue;
  }
  await writeFile(path.join(out, file), await readFile(path.join(ROOT, 'site', file)));
}
await writeFile(path.join(out, 'catalogue.json'), JSON.stringify(catalogue));
await writeFile(path.join(out, 'downloads/motion-lab-toolkit.zip'), await toolkitZip());
printLine(
  `Built ${catalogue.length} public examples and the local toolkit in dist/. No local work was included.`,
);
