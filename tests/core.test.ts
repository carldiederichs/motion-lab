import assert from 'node:assert/strict';
import { readFile, mkdtemp, writeFile, mkdir, symlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';

import { fixture, firstScene, generate, rowValues, finalValue } from './helpers.ts';
import { required } from '../engine/assert.ts';
import { catalogueSchema } from '../engine/model.ts';
import type { Spec, Params } from '../engine/model.ts';
import { parseInput } from '../engine/parse-input.ts';
import { releaseFiles, toolkitZip } from '../scripts/archive.ts';
import { render, validate, ROOT } from '../scripts/renderer.ts';
import { createServer } from '../scripts/serve.ts';
const sample = await fixture(new URL('../examples/c4-architecture.json', import.meta.url));
const catalog = catalogueSchema.parse(
  JSON.parse(await readFile(new URL('../examples/catalogue.json', import.meta.url), 'utf8')),
);
for (const item of catalog)
  await test(`render public example: ${item.slug}`, async () => {
    const spec: unknown = JSON.parse(
      await readFile(path.join(ROOT, 'examples', item.slug + '.json'), 'utf8'),
    );
    const html = await render(spec);
    assert(html.includes('id="motion-spec"'));
    assert(!html.includes('__MOTION_SPEC__'));
    assert(!html.includes("fetch('/api/event'"));
  });
await test('script-shaped labels remain JSON text, including replacement tokens', async () => {
  const s = structuredClone(sample);
  s.title = '</script><script>globalThis.attack=true</script> $&';
  const html = await render(s);
  assert(!html.includes('<script>globalThis.attack=true'));
  const payload = required(
    html.match(/id="motion-spec" type="application\/json">(.*?)<\/script>/s),
  )[1];
  assert.equal(validate(JSON.parse(required(payload))).title, s.title);
});
for (const [name, change] of [
  ['path traversal', (s: Spec) => (s.slug = '../outside')],
  ['unknown fields', (s: Spec) => Reflect.set(s, 'privateRecord', 'x')],
  ['missing actor', (s: Spec) => (required(required(firstScene(s).links)[0]).from = 'absent')],
  ['duplicate ids', (s: Spec) => firstScene(s).actors.push(required(firstScene(s).actors[0]))],
  ['NaN coordinate', (s: Spec) => (required(firstScene(s).actors[0]).x = NaN)],
  ['negative duration', (s: Spec) => (required(firstScene(s).beats[0]).dur = -1)],
  [
    'unknown action',
    (s: Spec) => Reflect.set(required(firstScene(s).beats[0]), 'actions', [{ do: 'execute' }]),
  ],
  ['long code', (s: Spec) => (s.code = { lines: ['a'.repeat(59)] })],
  ['invalid preset', (s: Spec) => (required(s.edgeCases[0]).variant = 999)],
] satisfies [string, (spec: Spec) => unknown][])
  await test(`reject ${name}`, () => {
    const s = structuredClone(sample);
    change(s);
    assert.throws(() => validate(s));
  });
await test('reject prototype keys', () => {
  const s: unknown = JSON.parse(
    JSON.stringify(sample).replace(
      '"kind":"motion"',
      '"kind":"motion","__proto__":{"injected":true}',
    ),
  );
  assert.throws(() => validate(s));
  assert.equal(Reflect.get({}, 'injected'), undefined);
});
await test('binary search agrees with an independent search over varied inputs', () => {
  for (let n = 0; n <= 10; n++)
    for (let target = -1; target < 23; target++) {
      const values = Array.from({ length: n }, (_, i) => i * 2);
      const scene = generate('binary-search', { values, target });
      const result = required(
        required(scene.beats.at(-1)).actions.find((a) => a.do === 'set'),
      ).value;
      assert.equal(result, values.indexOf(target));
    }
});
await test('hash-ring migration changes only the new interval', () => {
  for (let i = 0; i < 100; i++) {
    const scene = generate('consistent-hash', { keys: [i] });
    const before = rowValues(scene, 1)[0],
      after = rowValues(scene, 3)[0];
    assert.equal(before !== after, i > 48 && i <= 64);
    if (i > 80) assert.match(String(after), /A$/);
  }
});
await test('islands agrees with independent breadth-first traversal', () => {
  for (let mask = 0; mask < 512; mask++) {
    const rows = Array.from({ length: 3 }, (_, r) =>
      Array.from({ length: 3 }, (_cell, c) => String((mask >> (r * 3 + c)) & 1)).join(''),
    );
    const grid = rows.map((r) => r.split('').map(Number));
    let count = 0;
    for (let r = 0; r < 3; r++)
      for (let c = 0; c < 3; c++) {
        if (!(required(grid[r])[c] ?? 0)) continue;
        count++;
        const q: [number, number][] = [[r, c]];
        required(grid[r])[c] = 0;
        while (q.length) {
          const [y, x] = required(q.shift());
          for (const [dy, dx] of [
            [1, 0],
            [-1, 0],
            [0, 1],
            [0, -1],
          ] as const) {
            const a = y + dy,
              b = x + dx;
            if (grid[a]?.[b] ?? 0) {
              required(grid[a])[b] = 0;
              q.push([a, b]);
            }
          }
        }
      }
    const scene = generate('islands', { grid: rows });
    assert.match(required(scene.beats.at(-1)).title, new RegExp(`^${count} connected`));
  }
});
await test('invalid ragged grid is rejected', () =>
  assert.throws(() => generate('islands', { grid: ['10', '1'] }), /equal-width/));
await test('generators are deterministic across repeated calls', () => {
  for (const [name, p] of [
    ['consistent-hash', { keys: [1, 63, 99] }],
    ['binary-search', { values: [1, 3, 9], target: 3 }],
    ['islands', { grid: ['101', '111'] }],
    ['two-sum', { values: [3, 3], target: 6 }],
    ['lost-update', { start: 2, schedule: 'interleaved' }],
  ] satisfies [string, Params][])
    assert.equal(JSON.stringify(generate(name, p)), JSON.stringify(generate(name, p)));
});
await test('archive allowlist excludes local work, history and symlinks', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'motion-release-'));
  await mkdir(path.join(root, 'engine'));
  await mkdir(path.join(root, 'local'));
  await writeFile(path.join(root, 'engine/a.js'), 'safe');
  await writeFile(path.join(root, 'local/private.json'), 'not included');
  await writeFile(path.join(root, '.env'), 'not included');
  assert.deepEqual(await releaseFiles(root), ['engine/a.js']);
  await symlink(path.join(root, 'local/private.json'), path.join(root, 'engine/link'));
  await assert.rejects(releaseFiles(root), /symlink/);
});
await test('download is a valid ZIP with a skill and no local workspace', async () => {
  const zip = await toolkitZip();
  assert.equal(zip.readUInt32LE(), 0x04034b50);
  let pos = 0;
  const names: string[] = [];
  while (zip.readUInt32LE(pos) === 0x04034b50) {
    const size = zip.readUInt32LE(pos + 18),
      n = zip.readUInt16LE(pos + 26),
      extra = zip.readUInt16LE(pos + 28);
    names.push(zip.subarray(pos + 30, pos + 30 + n).toString());
    pos += 30 + n + extra + size;
  }
  assert(names.includes('motion-lab/.agents/skills/motion-lab/SKILL.md'));
  assert(!names.some((n) => /\/(local|\.git|dist|node_modules)\//.test(n)));
  assert.equal(zip.readUInt32LE(pos), 0x02014b50);
});
await test('server blocks writes, traversal, dotfiles and symlink escapes', async () => {
  const dir = await mkdtemp(path.join(tmpdir(), 'motion-server-'));
  await writeFile(path.join(dir, 'index.html'), 'hello');
  await writeFile(path.join(dir, '.env'), 'private');
  const outside = path.join(dir, '../outside-' + path.basename(dir) + '.html');
  await writeFile(outside, 'outside');
  await symlink(outside, path.join(dir, 'escape.html'));
  const server = createServer({ directory: dir });
  await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
  try {
    const address = server.address();
    assert(address !== null && typeof address !== 'string');
    const base = `http://127.0.0.1:${address.port}`;
    assert.equal(await (await fetch(base)).text(), 'hello');
    for (const p of ['/.env', '/escape.html', '/%2eenv', '/local/private.html', '/%5c..%5cfile'])
      assert.equal((await fetch(base + p)).status, 404);
    assert.equal((await fetch(base, { method: 'POST', body: 'x' })).status, 405);
    assert.match(
      (await fetch(base)).headers.get('content-security-policy') ?? '',
      /object-src 'none'/,
    );
  } finally {
    await new Promise((r) => server.close(r));
  }
});

await test('two-sum variants agree with exhaustive pair existence', () => {
  for (let mask = 0; mask < 243; mask++) {
    let x = mask;
    const values = Array.from({ length: 5 }, () => {
      const v = (x % 3) - 1;
      x = Math.floor(x / 3);
      return v;
    });
    for (let target = -3; target <= 3; target++) {
      const possible = values.some((a, i) => values.some((b, j) => j > i && a + b === target));
      for (const method of ['map', 'rescan']) {
        const result = required(generate('two-sum', { values, target, method }).beats.at(-1)).title;
        assert.equal(result.startsWith('Answer'), possible);
        if (possible) {
          const [, a, b] = required(result.match(/\[(\d+), (\d+)\]/));
          assert.notEqual(a, b);
          assert.equal(required(values[Number(a)]) + required(values[Number(b)]), target);
        }
      }
    }
  }
});
await test('coin change agrees with breadth-first amount search', () => {
  for (const coins of [[1, 3, 4], [2, 4], [3, 5], [7], [1]])
    for (let amount = 0; amount <= 10; amount++) {
      const q: [number, number][] = [[0, 0]],
        seen = new Set([0]);
      let result = -1;
      while (q.length) {
        const [a, n] = required(q.shift());
        if (a === amount) {
          result = n;
          break;
        }
        for (const c of coins)
          if (a + c <= amount && !seen.has(a + c)) {
            seen.add(a + c);
            q.push([a + c, n + 1]);
          }
      }
      assert.equal(finalValue(generate('coin-change', { coins, amount }), 'answer'), result);
    }
});
await test('linked list reverses every edge and preserves the final head', () => {
  for (let n = 0; n <= 6; n++) {
    const scene = generate('linked-list', {
      values: Array.from({ length: n }, (_, i) => i),
    });
    const changes = scene.beats.flatMap((b) => b.actions).filter((a) => a.do === 'tone');
    assert.equal(
      changes.filter((a) => a.link?.startsWith('back') === true).length,
      Math.max(0, n - 1),
    );
    assert.equal(
      changes.filter((a) => a.link?.startsWith('forward') === true).length,
      Math.max(0, n - 1),
    );
    const prev = scene.beats
      .flatMap((b) => b.actions)
      .filter((a) => a.do === 'set')
      .filter((a) => a.actor === 'prev')
      .at(-1);
    assert.equal(prev?.value, n ? `node ${n - 1}` : undefined);
  }
});
await test('a cycle does not duplicate graph visits', () => {
  const scene = generate('graph-bfs', { mode: 'cycle' });
  const visits = scene.beats.filter((b) => b.title.startsWith('Visit node'));
  assert.equal(visits.length, 5);
  assert.equal(new Set(visits.map((b) => b.title)).size, 5);
  assert.match(required(scene.beats.at(-1)).title, /3 edges/);
  assert.match(
    required(generate('graph-bfs', { mode: 'disconnected' }).beats.at(-1)).title,
    /unreachable/,
  );
});
for (const raw of ['1, two, 3', '1e100', '1000', '1,2,3,4', ''])
  await test(`reject malformed or unsupported numeric input: ${JSON.stringify(raw)}`, () =>
    assert.throws(() =>
      parseInput({ id: 'input', label: 'Input', default: 0, type: 'numbers', max: 3 }, raw),
    ));
await test('input parser preserves zero, negative values and explicit empty lists', () => {
  assert.equal(
    JSON.stringify(
      parseInput({ id: 'input', label: 'Input', default: 0, type: 'numbers', max: 3 }, '0,-2,3'),
    ),
    '[0,-2,3]',
  );
  assert.equal(
    JSON.stringify(
      parseInput(
        { id: 'input', label: 'Input', default: 0, type: 'numbers', allowEmpty: true },
        '',
      ),
    ),
    '[]',
  );
  assert.equal(
    JSON.stringify(
      parseInput({ id: 'input', label: 'Input', default: 0, type: 'tree' }, '[1,null,2]'),
    ),
    '[1,null,2]',
  );
});
await test('integer and coin inputs reject silent rounding and invalid values', () => {
  for (const raw of ['2.5', '999', ''])
    assert.throws(() =>
      parseInput({ id: 'input', label: 'Input', default: 0, type: 'int', min: 0, max: 10 }, raw),
    );
  for (const raw of ['0', '-1', '1.5'])
    assert.throws(() =>
      parseInput(
        { id: 'input', label: 'Input', default: 0, type: 'numbers', positiveInteger: true },
        raw,
      ),
    );
});
await test('binary rows reject unsupported symbols', () =>
  assert.throws(() =>
    parseInput(
      { id: 'input', label: 'Input', default: 0, type: 'list', pattern: '^[01]{1,5}$' },
      '110x',
    ),
  ));
