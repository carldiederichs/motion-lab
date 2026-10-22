import { mkdir } from 'node:fs/promises';

import { test, expect } from '@playwright/test';
await mkdir('artifacts/review', { recursive: true });
test('running hero completes a cycle without overlapping labels', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/');
  const phases = new Set<string>();
  const deadline = Date.now() + 20_000;
  while (Date.now() < deadline) {
    const phase = await page.locator('#hero-ring').getAttribute('data-phase');
    if (phase === null) throw new Error('Missing hero phase');
    if (!phases.has(phase)) {
      phases.add(phase);
      await page
        .locator('.intro-aside')
        .screenshot({ path: `artifacts/review/running-hero-${phase}.png` });
    } else if (phase === '0' && phases.size === 4) break;
    const collisions = await page.locator('#hero-ring svg').evaluate((svg) => {
      const labels = [...svg.querySelectorAll('text')].filter((label) => {
        for (
          let parent: Element | null = label;
          parent !== null && parent !== svg;
          parent = parent.parentElement
        )
          if (Number(getComputedStyle(parent).opacity) === 0) return false;
        return label.textContent !== '';
      });
      return labels.flatMap((label, i) => {
        const a = label.getBoundingClientRect();
        return labels.slice(i + 1).flatMap((other) => {
          const b = other.getBoundingClientRect();
          return Math.min(a.right, b.right) - Math.max(a.left, b.left) > 1 &&
            Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 1
            ? [`${label.textContent} / ${other.textContent}`]
            : [];
        });
      });
    });
    expect(collisions, `running phase ${phase}`).toEqual([]);
    await page.waitForTimeout(80);
  }
  expect([...phases]).toEqual(['0', '1', '2', '3']);
  await expect(page.locator('#hero-ring')).toHaveAttribute('data-phase', '0');
});
test('hero labels remain separate throughout every transport phase', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/');
  await page.locator('#hero-play').click();
  for (let phase = 0; phase < 4; phase++) {
    const start = await page.locator('#hero-ring svg').evaluate((node) => {
      if (!(node instanceof SVGSVGElement)) throw new Error('Expected hero SVG');
      node.pauseAnimations();
      return node.getCurrentTime();
    });
    for (const fraction of [0, 0.1, 0.25, 0.5, 0.75, 0.9, 1]) {
      const collisions = await page.locator('#hero-ring svg').evaluate(
        async (node, time) => {
          if (!(node instanceof SVGSVGElement)) throw new Error('Expected hero SVG');
          node.setCurrentTime(time);
          await new Promise<void>((resolve) =>
            requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
          );
          const visible = [...node.querySelectorAll('text')].filter((label) => {
            for (
              let parent: Element | null = label;
              parent !== null && parent !== node;
              parent = parent.parentElement
            )
              if (Number(getComputedStyle(parent).opacity) === 0) return false;
            return label.textContent !== '';
          });
          return visible.flatMap((label, i) => {
            const a = label.getBoundingClientRect();
            return visible.slice(i + 1).flatMap((other) => {
              const b = other.getBoundingClientRect();
              const overlap =
                Math.min(a.right, b.right) - Math.max(a.left, b.left) > 1 &&
                Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 1;
              return overlap ? [`${label.textContent} / ${other.textContent}`] : [];
            });
          });
        },
        start + fraction * 2.4,
      );
      expect(collisions, `phase ${phase + 1}, progress ${fraction}`).toEqual([]);
    }
    if (phase < 3) await page.locator('#hero-toggle').click();
  }
});
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

test('paused and restarted hero markers stay inside the diagram before their first animation frame', async ({
  page,
}) => {
  await page.goto('/');
  await page.locator('#hero-play').click();
  for (const control of [
    '#hero-restart',
    '#hero-toggle',
    '#hero-toggle',
    '#hero-toggle',
    '#hero-toggle',
  ]) {
    await page.locator(control).click();
    const contained = await page.locator('#hero-ring svg').evaluate((svg) => {
      const packet = svg.querySelector('[data-hero-packet]');
      if (!packet || packet.getAttribute('opacity') === '0') return true;
      const dot = packet.querySelector('circle');
      if (!dot) throw new Error('Missing payload marker');
      const outer = svg.getBoundingClientRect(),
        inner = dot.getBoundingClientRect();
      return (
        inner.left >= outer.left &&
        inner.right <= outer.right &&
        inner.top >= outer.top &&
        inner.bottom <= outer.bottom
      );
    });
    expect(contained).toBe(true);
  }
});
