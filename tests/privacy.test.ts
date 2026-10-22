import assert from 'node:assert/strict';
import test from 'node:test';

import { scan } from '../scripts/privacy.ts';
await test('release scanner catches generic secret and source-path canaries', () => {
  for (const value of [
    'sk-' + 'x'.repeat(32),
    ['', 'Users', 'sample', 'project'].join('/'),
    'test' + '@' + 'example.invalid',
    'https://' + 'app.notion.com/p/example',
  ])
    assert(scan(value).length > 0);
  assert.deepEqual(scan('Synthetic key 12 routes to server A. See /lessons/graph-bfs.html.'), []);
});
