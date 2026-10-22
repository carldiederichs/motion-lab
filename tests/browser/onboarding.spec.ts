import { readFile } from 'node:fs/promises';

import { test, expect } from '@playwright/test';

import { required } from '../../engine/assert.ts';
import { catalogueSchema, specSchema } from '../../engine/model.ts';
import { render } from '../../scripts/renderer.ts';

const catalogue = catalogueSchema.parse(
  JSON.parse(await readFile(new URL('../../examples/catalogue.json', import.meta.url), 'utf8')),
);
for (const entry of catalogue.filter((item) => item.category === 'Algorithms'))
  test(`${entry.slug}: task, original source and example are available before playback`, async ({
    page,
  }) => {
    const spec = specSchema.parse(
      JSON.parse(
        await readFile(new URL(`../../examples/${entry.slug}.json`, import.meta.url), 'utf8'),
      ),
    );
    const problem = required(spec.problem);
    await page.goto(`/lessons/${entry.slug}.html`);
    const context = page.locator('#mp-problem');
    await expect(context).toContainText(problem.statement);
    await expect(context.getByRole('link')).toHaveAttribute(
      'href',
      `https://leetcode.com/problems/${problem.source.slug}/`,
    );
    await expect(context.getByRole('link')).toHaveAttribute('rel', 'noopener noreferrer');
    await expect(context.getByRole('heading')).toHaveText(
      problem.source.relationship === 'exact' ? 'The problem' : 'Related LeetCode problem',
    );
    const time = await page.locator('#mp-time').textContent();
    await context.locator('summary').click();
    await expect(context.locator('pre')).toContainText(problem.example.input);
    await expect(context.locator('pre')).toContainText(problem.example.output);
    await expect(context).toContainText('interactive inputs below use smaller limits');
    expect(await page.locator('#mp-time').textContent()).toBe(time);
    await context.locator('summary').click();
    await page.locator('#mp-next').click();
    expect(await page.locator('#mp-time').textContent()).not.toBe(time);
  });

for (const width of [360, 1024, 1440])
  for (const theme of ['light', 'dark'] as const)
    test(`onboarding and problem layout ${width} ${theme}`, async ({ page }) => {
      await page.setViewportSize({ width, height: width === 360 ? 640 : 900 });
      await page.emulateMedia({ colorScheme: theme, reducedMotion: 'reduce' });
      await page.goto('/');
      await expect(page.getByRole('heading', { level: 1 })).toHaveText(
        'Understand code through interactive diagrams.',
      );
      await expect(page.locator('.hero-rule')).toContainText(
        'A database spreads records across servers',
      );
      for (let phase = 0; phase < 4; phase++) {
        const ring = required(await page.locator('#hero-ring').boundingBox());
        const toolbar = required(await page.locator('.hero-controls').boundingBox());
        const next = required(await page.locator('#hero-toggle').boundingBox());
        const count = required(await page.locator('#hero-step').boundingBox());
        expect(Math.abs(ring.x + ring.width / 2 - toolbar.x - toolbar.width / 2)).toBeLessThan(1);
        expect(count.x - next.x - next.width).toBeLessThanOrEqual(8);
        expect(toolbar.x).toBeGreaterThanOrEqual(ring.x);
        expect(toolbar.x + toolbar.width).toBeLessThanOrEqual(ring.x + ring.width + 1);
        if (phase < 3) await page.locator('#hero-toggle').click();
      }
      await page.screenshot({ path: `artifacts/review/onboarding-${width}-${theme}.png` });
      await expect(
        page.getByRole('navigation').getByRole('link', { name: 'GitHub' }),
      ).toBeVisible();
      const primary = page.locator('#home .actions .primary');
      const secondary = page.locator('#home .actions .quiet');
      await expect(primary).toHaveText('See how it works ↓');
      await expect(primary).toHaveAttribute('href', '#demo');
      await expect(secondary).toHaveText('Explore examples →');
      await expect(secondary).toHaveAttribute('href', '#examples');
      await primary.click();
      await expect(page).toHaveURL(/#demo$/);
      await expect(page.locator('#prompt-panel')).toBeInViewport();
      await page.locator('#demo-run').click();
      await expect(
        page.frameLocator('#demo-frame').getByRole('textbox', { name: 'Key hash positions' }),
      ).toBeVisible();
      await secondary.click();
      await expect(page).toHaveURL(/#examples$/);
      await expect(page.locator('#examples-heading')).toBeInViewport();
      const logo = await page.request.get('/github.svg');
      expect(logo.ok()).toBe(true);
      expect(await logo.text()).toContain('<svg');
      const notices = await page.request.get('/THIRD-PARTY-NOTICES.txt');
      expect(notices.ok()).toBe(true);
      expect(notices.headers()['content-type']).toBe('text/plain; charset=utf-8');
      expect(await notices.text()).toContain('Copyright (c) 2025 Colin McDonnell');
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
      await page.getByRole('button', { name: 'Run locally' }).click();
      await expect(page.getByRole('link', { name: 'View on GitHub' })).toHaveAttribute(
        'href',
        'https://github.com/carldiederichs/motion-lab',
      );
      await expect(page.locator('.setup-steps li').first()).toContainText('Clone the repository');
      await expect(page.locator('#download')).toHaveAttribute('download', '');
      await page.keyboard.press('Escape');
      await expect(page.getByRole('link', { name: 'MIT license' })).toHaveAttribute(
        'href',
        'https://github.com/carldiederichs/motion-lab/blob/main/LICENSE',
      );
      await page.goto(`/lessons/sliding-window.html?theme=${theme}`);
      await page.locator('#mp-problem summary').click();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
      await page.screenshot({ path: `artifacts/review/problem-${width}-${theme}.png` });
    });

test('authored problem content is displayed as text, including HTML-shaped input', async ({
  page,
}) => {
  const spec = specSchema.parse(
    JSON.parse(await readFile(new URL('../../examples/two-sum.json', import.meta.url), 'utf8')),
  );
  const problem = required(spec.problem);
  const content = '</script><img src="/unexpected-image" onerror="alert(1)">';
  problem.statement = content;
  problem.example.input = content;
  problem.source.title = content;
  const html = await render(spec);
  const requested: string[] = [];
  page.on('request', (request) => requested.push(request.url()));
  await page.route('**/lessons/problem-text.html', async (route) =>
    route.fulfill({ contentType: 'text/html', body: html }),
  );
  await page.goto('/lessons/problem-text.html');
  await expect(page.locator('#mp-problem')).toContainText(content);
  await page.locator('#mp-problem summary').click();
  await expect(page.locator('#mp-problem pre')).toContainText(content);
  await expect(page.locator('#mp-problem img')).toHaveCount(0);
  expect(requested.some((url) => url.includes('unexpected-image'))).toBe(false);
});
