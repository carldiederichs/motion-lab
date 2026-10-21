import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";
const catalog = JSON.parse(
  await readFile(new URL("../../examples/catalogue.json", import.meta.url)),
);
for (const theme of ["dark", "light"])
  for (const entry of catalog)
    test(`${entry.slug}: timeline self-check in ${theme}`, async ({ page }) => {
      await page.setViewportSize({ width: 1440, height: 1000 });
      const errors = [];
      page.on("pageerror", (e) => errors.push(e.message));
      await page.goto(`/lessons/${entry.slug}.html?motion-qa=1&theme=${theme}`);
      await page.waitForSelector("#motion-qa-report", { state: "attached" });
      const report = JSON.parse(
        await page.locator("#motion-qa-report").textContent(),
      );
      expect(errors).toEqual([]);
      expect(report.issues).toEqual([]);
      expect(report.status).toBe("ok");
      expect(report.frames).toBeGreaterThan(0);
    });
for (const width of [1024, 1440, 1920])
  for (const colorScheme of ["dark", "light"])
    test(`showcase layout ${width} ${colorScheme}`, async ({ page }) => {
      await page.setViewportSize({ width, height: 1000 });
      await page.emulateMedia({ colorScheme });
      await page.goto("/");
      await expect(page.locator(".card")).toHaveCount(catalog.length);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      const overlaps = await page.locator(".card").evaluateAll(
        (cards) =>
          cards.filter((c) => {
            const b = c.getBoundingClientRect();
            return (
              b.right > innerWidth + 1 ||
              b.left < 0 ||
              c.scrollWidth > c.clientWidth + 1
            );
          }).length,
      );
      expect(overlaps).toBe(0);
      await page.getByRole("button", { name: "Run locally" }).click();
      await expect(
        page.getByRole("dialog", { name: "Take Motion Lab with you." }),
      ).toBeVisible();
      expect(
        await page
          .locator("#setup")
          .evaluate((e) => e.scrollWidth <= e.clientWidth),
      ).toBe(true);
      await page.keyboard.press("Escape");
    });
test("search and category filters compose and empty state recovers", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Algorithms", exact: true }).click();
  await page.getByRole("searchbox").fill("tree");
  await expect(page.locator(".card")).toHaveCount(1);
  await expect(page.locator(".card h3")).toHaveText("Balanced Binary Tree");
  await page.getByRole("searchbox").fill("zzzz");
  await expect(page.locator("#empty")).toBeVisible();
  await page.getByRole("searchbox").fill("");
  await page.getByRole("button", { name: "All examples", exact: true }).click();
  await expect(page.locator(".card")).toHaveCount(catalog.length);
});
test("demo is labelled, waits for a click and makes no model request", async ({
  page,
}) => {
  const requests = [];
  page.on("request", (r) => requests.push(r.url()));
  await page.goto("/");
  await expect(page.getByText("Scripted demo · no AI request")).toBeVisible();
  await expect(page.locator("#demo-result")).toBeHidden();
  await page.getByRole("button", { name: "Show the example" }).click();
  await expect(page.locator("#demo-result")).toBeVisible();
  await expect(
    page.frameLocator("#demo-frame").locator("#mp-title"),
  ).toHaveText("Consistent Hashing");
  expect(requests.every((u) => u.startsWith("http://127.0.0.1:4173/"))).toBe(
    true,
  );
});
test("tour completes and restores focus", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Take a tour" }).click();
  await expect(page.locator("#tour-title")).toHaveText(
    "Start with your question",
  );
  for (let i = 0; i < 3; i++) await page.locator("#tour-next").click();
  await expect(page.locator("#tour-title")).toHaveText(
    "Make the next one locally",
  );
  await page.locator("#tour-next").click();
  await expect(page.locator("#tour-layer")).toBeHidden();
  await expect(page.getByRole("button", { name: "Take a tour" })).toBeFocused();
});
test("download occurs only after explicit click", async ({ page }) => {
  let count = 0;
  page.on("download", () => count++);
  await page.goto("/");
  await page.getByRole("button", { name: "Run locally" }).click();
  expect(count).toBe(0);
  const pending = page.waitForEvent("download");
  await page.locator("#download").click();
  const download = await pending;
  expect(download.suggestedFilename()).toBe("motion-lab-toolkit.zip");
  expect(count).toBe(1);
});
test("player controls work and playback starts paused", async ({ page }) => {
  await page.goto("/lessons/two-sum.html");
  await expect(page.locator("#mp-play")).toContainText("Play");
  const before = await page.locator("#mp-time").textContent();
  await page.waitForTimeout(200);
  expect(await page.locator("#mp-time").textContent()).toBe(before);
  await page.locator("#mp-next").click();
  expect(await page.locator("#mp-time").textContent()).not.toBe(before);
  await page.locator("#mp-prev").click();
  await page.locator("#mp-side-toggle").click();
  await page.getByRole("tab", { name: "Code", exact: true }).click();
  await expect(page.locator("#mp-code-body")).toContainText("function twoSum");
  await page.getByRole("tab", { name: "Time & space" }).click();
  await expect(page.locator("#mp-panel-complexity")).toContainText("O(n)");
  await page.locator("#mp-compare").click();
  await expect(page.locator("#mp-wrap-b")).toBeVisible();
  await page.keyboard.press("End");
  await page.keyboard.press("Home");
});

test("invalid inputs preserve the last valid visualization and recover", async ({
  page,
}) => {
  await page.goto("/lessons/two-sum.html");
  const input = page.locator("#mp-param-values");
  await input.fill("1, not-a-number, 3");
  await input.press("Tab");
  await expect(input).toHaveAttribute("aria-invalid", "true");
  await expect(page.locator("#mp-error-values")).toContainText("Use numbers");
  await expect(page.locator("#mp-cap-text")).toContainText("2, 7, 11, 15");
  await input.fill("4, 5");
  await input.press("Tab");
  await expect(input).not.toHaveAttribute("aria-invalid", "true");
  await expect(page.locator("#mp-cap-text")).toContainText("4, 5");
});
test("hero changes ownership and returns to the original state", async ({
  page,
}) => {
  await page.goto("/");
  await page.locator("#hero-toggle").click();
  await expect(page.locator("#hero-result")).toContainText("(48, 64]");
  await expect(page.locator("#hero-toggle")).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await page.locator("#hero-toggle").click();
  await expect(page.locator("#hero-result")).toHaveText("Key 60 belongs to C.");
});
test("tour blocks background controls and Escape restores them", async ({
  page,
}) => {
  await page.goto("/");
  await page.locator("#tour-start").click();
  expect(await page.locator("main").evaluate((e) => e.inert)).toBe(true);
  await page.keyboard.press("Escape");
  expect(await page.locator("main").evaluate((e) => e.inert)).toBe(false);
  await expect(page.locator("#tour-start")).toBeFocused();
});
test("reduced-motion demo remains user controlled", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await page.locator("#demo-replay").click();
  await expect(page.locator("#typed-prompt")).toContainText(
    "consistent hashing",
  );
  await expect(page.locator("#demo-result")).toBeHidden();
  await page.locator("#demo-run").click();
  await expect(page.locator("#demo-result")).toBeVisible();
});
