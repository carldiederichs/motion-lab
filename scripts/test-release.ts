import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtemp, readFile, access, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

import { printLine } from './output.ts';
import { ROOT } from './renderer.ts';
import { catalogueSchema, specSchema } from '../engine/model.ts';
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
  for (const template of ['transactional-outbox', 'replica-read', 'next-greater']) {
    const slug = `fresh-${template}`;
    run(root, ['scripts/cli.ts', 'new', slug, '--template', template]);
    const source = path.join(root, `local/${slug}.json`);
    const spec = specSchema.parse(JSON.parse(await readFile(source, 'utf8')));
    spec.title = `Local revision: ${spec.title}`;
    await writeFile(source, JSON.stringify(spec));
    run(root, ['scripts/cli.ts', 'validate', `local/${slug}.json`]);
    run(root, ['scripts/cli.ts', 'build', `local/${slug}.json`]);
    run(root, ['scripts/verify.ts', `local/${slug}.html`]);
    assert(
      (await readFile(path.join(root, `local/${slug}.html`), 'utf8')).includes('Local revision:'),
    );
  }

  run(root, ['scripts/build.ts']);
  assert(
    !(await readFile(path.join(root, 'dist/catalogue.json'), 'utf8')).includes('retry-example'),
  );
  const { createServer } = (await import(
    pathToFileURL(path.join(root, 'scripts/serve.ts')).href
  )) as typeof import('./serve.ts');
  const localServer = createServer({ local: true });
  await new Promise<void>((resolve) => localServer.listen(0, '127.0.0.1', resolve));
  try {
    const address = localServer.address();
    assert(address !== null && typeof address !== 'string');
    for (const template of ['transactional-outbox', 'replica-read', 'next-greater']) {
      const response: Response = await fetch(
        `http://127.0.0.1:${address.port}/local/fresh-${template}.html`,
      );
      assert.equal(response.status, 200);
      assert((await response.text()).includes('Local revision:'));
    }
  } finally {
    await new Promise<void>((resolve) => localServer.close(() => resolve()));
  }
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
      '/local/fresh-transactional-outbox.html',
      '/local/fresh-replica-read.html',
      '/local/fresh-next-greater.html',
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
