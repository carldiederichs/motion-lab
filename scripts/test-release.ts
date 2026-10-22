import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtemp, readFile, access } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

import { printLine } from './output.ts';
import { ROOT } from './renderer.ts';
import { catalogueSchema } from '../engine/model.ts';
const scratch = await mkdtemp(path.join(tmpdir(), 'motion-release-test-'));
const run = (cwd: string, args: string[]): string =>
  execFileSync(process.execPath, ['--import', 'tsx', ...args], { cwd, stdio: 'pipe' }).toString();
async function exercise(root: string, label: string): Promise<void> {
  execFileSync('npm', ['ci', '--ignore-scripts'], { cwd: root, stdio: 'pipe' });
  execFileSync('npm', ['run', 'check'], { cwd: root, stdio: 'pipe' });
  run(root, ['scripts/build.ts']);
  run(root, ['scripts/privacy.ts']);
  run(root, ['scripts/cli.ts', 'new', 'retry-example', '--template', 'idempotent-retry']);
  run(root, ['scripts/cli.ts', 'validate', 'local/retry-example.json']);
  run(root, ['scripts/cli.ts', 'build', 'local/retry-example.json']);
  await access(path.join(root, 'local/retry-example.html'));
  run(root, ['scripts/build.ts']);
  assert(
    !(await readFile(path.join(root, 'dist/catalogue.json'), 'utf8')).includes('retry-example'),
  );
  const { createServer } = (await import(
    pathToFileURL(path.join(root, 'scripts/serve.ts')).href
  )) as typeof import('./serve.ts');
  const server = createServer();
  await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
  try {
    const address = server.address();
    assert(address !== null && typeof address !== 'string');
    const base = `http://127.0.0.1:${address.port}`;
    const catalogue = catalogueSchema.parse(
      JSON.parse(await readFile(path.join(root, 'examples/catalogue.json'), 'utf8')),
    );
    for (const route of [
      '/',
      '/app.js',
      '/style.css',
      '/catalogue.json',
      '/downloads/motion-lab-toolkit.zip',
      ...catalogue.map((x) => `/lessons/${x.slug}.html`),
    ])
      assert.equal((await fetch(base + route)).status, 200, route);
    for (const route of [
      '/local/retry-example.json',
      '/local/retry-example.html',
      '/.env',
      '/AGENTS.md',
      '/examples/catalogue.json',
      '/lessons/missing.html',
    ])
      assert.equal((await fetch(base + route)).status, 404, route);
  } finally {
    await new Promise((r) => server.close(r));
  }
  printLine(
    `${label}: clean install, strict checks, build, local authoring, production routes and isolation passed`,
  );
}
const zip = path.join(ROOT, 'dist/downloads/motion-lab-toolkit.zip');
execFileSync('unzip', ['-tq', zip], { stdio: 'pipe' });
execFileSync('unzip', ['-q', zip, '-d', path.join(scratch, 'unpacked')]);
await exercise(path.join(scratch, 'unpacked/motion-lab'), 'Downloaded toolkit');
if (process.argv.includes('--checkout')) {
  const clone = path.join(scratch, 'checkout');
  execFileSync('git', ['clone', '--quiet', '--no-hardlinks', ROOT, clone]);
  await exercise(clone, 'Fresh Git checkout');
}
printLine('Release checks complete. Temporary test files contain only synthetic examples.');
