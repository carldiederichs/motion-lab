import { readFile } from 'node:fs/promises';

import { test, expect } from '@playwright/test';

import { required } from '../../engine/assert.ts';
import { catalogueSchema } from '../../engine/model.ts';
const catalogue = catalogueSchema.parse(
  JSON.parse(await readFile(new URL('../../examples/catalogue.json', import.meta.url), 'utf8')),
);
for (const viewport of [
  { width: 390, height: 844 },
  { width: 360, height: 640 },
  { width: 844, height: 390 },
])
  for (const colorScheme of ['dark', 'light'] as const)
    test(`mobile landing, preview and tour ${viewport.width} ${colorScheme}`, async ({ page }) => {
      await page.setViewportSize(viewport);
      await page.emulateMedia({ colorScheme, reducedMotion: 'reduce' });
      await page.goto('/');
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
      await expect(page.locator('#hero-ring')).toBeVisible();
      await page.locator('#hero-toggle').click();
      await expect(page.locator('#hero-step')).toHaveText('2 / 4');
      await page.locator('#demo-run').click();
      await expect(page.frameLocator('#demo-frame').locator('#mp-next')).toBeVisible();
      const preview = required(await page.locator('#demo-result').boundingBox());
      expect(preview.height).toBeCloseTo(
        viewport.width <= 620 ? Math.max(820, viewport.height) : viewport.height,
        0,
      );
      expect(preview.y).toBeCloseTo(0, 0);
      const frame = page.frameLocator('#demo-frame');
      await expect(frame.locator('.mp-params')).toBeVisible();
      await expect(frame.locator('.mp-chapters')).toBeVisible();
      await expect(frame.locator('#mp-predict-mode')).toBeChecked();
      const overflow = await frame.locator('html').evaluate((el) => ({
        x: el.scrollWidth > el.clientWidth,
        y: el.scrollHeight > el.clientHeight + 1,
      }));
      expect(overflow).toEqual({ x: false, y: false });
      await frame.locator('#mp-next').click();
      await frame.locator('#mp-next').click();
      await expect(frame.locator('#mp-predict-layer')).toBeVisible();
      await frame.locator('#mp-reveal').click();
      await expect(frame.locator('#mp-continue')).toBeVisible();
      await frame.locator('#mp-continue').click();
      await frame.locator('#mp-play').click();
      await page.screenshot({
        path: `artifacts/review/preview-${viewport.width}-${colorScheme}.png`,
      });
      await page.locator('#tour-start').click();
      for (let step = 0; step < 4; step++) {
        for (const id of ['#tour-card', '#tour-shade']) {
          const rect = required(await page.locator(id).boundingBox());
          expect(rect.x).toBeGreaterThanOrEqual(0);
          expect(rect.y).toBeGreaterThanOrEqual(0);
          expect(rect.x + rect.width).toBeLessThanOrEqual(viewport.width + 1);
          expect(rect.y + rect.height).toBeLessThanOrEqual(viewport.height + 1);
        }
        await page.screenshot({
          path: `artifacts/review/tour-${viewport.width}-${colorScheme}-${step}.png`,
        });
        await page.locator('#tour-next').click();
      }
      await expect(page.locator('#tour-start')).toBeFocused();
      await page.getByRole('button', { name: 'Run locally' }).click();
      const dialog = required(await page.locator('#setup').boundingBox());
      expect(dialog.x).toBeGreaterThanOrEqual(0);
      expect(dialog.width).toBeLessThanOrEqual(viewport.width);
      expect(await page.locator('#setup').evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(
        true,
      );
    });
for (const entry of catalogue)
  test(`mobile walkthrough ${entry.slug}`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`/lessons/${entry.slug}.html?panel=code&theme=light`);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await page.locator('#mp-next').click();
    await page.locator('#mp-diagram-zoom').click();
    await expect(page.locator('#mp-stages')).toHaveClass(/diagram-zoom/);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await page.locator('#mp-diagram-zoom').click();
    await page.screenshot({ path: `artifacts/review/mobile-${entry.slug}.png`, fullPage: true });
    const selector = page.getByLabel('Code language', { exact: true });
    if ((await selector.isVisible()) && (await selector.isEnabled())) {
      await selector.selectOption('python');
      await expect(selector).toHaveValue('python');
    }
  });

test('compact preview adapts to rotation without restarting the chapter', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.locator('#demo-run').click();
  const frame = page.frameLocator('#demo-frame');
  await frame.locator('#mp-next').click();
  const caption = await frame.locator('#mp-cap-title').textContent();
  await page.setViewportSize({ width: 844, height: 390 });
  await expect(frame.locator('#mp-cap-title')).toHaveText(required(caption));
  await expect(frame.locator('#mp-stage-a')).toHaveAttribute('viewBox', '0.0 0.0 960.0 500.0');
  expect(errors).toEqual([]);
  expect(
    await frame
      .locator('html')
      .evaluate((el) => el.scrollWidth <= el.clientWidth && el.scrollHeight <= el.clientHeight + 1),
  ).toBe(true);
});
