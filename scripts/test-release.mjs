import { mkdtemp, readFile, writeFile, access } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import assert from "node:assert/strict";
import { ROOT } from "./renderer.mjs";
const scratch = await mkdtemp(path.join(tmpdir(), "motion-release-test-"));
const run = (cwd, args) =>
  execFileSync(process.execPath, args, { cwd, stdio: "pipe" }).toString();
async function exercise(root, label) {
  run(root, ["scripts/build.mjs"]);
  run(root, ["scripts/privacy.mjs"]);
  run(root, [
    "scripts/cli.mjs",
    "new",
    "retry-example",
    "--template",
    "idempotent-retry",
  ]);
  run(root, ["scripts/cli.mjs", "validate", "local/retry-example.json"]);
  run(root, ["scripts/cli.mjs", "build", "local/retry-example.json"]);
  await access(path.join(root, "local/retry-example.html"));
  run(root, ["scripts/build.mjs"]);
  assert(
    !(await readFile(path.join(root, "dist/catalogue.json"), "utf8")).includes(
      "retry-example",
    ),
  );
  const { createServer } = await import(
    pathToFileURL(path.join(root, "scripts/serve.mjs")).href
  );
  const server = createServer();
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  try {
    const base = `http://127.0.0.1:${server.address().port}`;
    const catalogue = JSON.parse(
      await readFile(path.join(root, "examples/catalogue.json"), "utf8"),
    );
    for (const route of [
      "/",
      "/app.js",
      "/style.css",
      "/catalogue.json",
      "/downloads/motion-lab-toolkit.zip",
      ...catalogue.map((x) => `/lessons/${x.slug}.html`),
    ])
      assert.equal((await fetch(base + route)).status, 200, route);
    for (const route of [
      "/local/retry-example.json",
      "/local/retry-example.html",
      "/.env",
      "/AGENTS.md",
      "/examples/catalogue.json",
      "/lessons/missing.html",
    ])
      assert.equal((await fetch(base + route)).status, 404, route);
  } finally {
    await new Promise((r) => server.close(r));
  }
  console.log(
    `${label}: dependency-free build, local authoring, production routes and isolation passed`,
  );
}
const zip = path.join(ROOT, "dist/downloads/motion-lab-toolkit.zip");
execFileSync("unzip", ["-tq", zip], { stdio: "pipe" });
execFileSync("unzip", ["-q", zip, "-d", path.join(scratch, "unpacked")]);
await exercise(path.join(scratch, "unpacked/motion-lab"), "Downloaded toolkit");
if (process.argv.includes("--checkout")) {
  const clone = path.join(scratch, "checkout");
  execFileSync("git", ["clone", "--quiet", "--no-hardlinks", ROOT, clone]);
  await exercise(clone, "Fresh Git checkout");
}
console.log(
  "Release checks complete. Temporary test files contain only synthetic examples.",
);
