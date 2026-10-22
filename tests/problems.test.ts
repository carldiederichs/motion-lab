import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import { fixture } from './helpers.ts';
import { required } from '../engine/assert.ts';
import { catalogueSchema, problemSchema } from '../engine/model.ts';

await test('every algorithm includes a sourced problem and related techniques are distinguished', async () => {
  const catalogue = catalogueSchema.parse(
    JSON.parse(await readFile(new URL('../examples/catalogue.json', import.meta.url), 'utf8')),
  );
  for (const entry of catalogue) {
    const spec = await fixture(new URL(`../examples/${entry.slug}.json`, import.meta.url));
    if (entry.category !== 'Algorithms') continue;
    const problem = required(spec.problem);
    assert.equal(
      problem.source.relationship,
      ['sliding-window', 'graph-bfs'].includes(entry.slug) ? 'related' : 'exact',
    );
    assert(problem.example.explanation.length > 0);
    assert(problem.source.note.length > 0);
  }
});

await test('problem metadata rejects arbitrary URLs, path traversal and oversized source text', async () => {
  const problem = required(
    (await fixture(new URL('../examples/two-sum.json', import.meta.url))).problem,
  );
  for (const slug of [
    '../two-sum',
    'two-sum?redirect=other',
    'javascript:alert(1)',
    '//other.example',
    'two-sum/#fragment',
  ])
    assert.equal(
      problemSchema.safeParse({ ...problem, source: { ...problem.source, slug } }).success,
      false,
    );
  assert.equal(problemSchema.safeParse({ ...problem, statement: 'x'.repeat(1201) }).success, false);
  assert.equal(
    problemSchema.safeParse({
      ...problem,
      source: { ...problem.source, url: 'https://other.example' },
    }).success,
    false,
  );
});
