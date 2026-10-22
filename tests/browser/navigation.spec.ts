import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

import { expect, test } from '@playwright/test';

import { catalogueSchema } from '../../engine/model.ts';
import { ROOT } from '../../scripts/paths.ts';
const catalogue = catalogueSchema.parse(
  JSON.parse(await readFile(new URL('../../examples/catalogue.json', import.meta.url), 'utf8')),
);

test('every gallery example opens and returns to the examples', async ({ page }) => {
  await page.goto('/#examples');
  for (const item of catalogue) {
    await page
      .locator('.card')
      .filter({ has: page.getByRole('heading', { name: item.title, exact: true }) })
      .click();
    await expect(page.locator('#mp-title')).toHaveText(item.title);
    await page.locator('#mp-home').click();
    await expect(page).toHaveURL(/\/#examples$/);
    await expect(page.locator('.card')).toHaveCount(catalogue.length);
  }
});

test('filtered gallery survives return links, reload and browser history', async ({ page }) => {
  await page.goto('/#examples');
  await page.getByRole('button', { name: 'Algorithms', exact: true }).click();
  await page.getByRole('searchbox').fill('tree');
  await expect(page.locator('.card')).toHaveCount(1);
  await page.locator('.card').click();
  await expect(page.locator('#mp-title')).toHaveText('Balanced Binary Tree');
  await page.locator('#mp-home').click();
  await expect(page.getByRole('searchbox')).toHaveValue('tree');
  await expect(page.getByRole('button', { name: 'Algorithms', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await expect(page.locator('.card')).toHaveCount(1);
  await page.reload();
  await expect(page.locator('.card')).toHaveCount(1);
  await page.goBack();
  await expect(page.locator('#mp-title')).toHaveText('Balanced Binary Tree');
  await page.goBack();
  await expect(page.getByRole('searchbox')).toHaveValue('tree');
  await expect(page.locator('.card')).toHaveCount(1);
  await page.goForward();
  await expect(page.locator('#mp-title')).toHaveText('Balanced Binary Tree');
});

test('empty search has a one-click recovery and returns keyboard focus', async ({ page }) => {
  await page.goto('/?category=Systems&q=no-such-example#examples');
  await page.getByRole('button', { name: 'Clear filters' }).click();
  await expect(page.locator('.card')).toHaveCount(catalogue.length);
  await expect(page.getByRole('searchbox')).toHaveValue('');
  await expect(page.getByRole('searchbox')).toBeFocused();
  await expect(page.getByRole('button', { name: 'All examples' })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
});

test('panel tabs work by keyboard without advancing chapters; close restores focus', async ({
  page,
}) => {
  await page.goto('/lessons/two-sum.html?panel=inspector');
  await page.getByRole('tab', { name: 'Inspector', exact: true }).press('ArrowRight');
  await expect(page.getByRole('tab', { name: 'Code', exact: true })).toBeFocused();
  await expect(page.locator('#mp-panel-code')).toBeVisible();
  await expect(page.locator('#mp-time')).toContainText('0.0 /');
  await page.getByRole('tab', { name: 'Code', exact: true }).press('ArrowRight');
  await expect(page.getByRole('tab', { name: 'Time & space' })).toBeFocused();
  await expect(page.locator('#mp-panel-complexity')).toBeVisible();
  await page.locator('#mp-side-close').click();
  await expect(page.locator('#mp-side')).toBeHidden();
  await expect(page.locator('#mp-side-toggle')).toBeFocused();
  await page.locator('#mp-side-toggle').press('Enter');
  await expect(page.locator('#mp-panel-complexity')).toBeVisible();
});

test('all setup entry points dismiss cleanly and restore focus', async ({ page }) => {
  await page.goto('/');
  for (const trigger of await page.locator('[data-setup]').all()) {
    await trigger.click();
    await expect(page.locator('#setup')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.locator('#setup')).toBeHidden();
    await expect(trigger).toBeFocused();
  }
});

test('demo workspace, direct lesson links and missing pages all lead back to the gallery', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Show the example' }).click();
  await page.getByRole('link', { name: 'Open full workspace' }).click();
  await expect(page.locator('#mp-title')).toHaveText('Consistent Hashing');
  await page.locator('#mp-home').click();
  await expect(page).toHaveURL(/\/#examples$/);
  const response = await page.goto('/lessons/does-not-exist.html');
  expect(response?.status()).toBe(404);
  await page.getByRole('link', { name: 'Open Motion Lab' }).click();
  await expect(page.locator('.card')).toHaveCount(catalogue.length);
});

for (const from of ['https://example.invalid/', '//example.invalid/', '/\\example.invalid/'])
  test(`return link rejects another origin: ${from}`, async ({ page }) => {
    await page.goto(`/lessons/graph-bfs.html?from=${encodeURIComponent(from)}`);
    await expect(page.locator('#mp-home')).toHaveAttribute('href', '/#examples');
  });

test('standalone HTML offers a working public gallery instead of a missing local index', async ({
  page,
}) => {
  await page.goto(pathToFileURL(path.join(ROOT, 'dist/lessons/graph-bfs.html')).href);
  await expect(page.locator('#mp-home')).toHaveAttribute(
    'href',
    'https://motion-lab-dev.vercel.app/#examples',
  );
});
