import { test, expect } from '@playwright/test';

for (const viewport of [
  { width: 1440, height: 900 },
  { width: 390, height: 844 },
  { width: 360, height: 640 },
])
  for (const theme of ['dark', 'light'] as const)
    test(`landing inputs, steps and languages stay usable ${viewport.width} ${theme}`, async ({
      page,
    }) => {
      const errors: string[] = [];
      page.on('pageerror', (error) => errors.push(error.message));
      await page.setViewportSize(viewport);
      await page.emulateMedia({ colorScheme: theme, reducedMotion: 'reduce' });
      await page.goto('/');
      await page.locator('#demo-run').click();
      const frame = page.frameLocator('#demo-frame');
      const input = frame.getByLabel('Key hash positions');
      const node = frame.locator('[data-actor="node-d"]');
      await expect(input).toBeVisible();
      await expect(node).toBeHidden();
      await frame.locator('#mp-predict-mode').uncheck();
      await frame.getByRole('button', { name: /^Step 2:/ }).click();
      await expect(node).toBeHidden();
      const title = await frame.locator('#mp-cap-title').textContent();
      await page.screenshot({ path: `artifacts/review/routing-${viewport.width}-${theme}.png` });
      const rows = await frame.locator('[data-actor="mapping"]').textContent();
      for (const invalid of [
        '9'.repeat(200),
        '-99999999999999999999999999',
        '1e100',
        'Infinity',
        'NaN',
        '64.5',
        '1,2,3,4,5,6,7',
      ]) {
        await input.fill(invalid);
        await input.press('Tab');
        await expect(input).toHaveAttribute('aria-invalid', 'true');
        await expect(frame.locator('#mp-cap-title')).toHaveText(title ?? '');
        await expect(frame.locator('[data-actor="mapping"]')).toHaveText(rows ?? '');
        expect(await frame.locator('html').evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(
          true,
        );
        expect((await frame.locator('#mp-error-keys').textContent())?.length).toBeLessThan(90);
      }
      await frame.getByRole('button', { name: 'Reset input' }).click();
      await expect(input).toHaveValue('12, 35, 60, 92');
      await expect(input).not.toHaveAttribute('aria-invalid');
      await frame.locator('#mp-play').click();
      await input.fill('48, 49, 64, 65, 99, 0');
      await input.press('Tab');
      await expect(frame.locator('#mp-play')).toContainText('Play');
      await expect(frame.locator('#mp-cap-title')).toHaveText('Place servers on a hash ring');
      await frame.getByRole('button', { name: /^Step 4:/ }).click();
      await expect(frame.locator('#mp-cap-title')).toHaveText('2 of 6 keys move');
      await expect(frame.locator('[data-actor="mapping"]')).toContainText('49 → D');
      await expect(node).toBeVisible();
      await page.screenshot({ path: `artifacts/review/migration-${viewport.width}-${theme}.png` });
      await frame.getByRole('button', { name: /^Step 2:/ }).click();
      await expect(node).toBeHidden();
      await input.fill('');
      await input.press('Tab');
      await frame.getByRole('button', { name: /^Step 2:/ }).click();
      await expect(frame.locator('#mp-cap-text')).toContainText('no sample keys');
      await input.fill('60,60,160');
      await input.press('Tab');
      await frame.getByRole('button', { name: /^Step 4:/ }).click();
      await expect(frame.locator('#mp-cap-title')).toHaveText('3 of 3 keys move');
      await frame.getByRole('button', { name: 'Code', exact: true }).click();
      for (const language of ['ts', 'js', 'python', 'java', 'cpp']) {
        await frame.getByLabel('Code language', { exact: true }).selectOption(language);
        await expect(frame.getByLabel('Code language', { exact: true })).toHaveValue(language);
        await expect(frame.locator('#mp-cap-title')).toHaveText('3 of 3 keys move');
      }
      await expect(frame.locator('#mp-side-close')).toBeInViewport();
      await page.screenshot({
        path: `artifacts/review/preview-code-${viewport.width}-${theme}.png`,
      });
      await frame.locator('#mp-side-close').click();
      await expect(frame.locator('#mp-preview-code')).toBeFocused();
      await frame.getByRole('button', { name: 'Reset input' }).click();
      await page.screenshot({
        path: `artifacts/review/preview-input-${viewport.width}-${theme}.png`,
      });
      expect(
        await frame
          .locator('html')
          .evaluate(
            (el) => el.scrollWidth <= el.clientWidth && el.scrollHeight <= el.clientHeight + 1,
          ),
      ).toBe(true);
      expect(errors).toEqual([]);
    });
