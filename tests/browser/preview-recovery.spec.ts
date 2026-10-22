import { test, expect } from '@playwright/test';

test('failed preview shows recovery, then renders on retry', async ({ page }) => {
  await page.route('**/lessons/consistent-hashing.html?*', (route) =>
    route.fulfill({
      status: 503,
      contentType: 'text/html',
      body: '<p>Temporarily unavailable</p>',
    }),
  );
  await page.goto('/');
  await expect(page.locator('#demo-frame')).not.toHaveAttribute('src');
  await page.locator('#theme').click();
  await expect(page.locator('#demo-frame')).not.toHaveAttribute('src');
  await page.locator('#demo-run').click();
  await expect(page.locator('#preview-message')).toContainText('could not load');
  await expect(page.locator('#demo-run')).not.toContainText('ready');
  await page.unroute('**/lessons/consistent-hashing.html?*');
  await page.getByRole('button', { name: 'Retry example', exact: true }).click();
  await expect(page.locator('#preview-loading')).toBeHidden();
  await expect(page.locator('#demo-result')).toHaveAttribute('aria-busy', 'false');
  await expect(page.frameLocator('#demo-frame').locator('#mp-stage-a')).toBeVisible();
  await expect(page.locator('#demo-run')).toContainText('ready');
  await page.locator('#theme').click();
  await expect(page.locator('#preview-loading')).toBeHidden();
  await expect(page.frameLocator('#demo-frame').locator('#mp-stage-a')).toBeVisible();
});

test('step arrows and persistent route arrows survive forward and reverse navigation', async ({
  page,
}) => {
  await page.goto('/');
  await page.locator('#demo-run').click();
  const frame = page.frameLocator('#demo-frame');
  await frame.getByRole('button', { name: 'Previous step', exact: true }).click();
  await expect(frame.locator('#mp-count')).toHaveText('Chapter 1 of 4');
  await frame.getByRole('button', { name: 'Next step', exact: true }).click();
  await expect(frame.locator('#mp-count')).toHaveText('Chapter 2 of 4');
  await expect(frame.locator('[data-link="route-3"]')).not.toHaveCSS('opacity', '0');
  await expect(frame.locator('[data-link="migrate"]')).toHaveCSS('opacity', '0');
  await frame.getByRole('button', { name: 'Next step', exact: true }).click();
  await expect(frame.locator('#mp-predict-layer')).toBeVisible();
  await frame.locator('#mp-predict-mode').uncheck();
  await frame.getByRole('button', { name: /^Step 4:/ }).click();
  await expect(frame.locator('[data-link="migrate"]')).not.toHaveCSS('opacity', '0');
  await expect(frame.locator('[data-link="migrate"]')).toHaveAttribute('marker-end', /url/);
  await frame.getByRole('button', { name: 'Next step', exact: true }).click();
  await expect(frame.locator('#mp-count')).toHaveText('Chapter 4 of 4');
  await frame.getByRole('button', { name: 'Previous step', exact: true }).click();
  await expect(frame.locator('[data-link="migrate"]')).toHaveCSS('opacity', '0');
  await frame.getByRole('button', { name: 'Previous step', exact: true }).click();
  await expect(frame.locator('[data-link="route-3"]')).not.toHaveCSS('opacity', '0');
});

test('stalled preview offers retry instead of staying blank', async ({ page }) => {
  await page.clock.install();
  await page.route('**/lessons/consistent-hashing.html?*', () => undefined);
  await page.goto('/');
  await page.locator('#demo-run').click();
  await expect(page.locator('#preview-message')).toHaveText('Loading the interactive example…');
  await page.clock.fastForward(10001);
  await expect(page.getByRole('button', { name: 'Retry example', exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Open full workspace' })).toBeVisible();
});
