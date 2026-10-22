import assert from 'node:assert/strict';
import test from 'node:test';

import { fixture, firstScene, generate } from './helpers.ts';
import { required } from '../engine/assert.ts';

await test('migrated keys arrive before their ownership changes', () => {
  const scene = generate('consistent-hash', { keys: [48, 49, 60, 64, 65] });
  const beat = required(scene.beats[3]);
  const moves = beat.actions.filter((a) => a.do === 'move');
  assert.equal(moves.length, 3);
  const updates = beat.actions.filter((a) => a.do === 'rows');
  assert.equal(updates.length, 3);
  moves.forEach((move, i) => assert(required(required(updates[i]).at)[0] >= required(move.at)[1]));
  assert.deepEqual(required(updates.at(-1)).value, [
    '48 → B',
    '49 → D',
    '60 → D',
    '64 → D',
    '65 → C',
  ]);
});

await test('BFS explores every edge but never enqueues an already discovered vertex', () => {
  const scene = generate('graph-bfs', { mode: 'cycle' });
  assert.equal(scene.beats.flatMap((b) => b.actions).filter((a) => a.do === 'move').length, 6);
  const final = required(
    scene.beats
      .flatMap((b) => b.actions)
      .filter((a) => a.do === 'rows')
      .filter((a) => a.actor === 'distance')
      .at(-1),
  );
  assert.deepEqual(final.value, ['0 → 0', '1 → 1', '2 → 1', '3 → 2', '4 → 3']);
});

await test('outbox rollback publishes nothing and duplicate delivery applies one effect', async () => {
  const spec = await fixture(new URL('../templates/transactional-outbox.json', import.meta.url));
  const rollback = required(spec.variants?.[1]?.scene);
  assert(
    !rollback.beats.flatMap((b) => b.actions).some((a) => a.do === 'move' && a.link === 'deliver'),
  );
  const retry = required(spec.variants?.[2]?.scene);
  const effects = retry.beats
    .flatMap((b) => b.actions)
    .filter((a) => a.do === 'set')
    .filter((a) => a.actor === 'effect');
  assert(effects.length >= 2);
  assert(effects.every((a) => a.value === 1));
});

await test('replica reads reflect routing and applied replication', async () => {
  const spec = await fixture(new URL('../templates/replica-read.json', import.meta.url));
  for (const [index, expected] of ['version 1', 'version 2', 'version 2'].entries()) {
    const scene = required(spec.variants?.[index]?.scene);
    const result = scene.beats
      .flatMap((b) => b.actions)
      .filter((a) => a.do === 'set')
      .filter((a) => a.actor === 'client')
      .at(-1);
    assert.equal(result?.value, expected);
  }
});

await test('monotonic stack results agree with independent suffix search', async () => {
  const spec = await fixture(new URL('../templates/next-greater.json', import.meta.url));
  for (const variant of required(spec.variants)) {
    const scene = firstScene({ ...spec, variants: [variant] });
    const input = required(scene.actors.find((a) => a.id === 'input'));
    assert(input.kind === 'cells');
    const values = input.values.map(Number);
    const expected = values.map(
      (value, i) => `${i} → ${values.slice(i + 1).find((next) => next > value) ?? -1}`,
    );
    const result = required(scene.beats.at(-1)).actions.find((a) => a.do === 'rows');
    assert.deepEqual(result?.value, expected);
  }
});
