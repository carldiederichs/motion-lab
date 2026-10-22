import { readFile, mkdir } from 'node:fs/promises';
import path from 'node:path';

import { test, expect } from '@playwright/test';

import { catalogueSchema } from '../../engine/model.ts';
import { ROOT } from '../../scripts/renderer.ts';
const catalogue = catalogueSchema.parse(
  JSON.parse(await readFile(path.join(ROOT, 'examples/catalogue.json'), 'utf8')),
);
const out = path.join(ROOT, 'artifacts/review');
await mkdir(out, { recursive: true });
for (const width of [1024, 1920])
  for (const theme of ['dark', 'light'] as const)
    test(`all lessons fit desktop ${width} ${theme}`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      for (const item of catalogue) {
        await page.goto(`/lessons/${item.slug}.html?theme=${theme}`);
        await expect(page.locator('#mp-title')).toHaveText(item.title);
        expect(
          await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
          item.slug,
        ).toBe(true);
        await page.locator('#mp-next').click();
        const panel = page.locator('#mp-side');
        if (!(await panel.isVisible())) await page.locator('#mp-side-toggle').click();
        await expect(panel).toBeVisible();
        expect(
          await panel.evaluate((e) => e.getBoundingClientRect().right <= innerWidth),
          item.slug,
        ).toBe(true);
        if (await page.getByRole('tab', { name: 'Code', exact: true }).isVisible()) {
          await page.getByRole('tab', { name: 'Code', exact: true }).click();
          expect(
            await page.locator('#mp-code-body').evaluate((e) => e.scrollWidth <= e.clientWidth + 1),
            item.slug + ' code',
          ).toBe(true);
        }
      }
    });
for (const theme of ['dark', 'light'] as const)
  test(`capture representative states ${theme}`, async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 1100 });
    await page.emulateMedia({ colorScheme: theme });
    await page.goto('/');
    await page.screenshot({
      path: path.join(out, `home-${theme}.png`),
      fullPage: true,
    });
    for (const item of catalogue) {
      await page.goto(`/lessons/${item.slug}.html?theme=${theme}`);
      await page.locator('#mp-next').click();
      await page.locator('#mp-next').click();
      await page.screenshot({
        path: path.join(out, `${item.slug}-${theme}.png`),
        fullPage: true,
      });
    }
  });
