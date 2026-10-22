import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import { required } from '../engine/assert.ts';
import { catalogueSchema, specSchema } from '../engine/model.ts';
import type { Code } from '../engine/model.ts';
const catalogue = catalogueSchema.parse(
  JSON.parse(await readFile(new URL('../examples/catalogue.json', import.meta.url), 'utf8')),
);
for (const entry of catalogue) {
  const spec = specSchema.parse(
    JSON.parse(await readFile(new URL(`../examples/${entry.slug}.json`, import.meta.url), 'utf8')),
  );
  const blocks = [spec.code, ...(spec.variants ?? []).map((variant) => variant.code)].filter(
    (code): code is Code => code !== undefined,
  );
  if (blocks.length === 0) continue;
  await test(`${entry.slug}: all published code views preserve complete line mappings`, () => {
    for (const block of blocks) {
      assert.deepEqual(
        [block.language, ...(block.alternatives ?? []).map((view) => view.language)].sort(),
        ['cpp', 'java', 'js', 'python', 'ts'],
      );
      for (const alternative of block.alternatives ?? []) {
        assert.equal(alternative.lines.length, alternative.sourceLines.length);
        assert(alternative.lines.every((line) => line.length <= 58));
        assert(
          alternative.sourceLines.flat().every((line) => line >= 1 && line <= block.lines.length),
        );
      }
    }
  });
}
await test('code views reject ambiguous languages and broken highlight mappings', async () => {
  const spec = specSchema.parse(
    JSON.parse(await readFile(new URL('../examples/binary-search.json', import.meta.url), 'utf8')),
  );
  const code = required(spec.code);
  const view = required(code.alternatives?.[0]);
  assert(!specSchema.safeParse({ ...spec, code: { ...code, alternatives: [view, view] } }).success);
  assert(
    !specSchema.safeParse({
      ...spec,
      code: { ...code, alternatives: [{ ...view, sourceLines: [] }] },
    }).success,
  );
  assert(
    !specSchema.safeParse({
      ...spec,
      code: { ...code, alternatives: [{ ...view, sourceLines: view.lines.map(() => [999]) }] },
    }).success,
  );
  assert(
    !specSchema.safeParse({
      ...spec,
      code: { ...code, alternatives: [{ ...view, language: 'executable-script' }] },
    }).success,
  );
});
