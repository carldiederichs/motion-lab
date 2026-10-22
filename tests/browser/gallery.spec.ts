import { mkdir } from 'node:fs/promises';

import { test, expect } from '@playwright/test';
await mkdir('artifacts/review', { recursive: true });
for (const theme of ['dark', 'light'] as const)
  for (const width of [1024, 1440, 1920]) {
    test(`gallery previews and hero boundaries ${theme} ${width}`, async ({ page }) => {
      await page.setViewportSize({ width, height: 1000 });
      await page.emulateMedia({ colorScheme: theme, reducedMotion: 'reduce' });
      await page.goto('/');
      await expect(page.locator('.card')).toHaveCount(15);
      const pictures = await page
        .locator('.card-art svg')
        .evaluateAll((els) => els.map((e) => e.innerHTML));
      expect(new Set(pictures).size).toBe(15);
      const textBounds = await page.locator('.card-art svg').evaluateAll((els) =>
        els.flatMap((svg) => {
          if (!(svg instanceof SVGSVGElement)) throw new Error('Expected gallery SVG');
          const vb = svg.viewBox.baseVal;
          return [...svg.querySelectorAll('text')].flatMap((t) => {
            const b = t.getBBox();
            return b.x < 0 || b.y < 0 || b.x + b.width > vb.width || b.y + b.height > vb.height
              ? [t.textContent]
              : [];
          });
        }),
      );
      expect(textBounds).toEqual([]);
      for (let state = 0; state < 2; state++) {
        const collisions = await page.locator('#hero-ring svg').evaluate((svg) => {
          const line = svg.querySelector('[data-owner-connector]');
          if (!(line instanceof SVGPathElement)) throw new Error('Missing connector');
          const servers = [...svg.querySelectorAll('[data-server]')].filter(
            (node) => node.parentElement?.getAttribute('opacity') !== '0',
          );
          const hits = [];
          for (let n = 0; n <= 100; n++) {
            const p = line.getPointAtLength((line.getTotalLength() * n) / 100);
            for (const c of servers) {
              if (!(c instanceof SVGCircleElement)) throw new Error('Expected server circle');
              if (
                Math.hypot(p.x - c.cx.baseVal.value, p.y - c.cy.baseVal.value) <
                c.r.baseVal.value + 2
              )
                hits.push(c.dataset.server);
            }
          }
          return [...new Set(hits)];
        });
        expect(collisions, `state ${state}`).toEqual([]);
        if (width === 1440)
          await page
            .locator('.intro-aside')
            .screenshot({ path: `artifacts/review/hero-${theme}-${state}.png` });
        await page.locator('#hero-toggle').click();
      }
      if (width === 1440) {
        await page.locator('.card').first().scrollIntoViewIfNeeded();
        await page.screenshot({ path: `artifacts/review/gallery-${theme}.png` });
      }
    });
  }
