import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';

import { releaseContents } from '../scripts/archive.ts';
import { ROOT } from '../scripts/paths.ts';
import { scan } from '../scripts/privacy.ts';
await test('release scanner catches generic secret and source-path canaries', () => {
  for (const value of [
    'sk-' + 'x'.repeat(32),
    ['', 'Users', 'sample', 'project'].join('/'),
    'test' + '@' + 'example.invalid',
    'https://' + 'app.notion.com/p/example',
  ])
    assert(scan(value).length > 0);
  assert.deepEqual(scan('Synthetic key 12 routes to server A. See /lessons/graph-bfs.html.'), []);
});

await test('toolkit restores a host-minified config without changing the build workspace', async (context) => {
  const root = await mkdtemp(path.join(tmpdir(), 'motion-config-'));
  context.after(async () => rm(root, { recursive: true, force: true }));
  const source = '{\n  "version": 2,\n  "buildCommand": "npm run build"\n}\n';
  const minified = JSON.stringify(JSON.parse(source) as unknown) + '\n';
  await writeFile(path.join(root, 'vercel.json'), minified);
  await writeFile(
    path.join(root, '.prettierrc.json'),
    await readFile(path.join(ROOT, '.prettierrc.json')),
  );
  assert.equal((await releaseContents('vercel.json', root)).toString('utf8'), source);
  assert.equal(await readFile(path.join(root, 'vercel.json'), 'utf8'), minified);
  await writeFile(path.join(root, 'README.md'), 'Unchanged source.\n');
  assert.equal((await releaseContents('README.md', root)).toString('utf8'), 'Unchanged source.\n');
});
