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

test('hash routing stays clear for every position and repeated positions', async ({ page }) => {
  const spec = specSchema.parse(
    JSON.parse(await readFile(path.join(ROOT, 'examples/consistent-hashing.json'), 'utf8')),
  );
  const input = required(required(spec.simulation).params.find((param) => param.id === 'keys'));
  const html = path.join(out, 'hash-position-coverage.html');
  const groups = Array.from({ length: 17 }, (_group, index) =>
    Array.from({ length: Math.min(6, 100 - index * 6) }, (_position, offset) => index * 6 + offset),
  );
  groups.push([60, 60, 160, -940, 64, 64]);
  for (const keys of groups) {
    input.default = keys;
    await writeFile(html, await render(spec));
    await page.goto(pathToFileURL(html).href + '?motion-qa=1');
    await page.waitForSelector('#motion-qa-report', { state: 'attached' });
    const report = qaReportSchema.parse(
      JSON.parse(required(await page.locator('#motion-qa-report').textContent())),
    );
    expect(report.issues, `keys ${keys.join(', ')}`).toEqual([]);
  }
});

test('geometry QA ignores hidden objects but rejects collisions when they become visible together', async ({
  page,
}) => {
  const spec = specSchema.parse({
    kind: 'motion',
    version: 3,
    slug: 'visible-collision',
    title: 'Visibility collision check',
    component: 'Systems',
    aliases: [],
    stage: { width: 600, height: 300 },
    camera: false,
    scene: {
      actors: [
        { id: 'a', kind: 'circle', x: 60, y: 150, r: 20, label: 'A' },
        { id: 'b', kind: 'circle', x: 540, y: 150, r: 20, label: 'B' },
        { id: 'c', kind: 'circle', x: 300, y: 150, r: 20, label: 'C', tone: 'hidden' },
      ],
      links: [{ id: 'route', from: 'a', to: 'b' }],
      beats: [
        { title: 'Route with C absent', text: 'C is hidden.', dur: 500, actions: [] },
        {
          title: 'C appears after routing ends',
          text: 'The route is hidden.',
          dur: 500,
          actions: [
            { do: 'tone', link: 'route', tone: 'hidden' },
            { do: 'tone', actor: 'c', tone: 'mechanism' },
          ],
        },
      ],
    },
    edgeCases: [
      { label: 'First case', why: 'Same scene', params: {} },
      { label: 'Second case', why: 'Same scene', params: {} },
    ],
  });
  const html = path.join(out, 'visible-collision.html');
  for (const colliding of [false, true]) {
    if (colliding)
      required(spec.scene).beats.push({
        title: 'Colliding route',
        text: 'The route crosses C.',
        dur: 500,
        actions: [{ do: 'tone', link: 'route', tone: 'mechanism' }],
      });
    await writeFile(html, await render(spec));
    await page.goto(pathToFileURL(html).href + '?motion-qa=1');
    await page.waitForSelector('#motion-qa-report', { state: 'attached' });
    const report = qaReportSchema.parse(
      JSON.parse(required(await page.locator('#motion-qa-report').textContent())),
    );
    expect(report.issues.some((issue) => issue.includes('link route runs through c'))).toBe(
      colliding,
    );
  }
});
