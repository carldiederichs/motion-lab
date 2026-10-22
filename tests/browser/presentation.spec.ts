import path from 'node:path';

import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

import { ROOT } from '../../scripts/paths.ts';

async function seek(page: Page, ms: number): Promise<void> {
  await page.locator('#mp-scrub').evaluate((node, value) => {
    if (!(node instanceof HTMLInputElement)) throw Error('Missing timeline');
    node.value = String(value);
    node.dispatchEvent(new Event('input', { bubbles: true }));
  }, ms);
}

for (const width of [1024, 1440, 1920])
  for (const theme of ['light', 'dark'] as const)
    test(`code, active lines and comparison follow ${theme} at ${width}`, async ({ page }) => {
      await page.setViewportSize({ width, height: 1000 });
      await page.emulateMedia({ colorScheme: theme });
      await page.goto('/lessons/two-sum.html?panel=code');
      await page.locator('#mp-next').click();
      const colors = await page.locator('#mp-code-body').evaluate((body) => {
        const context = document.createElement('canvas').getContext('2d');
        if (!context) throw Error('Missing canvas context');
        const luminance = (color: string): number => {
          context.fillStyle = color;
          context.fillRect(0, 0, 1, 1);
          const pixels = context.getImageData(0, 0, 1, 1).data;
          return [0.2126, 0.7152, 0.0722].reduce((total, weight, index) => {
            const value = (pixels[index] ?? 0) / 255;
            return (
              total + weight * (value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4)
            );
          }, 0);
        };
        const panel = body.closest('.mp-code');
        const active = body.querySelector('.ln.on');
        if (!panel || !active) throw Error('Missing code panel or active line');
        const background = luminance(getComputedStyle(panel).backgroundColor);
        const selected = luminance(getComputedStyle(active).backgroundColor);
        const text = [...body.querySelectorAll('.src, .no, [class^="tok-"]')];
        const contrasts = text.flatMap((node) =>
          [background, selected].map((bg) => {
            const fg = luminance(getComputedStyle(node).color);
            return (Math.max(fg, bg) + 0.05) / (Math.min(fg, bg) + 0.05);
          }),
        );
        return {
          background,
          selected,
          minimum: Math.min(...contrasts),
          fits: body.scrollWidth <= body.clientWidth + 1,
        };
      });
      expect(colors.background > 0.8).toBe(theme === 'light');
      expect(colors.selected).not.toBe(colors.background);
      expect(colors.minimum).toBeGreaterThanOrEqual(4.5);
      expect(colors.fits).toBe(true);
      await page.locator('#mp-compare').click();
      await expect(page.locator('#mp-wrap-b')).toBeVisible();
      await page.locator('#mp-compare').click();
      await expect(page.locator('#mp-panel-code')).toBeVisible();
      await page.locator('.mp-tab').filter({ hasText: 'Repeated scan' }).click();
      await page.getByRole('tab', { name: 'Time & space' }).click();
      await expect(page.locator('#mp-panel-complexity')).toContainText('O(n²)');
      await page.getByRole('tab', { name: 'Code', exact: true }).click();
      await page.screenshot({
        path: path.join(ROOT, `artifacts/review/code-${theme}-${width}.png`),
        fullPage: true,
      });
    });

test('each copy button copies exactly the visible command, including newlines', async ({
  page,
  context,
}) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.goto('/');
  await page.getByRole('button', { name: 'Run locally' }).click();
  for (const command of await page.locator('.command').all()) {
    const shown = await command.locator('code').textContent();
    expect(await command.locator('code').innerText()).toBe(shown);
    await command.getByRole('button').click();
    await expect(page.locator('#copy-status')).toContainText('Copied.');
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(shown);
  }
  await expect(page.getByRole('dialog')).toContainText('$motion-lab');
  await expect(page.getByRole('dialog')).toContainText('your own');
});

for (const theme of ['light', 'dark'] as const)
  test(`BFS carries distance before discovery and restores it on reverse scrub in ${theme}`, async ({
    page,
  }) => {
    await page.emulateMedia({ colorScheme: theme });
    await page.goto('/lessons/graph-bfs.html');
    const packet = page.locator('[data-token="visit"]');
    const distance = page.locator('[data-actor="distance"]');
    await seek(page, 2900 + 1900 * 0.4);
    await expect(packet).toContainText('d=1');
    await expect(packet).toHaveAttribute('opacity', '1');
    await expect(distance).not.toContainText('1 → 1');
    const middle = await packet.getAttribute('transform');
    await seek(page, 2900 + 1900 * 0.9);
    await expect(distance).toContainText('1 → 1');
    await expect(packet).toHaveAttribute('opacity', '0');
    await seek(page, 2900 + 1900 * 0.4);
    await expect(distance).not.toContainText('1 → 1');
    expect(await packet.getAttribute('transform')).toBe(middle);
    await page.screenshot({
      path: path.join(ROOT, `artifacts/review/bfs-transfer-${theme}.png`),
      fullPage: true,
    });
    await page.keyboard.press('Home');
    await expect(distance).not.toContainText('1 → 1');
    await expect(page.locator('#mp-play')).toContainText('Play');
  });

test('chapter selection shows its result and End finishes the last transition', async ({
  page,
}) => {
  await page.goto('/lessons/graph-bfs.html');
  await page.getByRole('button', { name: '3. Discover node 1', exact: true }).click();
  await expect(page.locator('[data-actor="distance"]')).toContainText('1 → 1');
  await page.getByRole('button', { name: '1. Visit in distance order', exact: true }).click();
  await expect(page.locator('[data-actor="distance"]')).not.toContainText('1 → 1');
  await page.keyboard.press('End');
  await expect(page.locator('[data-actor="distance"]')).toContainText('4 → 3');
  expect(await page.locator('#mp-scrub').inputValue()).toBe(
    await page.locator('#mp-scrub').getAttribute('max'),
  );
});

test('a theme in the shared link agrees with the toggle and changes immediately', async ({
  page,
}) => {
  await page.goto('/lessons/graph-bfs.html?theme=light&panel=code');
  await expect(page.locator('#mp-theme')).toHaveAttribute('aria-label', /Theme: light/);
  await page.locator('#mp-theme').click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await expect(page.locator('#mp-theme')).toHaveAttribute('aria-label', /Theme: dark/);
});
