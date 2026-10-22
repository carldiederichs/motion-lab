import path from 'node:path';
import { pathToFileURL } from 'node:url';

import { chromium } from '@playwright/test';
import { z } from 'zod';

import { printLine } from './output.ts';
import { required } from '../engine/assert.ts';

const input = process.argv[2];
if (input === undefined || input.length === 0)
  throw Error('Usage: node scripts/verify.ts local/example.html');
const requested = process.env.PLAYWRIGHT_CHANNEL;
const channel =
  requested === 'chromium'
    ? undefined
    : (requested ?? '') || (process.platform === 'darwin' ? 'chrome' : undefined);
const browser = await chromium.launch({
  ...(channel === undefined ? {} : { channel }),
  headless: true,
});
let failed = false;
try {
  for (const theme of ['dark', 'light'] as const) {
    const page = await browser.newPage({
      viewport: { width: 1440, height: 1000 },
      colorScheme: theme,
    });
    await page.goto(pathToFileURL(path.resolve(input)).href + `?motion-qa=1&theme=${theme}`);
    await page.waitForSelector('#motion-qa-report', {
      state: 'attached',
      timeout: 60000,
    });
    const report = z
      .object({ status: z.string(), issues: z.array(z.string()) })
      .parse(JSON.parse(required(await page.locator('#motion-qa-report').textContent())));
    printLine(JSON.stringify({ theme, ...report }));
    failed ||= report.status !== 'ok';
    await page.close();
  }
} finally {
  await browser.close();
}
process.exitCode = failed ? 1 : 0;
