import { readFile, readdir, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

import { test, expect } from '@playwright/test';

import { required } from '../../engine/assert.ts';
import { specSchema } from '../../engine/model.ts';
import { ROOT, render } from '../../scripts/renderer.ts';
import { qaReportSchema } from '../helpers.ts';
const fixtureDir = path.join(ROOT, 'templates'),
  out = path.join(ROOT, 'artifacts/authoring');
await mkdir(out, { recursive: true });
for (const file of await readdir(fixtureDir)) {
  const spec = specSchema.parse(JSON.parse(await readFile(path.join(fixtureDir, file), 'utf8'))),
    html = path.join(out, spec.slug + '.html');
  await writeFile(html, await render(spec));
  for (const theme of ['light', 'dark'] as const)
    for (const width of [1024, 1440, 1920])
      test(`authored ${spec.slug} in ${theme} at ${width}`, async ({ page }) => {
        await page.setViewportSize({ width, height: 1000 });
        await page.goto(pathToFileURL(html).href + `?motion-qa=1&theme=${theme}`);
        await page.waitForSelector('#motion-qa-report', { state: 'attached' });
        const report = qaReportSchema.parse(
          JSON.parse(required(await page.locator('#motion-qa-report').textContent())),
        );
        expect(report.issues).toEqual([]);
        if (width === 1440) {
          await page.goto(pathToFileURL(html).href + `?theme=${theme}`);
          await page.locator('#mp-chapters button').last().click();
          await page.screenshot({
            path: path.join(out, `${spec.slug}-${theme}.png`),
            fullPage: true,
          });
        }
      });
}

test('authoring QA rejects a store row wider than its background', async ({ page }) => {
  const spec = specSchema.parse(
    JSON.parse(await readFile(path.join(fixtureDir, 'transactional-outbox.json'), 'utf8')),
  );
  const scene = required(spec.variants?.[0]?.scene);
  const store = required(scene.actors.find((actor) => actor.id === 'db'));
  if (store.kind !== 'store') throw Error('Expected the database store');
  store.rows = ['A synthetic row that is deliberately wider than the database row'];
  const html = path.join(out, 'overflow-regression.html');
  await writeFile(html, await render(spec));
  await page.goto(pathToFileURL(html).href + '?motion-qa=1&theme=light');
  await page.waitForSelector('#motion-qa-report', { state: 'attached' });
  const report = qaReportSchema.parse(
    JSON.parse(required(await page.locator('#motion-qa-report').textContent())),
  );
  expect(report.issues.some((issue) => issue.includes('row text overflows db'))).toBe(true);
});
