import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import { fixture } from './helpers.ts';
import { releaseFiles } from '../scripts/archive.ts';
import { compileBrowser } from '../scripts/browser.ts';
import { assertLicensedDependencies, licenseNotices, noticeFiles } from '../scripts/licenses.ts';
import { render } from '../scripts/renderer.ts';

await test('browser bundles and standalone lessons retain complete distribution notices', async () => {
  const notices = await licenseNotices();
  const bundle = await compileBrowser('site/app.ts');
  const spec = await fixture(new URL('../examples/two-sum.json', import.meta.url));
  const html = await render(spec);
  const archiveFiles = await releaseFiles();
  for (const [, file] of noticeFiles) {
    const license = await readFile(new URL(`../${file}`, import.meta.url), 'utf8');
    assert(notices.includes(license));
    assert(bundle.includes(license));
    assert(html.includes(license));
    assert(archiveFiles.includes(file));
  }
  const svg = await readFile(new URL('../site/github.svg', import.meta.url), 'utf8');
  assert(
    svg.includes(await readFile(new URL('../docs/OCTICONS-LICENSE.txt', import.meta.url), 'utf8')),
  );
});

await test('the retained Zod license matches the exact installed dependency', async () => {
  assert.equal(
    await readFile(new URL('../docs/ZOD-LICENSE.txt', import.meta.url), 'utf8'),
    await readFile(new URL('../node_modules/zod/LICENSE', import.meta.url), 'utf8'),
  );
});

await test('new bundled dependencies cannot silently ship without license review', () => {
  assert.doesNotThrow(() =>
    assertLicensedDependencies(['engine/model.ts', 'node_modules/zod/v4/core/api.js']),
  );
  for (const input of [
    'node_modules/unreviewed/index.js',
    'node_modules/@vendor/unreviewed/index.js',
    'node_modules/zod/node_modules/unreviewed/index.js',
    'node_modules\\unreviewed\\index.js',
  ])
    assert.throws(() => assertLicensedDependencies([input]), /Review the license/);
});
