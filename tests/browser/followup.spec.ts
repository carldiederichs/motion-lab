import { test, expect } from '@playwright/test';

import { required } from '../../engine/assert.ts';

for (const colorScheme of ['dark', 'light'] as const)
  for (const [width, height] of [
    [1024, 768],
    [1440, 900],
    [1920, 1080],
  ] as const)
    test(`screen sections and prompt ${width} ${colorScheme}`, async ({ page }) => {
      await page.setViewportSize({ width, height });
      await page.emulateMedia({ colorScheme });
      await page.goto('/');
      const hero = required(await page.locator('#home').boundingBox());
      expect(hero.y + hero.height).toBeCloseTo(height, 0);
      const controls = required(await page.locator('.hero-link').boundingBox());
      expect(controls.y + controls.height).toBeLessThan(height);
      await expect(page.locator('#typed-prompt')).toHaveText('');
      await page.getByRole('link', { name: 'Try this example' }).click();
      await expect
        .poll(async () => Math.round(required(await page.locator('#demo').boundingBox()).y))
        .toBe(0);
      await expect(page.locator('#typed-prompt')).toHaveAttribute('data-state', 'typing');
      const initial = required(await page.locator('.prompt-actions').boundingBox());
      expect(
        await page
          .locator('#typed-prompt')
          .evaluate((el) => getComputedStyle(el, '::after').animationName),
      ).toBe('prompt-caret');
      await expect(page.locator('#typed-prompt')).toHaveAttribute('data-state', 'complete', {
        timeout: 10000,
      });
      const finished = required(await page.locator('.prompt-actions').boundingBox());
      expect(finished.y).toBeCloseTo(initial.y, 0);
      await expect(page.locator('#demo-result')).toBeHidden();
      await page.screenshot({ path: `artifacts/review/prompt-${width}-${colorScheme}.png` });
      await page.locator('#demo-replay').click();
      await expect(page.locator('#typed-prompt')).toHaveAttribute('data-state', 'typing');
      await page.locator('#demo-run').click();
      await expect(page.locator('#typed-prompt')).toHaveAttribute('data-state', 'complete');
      await expect(page.frameLocator('#demo-frame').locator('#mp-play')).toContainText('Play');
    });

test('wheel snaps one screen; long gallery remains fully reachable', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  await page.mouse.move(400, 400);
  await page.mouse.wheel(0, 300);
  await expect
    .poll(async () => Math.round(required(await page.locator('#demo').boundingBox()).y))
    .toBe(0);
  await page.waitForTimeout(750);
  await page.mouse.wheel(0, 300);
  await expect
    .poll(async () => Math.round(required(await page.locator('#examples').boundingBox()).y))
    .toBe(0);
  await page.locator('.card').last().scrollIntoViewIfNeeded();
  await expect(page.locator('.card').last()).toBeInViewport();
  await page.locator('#local-toolkit').scrollIntoViewIfNeeded();
  await expect(page.locator('#local-toolkit')).toBeInViewport();
});

test('hero loops, pauses mid-motion, resumes and respects manual changes', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#hero-ring')).toHaveAttribute('data-phase', '0');
  await expect(page.locator('[data-hero-packet]')).toContainText('lookup');
  await page.locator('#hero-play').click();
  expect(
    await page
      .locator('#hero-ring svg')
      .evaluate((el) => el instanceof SVGSVGElement && el.animationsPaused()),
  ).toBe(true);
  await page.waitForTimeout(400);
  await expect(page.locator('#hero-ring')).toHaveAttribute('data-phase', '0');
  await page.locator('#hero-play').click();
  await expect(page.locator('#hero-ring')).toHaveAttribute('data-phase', '1', { timeout: 6000 });
  await expect(page.locator('#hero-ring')).toHaveAttribute('data-phase', '2', { timeout: 5000 });
  await expect(page.locator('[data-hero-packet]')).toContainText('key 60');
  await expect(page.locator('#hero-ring')).toHaveAttribute('data-phase', '3', { timeout: 5000 });
  await expect(page.locator('#hero-result')).toContainText('D now stores key 60');
  await expect(page.locator('#hero-ring')).toHaveAttribute('data-phase', '0', { timeout: 6000 });
  await page.locator('#hero-toggle').click();
  await expect(page.locator('#hero-play')).toHaveText('Resume');
  await expect(page.locator('#hero-ring')).toHaveAttribute('data-phase', '1');
});

test('reduced motion completes typing and stops automatic hero movement', async ({ page }) => {
  await page.goto('/#demo');
  await expect(page.locator('#typed-prompt')).toHaveAttribute('data-state', 'typing');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(page.locator('#typed-prompt')).toHaveAttribute('data-state', 'complete');
  await expect(page.locator('#hero-play')).toHaveText('Resume');
  await expect(page.locator('[data-hero-packet]')).toHaveAttribute('opacity', '0');
});

for (const mode of ['play', 'step'] as const)
  test(`embedded first lesson pauses before the answer via ${mode}`, async ({ page }) => {
    await page.goto('/');
    await page.locator('#demo-run').click();
    const frame = page.frameLocator('#demo-frame');
    await frame.locator('#mp-predict-mode').check();
    if (mode === 'play') {
      await frame.locator('#mp-play').click();
    } else if (mode === 'step') {
      await frame.locator('#mp-next').click();
      await frame.locator('#mp-next').click();
    } else {
      await page.goto('/lessons/consistent-hashing.html');
      await page.locator('#mp-predict-mode').check();
      await page.locator('.mp-chapter').nth(2).click();
    }
    await expect(frame.locator('#mp-predict-layer')).toBeVisible({ timeout: 10000 });
    await expect(frame.locator('#mp-predict-q')).toContainText('Which interval');
    await expect(frame.locator('#mp-cap-title')).toContainText('Route each key');
    await expect(frame.locator('#mp-predict-a')).toBeHidden();
    await expect(frame.locator('#mp-play')).toContainText('Play');
    await frame.locator('#mp-reveal').click();
    await expect(frame.locator('#mp-predict-a')).toContainText('All other ownership');
    await frame.locator('#mp-continue').click();
    await expect(frame.locator('#mp-predict-layer')).toBeHidden();
    await expect(frame.locator('#mp-cap-title')).toContainText('new server');
  });

for (const theme of ['dark', 'light'] as const)
  test(`five code languages keep chapter and preference in ${theme}`, async ({ page }) => {
    await page.goto(`/lessons/two-sum.html?panel=code&theme=${theme}`);
    await page.locator('#mp-next').click();
    const time = await page.locator('#mp-time').textContent();
    for (const [language, snippet] of [
      ['ts', 'function twoSum'],
      ['js', 'function twoSum'],
      ['python', 'def two_sum'],
      ['java', 'static int[]'],
      ['cpp', 'std::vector<int>'],
    ] as const) {
      await page.getByLabel('Code language', { exact: true }).selectOption(language);
      await expect(page.locator('#mp-code-body')).toContainText(snippet);
      await expect(page.locator('#mp-time')).toHaveText(required(time));
      expect(await page.locator('#mp-code-body .ln.on').count()).toBeGreaterThan(0);
    }
    await page.getByLabel('Code language', { exact: true }).selectOption('python');
    await page.goto(`/lessons/sliding-window.html?panel=code&theme=${theme}`);
    await expect(page.locator('#mp-code-language')).toHaveValue('python');
    await page.screenshot({ path: `artifacts/review/languages-${theme}.png` });
    await page.goto(`/lessons/event-loop.html?panel=code&theme=${theme}`);
    await expect(page.locator('#mp-code-language')).toBeDisabled();
    await expect(page.locator('#mp-code-note')).toContainText('JavaScript runtime');
  });

test('direct chapter selection pauses before its prediction', async ({ page }) => {
  await page.goto('/lessons/consistent-hashing.html');
  await page.locator('#mp-predict-mode').check();
  await page.locator('.mp-chapter').nth(2).click();
  await expect(page.locator('#mp-predict-layer')).toBeVisible();
  await expect(page.locator('#mp-cap-title')).toContainText('Route each key');
  await page.locator('#mp-predict-mode').uncheck();
  await expect(page.locator('#mp-predict-layer')).toBeHidden();
});

test('value-only sorting shows its own comparator in every code language', async ({ page }) => {
  await page.goto('/lessons/key-value-store.html?panel=code');
  for (const [language, tie] of [
    ['ts', 'ka.localeCompare(kb)'],
    ['js', 'ka.localeCompare(kb)'],
    ['python', 'entry[0]'],
    ['java', 'a.getKey()'],
    ['cpp', 'a.first'],
  ] as const) {
    await page.getByRole('button', { name: 'Stable key tie-break', exact: true }).click();
    await page.getByLabel('Code language', { exact: true }).selectOption(language);
    await expect(page.locator('#mp-code-body')).toContainText(tie);
    await page.getByRole('button', { name: 'Value only', exact: true }).click();
    await expect(page.locator('#mp-code-body')).not.toContainText(tie);
  }
});
