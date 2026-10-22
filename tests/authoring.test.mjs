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

const fixture = async (name) => JSON.parse(await readFile(new URL(name + ".json", fixtures)));
const actor = (scene, id) => scene.actors.find((a) => a.id === id);
const finalValue = (scene, id) => scene.beats.flatMap((b) => b.actions)
  .filter((a) => a.do === "set" && a.actor === id).at(-1)?.value;

test("prefix queries agree with direct range addition, including empty and negative ranges", async () => {
  const s = await fixture("prefix-range");
  for (const [i, [left, right]] of [[1, 3], [2, 2], [0, 3]].entries()) {
    const scene = s.variants[i].scene;
    const values = actor(scene, "input").values;
    assert.equal(finalValue(scene, "answer"), values.slice(left, right).reduce((a, b) => a + b, 0));
    for (const a of scene.beats.flatMap((b) => b.actions).filter((a) => a.do === "cellValue"))
      assert.equal(a.value, values.slice(0, a.index).reduce((x, y) => x + y, 0));
  }
});

test("interval sweep agrees with direct occupancy and does not double-count touching endpoints", async () => {
  const s = await fixture("interval-sweep");
  for (const [i, intervals] of [[[1, 4], [2, 5], [3, 6]], [[1, 3], [3, 5]], []].entries()) {
    const scene = s.variants[i].scene;
    const expected = Math.max(0, ...Array.from({ length: 29 }, (_, j) => j / 4)
      .map((time) => intervals.filter(([start, end]) => start <= time && time < end).length));
    const counts = scene.beats.flatMap((b) => b.actions).filter((a) => a.actor === "active" && a.do === "set");
    assert(counts.every((a) => a.value >= 0));
    assert.equal(finalValue(scene, "active") ?? actor(scene, "active").value, 0);
    assert.equal(finalValue(scene, "peak") ?? actor(scene, "peak").value, expected);
  }
});

test("trie lookup distinguishes stored words from prefixes and missing suffixes", async () => {
  const s = await fixture("trie-prefix");
  for (const { scene } of s.variants)
    assert.equal(finalValue(scene, "found"), String(new Set(["cat", "car"]).has(actor(scene, "query").value)));
});

test("flag checks require every requested bit, including the empty requirement", async () => {
  const s = await fixture("bitmask-flags");
  for (const { scene } of s.variants) {
    const enabled = actor(scene, "enabled").values;
    const required = actor(scene, "required").values;
    assert.equal(finalValue(scene, "result"), String(required.every((bit, i) => !bit || enabled[i] === 1)));
    for (const a of scene.beats.flatMap((b) => b.actions).filter((a) => a.do === "cellValue"))
      assert.equal(a.value, enabled[a.index] && required[a.index]);
  }
});

for (const malformed of ["missing id", "duplicate id", "unknown pointer"]) {
  test(`reject ${malformed} in a timeline`, async () => {
    const s = await fixture("interval-sweep");
    const scene = s.variants[0].scene;
    const timeline = scene.actors.find((a) => a.pointers?.length);
    if (malformed === "missing id") delete timeline.pointers[0].id;
    if (malformed === "duplicate id") timeline.pointers.push({ ...timeline.pointers[0] });
    if (malformed === "unknown pointer") scene.beats[0].actions.push({ do: "pointer", actor: timeline.id, pointer: "absent", index: 0 });
    assert.throws(() => validate(s), /pointer/);
  });
}
