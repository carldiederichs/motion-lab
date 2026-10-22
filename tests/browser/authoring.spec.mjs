import { test, expect } from "@playwright/test";
import { readFile, readdir, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { ROOT, render } from "../../scripts/renderer.mjs";
const fixtureDir = path.join(ROOT, "templates"),
  out = path.join(ROOT, "artifacts/authoring");
await mkdir(out, { recursive: true });
for (const file of await readdir(fixtureDir)) {
  const spec = JSON.parse(await readFile(path.join(fixtureDir, file), "utf8")),
    html = path.join(out, spec.slug + ".html");
  await writeFile(html, await render(spec));
  for (const theme of ["light", "dark"])
    for (const width of [1024, 1440, 1920])
    test(`authored ${spec.slug} in ${theme} at ${width}`, async ({ page }) => {
      await page.setViewportSize({ width, height: 1000 });
      await page.goto(pathToFileURL(html).href + `?motion-qa=1&theme=${theme}`);
      await page.waitForSelector("#motion-qa-report", { state: "attached" });
      const report = JSON.parse(
        await page.locator("#motion-qa-report").textContent(),
      );
      expect(report.issues).toEqual([]);
      if (width === 1440) {
        await page.goto(pathToFileURL(html).href + `?theme=${theme}`);
        await page.locator("#mp-chapters button").last().click();
        await page.screenshot({ path: path.join(out, `${spec.slug}-${theme}.png`), fullPage: true });
      }
    });
}
