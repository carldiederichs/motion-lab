import assert from "node:assert/strict";
const base = new URL(process.argv[2] || "http://127.0.0.1:4173");
if (
  !["http:", "https:"].includes(base.protocol) ||
  base.username ||
  base.password
)
  throw Error("Provide a public HTTP(S) origin without credentials");
async function get(route) {
  return fetch(new URL(route, base), {
    signal: AbortSignal.timeout(15000),
    redirect: "error",
  });
}
const catalogueResponse = await get("/catalogue.json");
assert.equal(catalogueResponse.status, 200);
const catalogue = await catalogueResponse.json();
assert(Array.isArray(catalogue) && catalogue.length >= 10);
for (const route of [
  "/",
  "/app.js",
  "/style.css",
  "/icon.svg",
  "/downloads/motion-lab-toolkit.zip",
  ...catalogue.map((x) => `/lessons/${x.slug}.html`),
]) {
  const r = await get(route);
  assert.equal(r.status, 200, route);
  assert.equal(r.headers.get("x-content-type-options"), "nosniff", route);
  if (route.endsWith(".zip")) {
    const bytes = new Uint8Array(await r.arrayBuffer());
    assert.deepEqual([...bytes.slice(0, 4)], [80, 75, 3, 4]);
  }
}
for (const route of [
  "/.env",
  "/local/test.json",
  "/AGENTS.md",
  "/examples/catalogue.json",
  "/lessons/does-not-exist.html",
])
  assert.equal((await get(route)).status, 404, route);
console.log(
  `Passed: ${catalogue.length} lessons, assets, toolkit and private-route isolation at ${base.origin}`,
);
