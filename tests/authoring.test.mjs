import test from "node:test";
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { render, validate } from "../scripts/renderer.mjs";
const fixtures = new URL("../templates/", import.meta.url);
for (const name of await readdir(fixtures))
  test(`novel authoring fixture: ${name}`, async () => {
    const s = JSON.parse(await readFile(new URL(name, fixtures)));
    validate(s);
    const html = await render(s);
    assert(html.includes(s.slug));
    assert.equal(s.variants.length, 3);
    assert.notDeepEqual(s.variants[0].scene, s.variants[1].scene);
  });
test("grid-path fixture agrees with independently enumerated paths", async () => {
  const s = JSON.parse(await readFile(new URL("grid-paths.json", fixtures)));
  function count(r, c, blocked) {
    if (r > 2 || c > 2 || (blocked?.[0] === r && blocked?.[1] === c)) return 0;
    if (r === 2 && c === 2) return 1;
    return count(r + 1, c, blocked) + count(r, c + 1, blocked);
  }
  for (const [i, blocked] of [null, [1, 1], [0, 0]].entries())
    assert.equal(
      s.variants[i].scene.beats.at(-1).actions[0].value,
      count(0, 0, blocked),
    );
});
test("subsets fixture enumerates every subset exactly once", async () => {
  const s = JSON.parse(
    await readFile(new URL("subsets-backtracking.json", fixtures)),
  );
  for (const [i, n] of [2, 1, 0].entries()) {
    const records = s.variants[i].scene.beats
      .filter((b) => b.title === "Record a subset")
      .at(-1).actions[0].value;
    assert.equal(records.length, 2 ** n);
    assert.equal(new Set(records).size, records.length);
  }
});
