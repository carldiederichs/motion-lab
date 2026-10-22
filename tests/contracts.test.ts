import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';

import { fixture, generate } from './helpers.ts';
import { catalogueSchema } from '../engine/model.ts';
import type { Params } from '../engine/model.ts';
import { parseInput } from '../engine/parse-input.ts';
import { ROOT, validate, validateScene } from '../scripts/renderer.ts';

const catalogue = catalogueSchema.parse(
  JSON.parse(await readFile(path.join(ROOT, 'examples/catalogue.json'), 'utf8')),
);

for (const item of catalogue) {
  const spec = await fixture(path.join(ROOT, 'examples', `${item.slug}.json`));
  const simulation = spec.simulation;
  if (simulation === undefined) continue;
  await test(`${item.slug}: all published inputs produce a valid scene contract`, () => {
    const defaults: Params = Object.fromEntries(
      simulation.params.map((param) => [param.id, param.default]),
    );
    const variants = spec.variants?.map((variant) => variant.params ?? {}) ?? [{}];
    const inputs = [
      {},
      ...(simulation.qaParams ?? []),
      ...spec.edgeCases.map((edge) => edge.params ?? {}),
    ];
    for (const variant of variants)
      for (const input of inputs) {
        validateScene(generate(simulation.generator, { ...defaults, ...input, ...variant }));
      }
  });
}

await test('generator names cannot resolve through Object.prototype', async () => {
  const spec = await fixture(path.join(ROOT, 'examples/two-sum.json'));
  assert(spec.simulation !== undefined);
  for (const name of ['constructor', 'toString', '__proto__']) {
    spec.simulation.generator = name;
    assert.throws(() => validate(spec), /Unknown generator/);
  }
});

await test('direct generator inputs reject data that would otherwise be truncated or changed', () => {
  for (const [name, params] of [
    ['consistent-hash', { keys: [1, 2, 3, 4, 5, 6, 7] }],
    ['binary-search', { values: Array.from({ length: 11 }, (_, i) => i), target: 0 }],
    ['linked-list', { values: [1, 2, 3, 4, 5, 6, 7] }],
    ['coin-change', { amount: 11, coins: [1] }],
    ['coin-change', { amount: 3, coins: [0, 1.5] }],
    ['islands', { grid: ['110X'] }],
    ['islands', { grid: ['111111'] }],
    ['islands', { grid: ['1', '1', '1', '1', '1'] }],
    ['two-sum', { values: [1, 2], target: 3, method: 'unknown' }],
  ] satisfies [string, Params][])
    assert.throws(() => generate(name, params), name);
});

await test('code input preserves every character and rejects overflow instead of truncating', () => {
  const parameter = { id: 'code', label: 'Code', default: '', type: 'code' } as const;
  const code = 'console.log("unchanged")\n';
  assert.equal(parseInput(parameter, code), code);
  assert.throws(() => parseInput(parameter, 'x'.repeat(59)), /58 characters/);
  assert.throws(
    () => parseInput(parameter, Array.from({ length: 17 }, () => '// line').join('\n')),
    /16 lines/,
  );
});
