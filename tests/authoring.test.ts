import assert from 'node:assert/strict';
import { readdir } from 'node:fs/promises';
import test from 'node:test';

import { actor, cells, finalValue, fixture, firstScene } from './helpers.ts';
import { required } from '../engine/assert.ts';
import type { Spec } from '../engine/model.ts';
import { render, validate } from '../scripts/renderer.ts';

const fixtures = new URL('../templates/', import.meta.url);
const load = (name: string): Promise<Spec> => fixture(new URL(`${name}.json`, fixtures));
for (const name of await readdir(fixtures)) {
  await test(`novel authoring fixture: ${name}`, async () => {
    const spec = await fixture(new URL(name, fixtures));
    validate(spec);
    assert((await render(spec)).includes(spec.slug));
    const variants = required(spec.variants);
    assert.equal(variants.length, 3);
    assert.notDeepEqual(required(variants[0]).scene, required(variants[1]).scene);
  });
}
await test('grid-path fixture agrees with independently enumerated paths', async () => {
  const spec = await load('grid-paths');
  function count(row: number, col: number, blocked: readonly [number, number] | null): number {
    if (row > 2 || col > 2 || (blocked?.[0] === row && blocked[1] === col)) return 0;
    if (row === 2 && col === 2) return 1;
    return count(row + 1, col, blocked) + count(row, col + 1, blocked);
  }
  for (const [index, blocked] of [null, [1, 1], [0, 0]].entries()) {
    const scene = required(required(spec.variants?.[index]).scene);
    const result = required(required(scene.beats.at(-1)).actions[0]);
    assert(result.do === 'set');
    assert.equal(
      result.value,
      count(0, 0, blocked === null ? null : [required(blocked[0]), required(blocked[1])]),
    );
  }
});
await test('subsets fixture enumerates every subset exactly once', async () => {
  const spec = await load('subsets-backtracking');
  for (const [index, n] of [2, 1, 0].entries()) {
    const scene = required(required(spec.variants?.[index]).scene);
    const action = required(
      required(scene.beats.filter((beat) => beat.title === 'Record a subset').at(-1)).actions.find(
        (item) => item.do === 'rows',
      ),
    );
    assert(action.do === 'rows');
    assert.equal(action.value.length, 2 ** n);
    assert.equal(new Set(action.value).size, action.value.length);
  }
});
await test('prefix queries agree with direct range addition, including empty and negative ranges', async () => {
  const spec = await load('prefix-range');
  for (const [index, [left, right]] of (
    [
      [1, 3],
      [2, 2],
      [0, 3],
    ] as const
  ).entries()) {
    const scene = required(required(spec.variants?.[index]).scene);
    const values = cells(scene, 'input');
    assert.equal(
      finalValue(scene, 'answer'),
      values.slice(left, right).reduce((a, b) => a + b, 0),
    );
    for (const action of scene.beats
      .flatMap((beat) => beat.actions)
      .filter((item) => item.do === 'cellValue')) {
      assert.equal(
        action.value,
        values.slice(0, action.index).reduce((a, b) => a + b, 0),
      );
    }
  }
});
await test('interval sweep agrees with direct occupancy and does not double-count touching endpoints', async () => {
  const spec = await load('interval-sweep');
  for (const [index, intervals] of (
    [
      [
        [1, 4],
        [2, 5],
        [3, 6],
      ],
      [
        [1, 3],
        [3, 5],
      ],
      [],
    ] as const
  ).entries()) {
    const scene = required(required(spec.variants?.[index]).scene);
    const expected = Math.max(
      0,
      ...Array.from({ length: 29 }, (_, i) => i / 4).map(
        (time) => intervals.filter(([start, end]) => start <= time && time < end).length,
      ),
    );
    for (const action of scene.beats
      .flatMap((beat) => beat.actions)
      .filter((item) => item.do === 'set')
      .filter((item) => item.actor === 'active')) {
      assert(typeof action.value === 'number' && action.value >= 0);
    }
    assert.equal(finalValue(scene, 'active') ?? actor(scene, 'active').value, 0);
    assert.equal(finalValue(scene, 'peak') ?? actor(scene, 'peak').value, expected);
  }
});
await test('trie lookup distinguishes stored words from prefixes and missing suffixes', async () => {
  const spec = await load('trie-prefix');
  for (const variant of required(spec.variants)) {
    const scene = required(variant.scene);
    assert.equal(
      finalValue(scene, 'found'),
      String(new Set(['cat', 'car']).has(String(actor(scene, 'query').value))),
    );
  }
});
await test('flag checks require every requested bit, including the empty requirement', async () => {
  const spec = await load('bitmask-flags');
  for (const variant of required(spec.variants)) {
    const scene = required(variant.scene);
    const enabled = cells(scene, 'enabled');
    const wanted = cells(scene, 'required');
    assert.equal(
      finalValue(scene, 'result'),
      String(wanted.every((bit, index) => bit === 0 || enabled[index] === 1)),
    );
    for (const action of scene.beats
      .flatMap((beat) => beat.actions)
      .filter((item) => item.do === 'cellValue')) {
      assert.equal(action.value, required(enabled[action.index]) & required(wanted[action.index]));
    }
  }
});
for (const malformed of ['missing id', 'duplicate id', 'unknown pointer']) {
  await test(`reject ${malformed} in a timeline`, async () => {
    const spec = await load('interval-sweep');
    const scene = firstScene(spec);
    const timeline = required(
      scene.actors.find((item) => item.kind === 'cells' && (item.pointers?.length ?? 0) > 0),
    );
    assert(timeline.kind === 'cells');
    const pointers = required(timeline.pointers);
    if (malformed === 'missing id') Reflect.deleteProperty(required(pointers[0]), 'id');
    if (malformed === 'duplicate id') pointers.push({ ...required(pointers[0]) });
    if (malformed === 'unknown pointer')
      required(scene.beats[0]).actions.push({
        do: 'pointer',
        actor: timeline.id,
        pointer: 'absent',
        index: 0,
      });
    assert.throws(() => validate(spec), /pointer/);
  });
}
