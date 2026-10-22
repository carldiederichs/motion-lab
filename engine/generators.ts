import { required, errorMessage } from './assert.ts';
import * as EL from './event-loop.ts';
import type { Model, Snapshot, Task, Region } from './event-loop.ts';
import { inputSchemas } from './inputs.ts';
import type { Action, Actor, Beat, Generator, Link, Token, Tone } from './model.ts';
/* Input-driven simulations. No network, credentials or personal records. */
export const coreGenerators: Record<string, Generator> = {
  'two-sum': (() => {
    const handlers: Record<string, Generator> = {
      // Two Sum: rescan the suffix vs look up the complement before inserting.
      'two-sum': (raw) => {
        const p = inputSchemas['two-sum'].parse(raw);
        const values = p.values;
        const target = Number(p.target);
        const n = values.length;
        const useMap = p.method !== 'rescan';
        const cell = Math.min(70, Math.floor(600 / Math.max(n, 1)));
        const x0 = 60 + cell / 2;
        const actors: Actor[] = [
          {
            id: 'title',
            kind: 'text',
            x: 470,
            y: 30,
            text: useMap
              ? `Target ${target}: ask the map for the missing partner, then store the current value`
              : `Target ${target}: for every value, re-scan everything after it`,
          },
          {
            id: 'arr',
            kind: 'cells',
            x: x0,
            y: 150,
            cell,
            values: values.slice(),
            pointers: [
              { id: 'i', label: 'i', index: -1, tone: 'mechanism' },
              ...(useMap ? [] : [{ id: 'j', label: 'j', index: -1, tone: 'repeated' as const }]),
            ],
          },
          {
            id: 'need',
            kind: 'box',
            x: 170,
            y: 330,
            w: 220,
            h: 76,
            label: 'needed partner',
            value: '—',
            inspectLabel: 'needed = target − value',
          },
          {
            id: 'reads',
            kind: 'box',
            x: 430,
            y: 330,
            w: 220,
            h: 76,
            label: useMap ? 'map lookups' : 'values compared',
            value: 0,
            inspectLabel: 'work done',
          },
        ];
        if (useMap)
          actors.push({
            id: 'seen',
            kind: 'store',
            x: 810,
            y: 235,
            w: 240,
            h: 330,
            label: 'seen: value → index',
            rows: [],
            code: true,
            inspectLabel: 'seen map',
          });
        const beats: Beat[] = [
          {
            title: 'Start',
            text: `nums = [${values.join(', ')}], target ${target}. Find two different indices whose values add to ${target}.`,
            dur: 1400,
            actions: [],
          },
        ];
        let work = 0;
        let found: [number, number] | null = null;
        const seen = new Map<number, number>();
        const rows: string[] = [];
        if (useMap) {
          for (let i = 0; i < n && !found; i += 1) {
            const v = required(values[i]);
            const need = target - v;
            work += 1;
            const hit = seen.get(need);
            const acts: Action[] = [
              { do: 'pointer', actor: 'arr', pointer: 'i', index: i, at: [0, 0.25] },
              { do: 'cells', actor: 'arr', range: [i, i], tone: 'mechanism', at: [0.2, 0.25] },
              { do: 'set', actor: 'need', value: need, at: [0.25, 0.45] },
              { do: 'set', actor: 'reads', value: work, at: [0.45, 0.55] },
              { do: 'pulse', actor: 'seen', at: [0.45, 0.75] },
            ];
            if (hit !== undefined) {
              found = [hit, i];
              acts.push(
                { do: 'cells', actor: 'arr', range: [hit, hit], tone: 'success', at: [0.6, 0.65] },
                { do: 'cells', actor: 'arr', range: [i, i], tone: 'success', at: [0.6, 0.65] },
                { do: 'tone', actor: 'need', tone: 'success', at: [0.6, 1] },
              );
              beats.push({
                title: `i=${i}: ${need} is in the map → [${found[0]}, ${i}]`,
                text: `${v} needs ${need}; the map already holds ${need} at index ${seen.get(need)}. Answer found without scanning the rest.`,
                tone: 'success',
                dur: 2200,
                lines: [3, 4, 5],
                actions: acts,
              });
            } else {
              seen.set(v, i);
              rows.push(`${v} → ${i}`);
              acts.push(
                { do: 'rows', actor: 'seen', value: rows.slice(), at: [0.75, 0.8] },
                { do: 'cells', actor: 'arr', range: [i, i], tone: 'context', at: [0.85, 0.9] },
              );
              beats.push({
                title: `i=${i}: ${need} not seen yet → store ${v}`,
                text: `Look up first: ${need} is missing, so ${v} cannot pair with anything before it. Only then store ${v} → ${i}, so a later value can find it.`,
                dur: 2000,
                lines: [3, 4, 6],
                actions: acts,
              });
            }
          }
        } else {
          for (let i = 0; i < n && !found; i += 1) {
            const need = target - required(values[i]);
            const acts: Action[] = [
              { do: 'pointer', actor: 'arr', pointer: 'i', index: i, at: [0, 0.15] },
              { do: 'set', actor: 'need', value: need, at: [0.1, 0.2] },
              { do: 'cells', actor: 'arr', range: [0, n - 1], tone: null, at: [0, 0.02] },
              { do: 'cells', actor: 'arr', range: [i, i], tone: 'mechanism', at: [0.1, 0.15] },
            ];
            const m = n - i - 1;
            let k = 0;
            for (let j = i + 1; j < n; j += 1, k += 1) {
              work += 1;
              const a0 = 0.2 + (k / Math.max(1, m)) * 0.65;
              acts.push(
                { do: 'pointer', actor: 'arr', pointer: 'j', index: j, at: [a0, a0 + 0.05] },
                {
                  do: 'cells',
                  actor: 'arr',
                  range: [j, j],
                  tone: values[j] === need ? 'success' : 'repeated',
                  at: [a0, a0 + 0.05],
                },
                { do: 'set', actor: 'reads', value: work, at: [a0, a0 + 0.05] },
              );
              if (values[j] === need) {
                found = [i, j];
                break;
              }
            }
            beats.push({
              title: found
                ? `i=${i}: partner ${need} found at j=${found[1]}`
                : `i=${i}: scan ${m} value${m === 1 ? '' : 's'} for ${need}, no match`,
              text: found
                ? `${required(values[i])} + ${need} = ${target}.`
                : `Every later value is read again for this i. Purple = read by an earlier scan too.`,
              tone: found ? 'success' : null,
              dur: 1200 + Math.max(1, m) * 280,
              lines: [2, 3, 4],
              actions: acts,
            });
          }
        }
        beats.push({
          title: found
            ? `Answer [${found.join(', ')}] after ${work} ${useMap ? 'lookups' : 'comparisons'}`
            : `No pair adds to ${target}`,
          text: found
            ? useMap
              ? 'One pass, one expected O(1) lookup per value: O(n) time, O(n) space for the map.'
              : 'Each value re-reads its whole suffix: n(n−1)/2 comparisons in the worst case, O(n²) time, O(1) space.'
            : `Every value was checked. Return null (or whatever the contract says) — don't invent a pair.`,
          tone: found ? 'success' : 'warning',
          dur: 1800,
          actions: [{ do: 'tone', actor: 'reads', tone: found ? 'success' : 'warning' }],
        });
        let edge = null;
        const dup = values.findIndex((v, i) => values.indexOf(v) !== i);
        if (n < 2)
          edge = {
            label: 'fewer than 2 values',
            why: 'No pair can exist. The loop must simply finish and return null.',
          };
        else if (
          values.some(
            (v, i) => v * 2 === target && values.indexOf(v) === i && values.lastIndexOf(v) === i,
          )
        )
          edge = {
            label: 'value is its own complement',
            why: `Checking the map before inserting stops ${target / 2} from pairing with itself. Insert-then-lookup would return the same index twice.`,
          };
        else if (dup !== -1 && required(values[dup]) * 2 === target)
          edge = {
            label: 'duplicate pair',
            why: 'Two equal values are a valid pair at different indices. Lookup-before-insert finds the first copy when the second arrives.',
          };
        else if (!found)
          edge = {
            label: 'no answer',
            why: 'The whole array is scanned. The contract must say what to return when nothing matches.',
          };
        else if (values.some((v) => v < 0))
          edge = {
            label: 'negative numbers',
            why: 'target − value still works with negatives; nothing about the map assumes positive values.',
          };
        return { actors, beats, edge };
      },
    };

    return required(handlers['two-sum']);
  })(),
  'sliding-window': (() => {
    const handlers: Record<string, Generator> = {
      'sliding-window': (raw) => {
        const p = inputSchemas['sliding-window'].parse(raw);
        const values = p.values;
        const k = p.k;
        const brute = p.method === 'brute';
        const n = values.length;
        const cell = Math.min(64, Math.floor(820 / Math.max(n, 1)));
        const x0 = 480 - (n * cell) / 2 + cell / 2;
        const actors: Actor[] = [
          {
            id: 'arr',
            kind: 'cells',
            x: x0,
            y: 165,
            cell,
            values,
            pointers: [
              { id: 'L', label: 'L', index: 0, tone: 'mechanism' },
              { id: 'R', label: 'R', index: -1, tone: 'success' },
            ],
          },
          { id: 'sum', kind: 'box', x: 260, y: 330, w: 170, h: 70, label: 'window sum', value: 0 },
          {
            id: 'best',
            kind: 'box',
            x: 480,
            y: 330,
            w: 170,
            h: 70,
            label: 'best so far',
            value: '—',
          },
          {
            id: 'ops',
            kind: 'box',
            x: 700,
            y: 330,
            w: 170,
            h: 70,
            label: 'additions done',
            value: 0,
          },
          {
            id: 'title',
            kind: 'text',
            x: 480,
            y: 48,
            text: brute
              ? 'Brute force: re-add all k values for every window'
              : 'Sliding window: one number enters, one leaves',
          },
        ];
        let edge = null;
        if (n === 0)
          edge = {
            label: 'empty array',
            why: 'No values at all: return early (0, or an error, as the contract says) before any index access.',
          };
        else if (k <= 0)
          edge = {
            label: 'k ≤ 0',
            why: 'A window of size 0 has no sum. Reject it up front; otherwise the first-window loop does nothing and "best" stays -Infinity.',
          };
        else if (k > n)
          edge = {
            label: 'k > n',
            why: `No window of size ${k} fits ${n} values. Guard it before the loop, or the first-window build reads past the array.`,
          };
        else if (k === n)
          edge = {
            label: 'k = n',
            why: 'Exactly one window: the slide loop runs zero times. The answer is the first-window sum; off-by-one bugs often skip it.',
          };
        else if (k === 1)
          edge = {
            label: 'k = 1',
            why: 'L and R point at the same cell: every value enters and leaves in the same step. The answer is just the maximum value.',
          };
        else if (values.some((v) => v < 0))
          edge = {
            label: 'negative numbers',
            why: 'Initialise best from the first window, not 0: with negatives the correct answer can be below zero.',
          };
        else if (values.every((v) => v === values[0]))
          edge = {
            label: 'all equal',
            why: 'Every window has the same sum: "best" never changes after the first window. Ties must not break the update rule.',
          };
        const beats: Beat[] = [];
        let ops = 0;
        let best = -Infinity;
        let sum = 0;
        beats.push({
          title: 'Start',
          text: `Array of ${n} numbers, window size k = ${k}. Goal: the largest sum of ${k} neighbours.`,
          dur: 1400,
          actions: [],
        });
        if (k > n || k < 1) {
          beats.push({
            title: n === 0 ? 'Empty array' : 'No window fits',
            text:
              n === 0
                ? 'There is nothing to add up. The function has to return before touching nums[0].'
                : k < 1
                  ? `k = ${k}: there is no window to slide.`
                  : `k = ${k} does not fit an array of length ${n}.`,
            tone: 'failure',
            dur: 1400,
            actions: [{ do: 'tone', actor: 'sum', tone: 'failure' }],
          });
          return { actors, beats, edge };
        }
        // first window: add k values one by one
        const first: Action[] = [];
        for (let i = 0; i < k; i += 1) {
          sum += required(values[i]);
          ops += 1;
          const s = i / k;
          const e = (i + 1) / k;
          first.push({
            do: 'pointer',
            actor: 'arr',
            pointer: 'R',
            index: i,
            at: [s, s + (e - s) * 0.5],
          });
          first.push({
            do: 'cells',
            actor: 'arr',
            range: [i, i],
            tone: 'mechanism',
            at: [s + (e - s) * 0.5, e],
          });
          first.push({ do: 'set', actor: 'sum', value: sum, at: [s + (e - s) * 0.5, e] });
          first.push({ do: 'set', actor: 'ops', value: ops, at: [s + (e - s) * 0.5, e] });
        }
        best = sum;
        first.push({ do: 'set', actor: 'best', value: best, at: [0.95, 1] });
        beats.push({
          title: 'Build the first window',
          text: `Add the first ${k} values: ${values.slice(0, k).join(' + ')} = ${sum}. That is ${k} additions.`,
          dur: 600 * k + 600,
          lines: [2, 3],
          actions: first,
        });
        for (let start = 1; start + k - 1 < n; start += 1) {
          const end = start + k - 1;
          const actions: Action[] = [];
          if (brute) {
            actions.push({
              do: 'cells',
              actor: 'arr',
              range: [0, n - 1],
              tone: null,
              at: [0, 0.05],
            });
            actions.push({
              do: 'pointer',
              actor: 'arr',
              pointer: 'L',
              index: start,
              at: [0, 0.15],
            });
            actions.push({ do: 'set', actor: 'sum', value: 0, at: [0.1, 0.18] });
            let s2 = 0;
            for (let i = start; i <= end; i += 1) {
              s2 += required(values[i]);
              ops += 1;
              const a = 0.2 + ((i - start) / k) * 0.7;
              const b = 0.2 + ((i - start + 1) / k) * 0.7;
              actions.push({
                do: 'pointer',
                actor: 'arr',
                pointer: 'R',
                index: i,
                at: [a, a + (b - a) * 0.5],
              });
              actions.push({
                do: 'cells',
                actor: 'arr',
                range: [i, i],
                tone: 'repeated',
                at: [a + (b - a) * 0.5, b],
              });
              actions.push({ do: 'set', actor: 'sum', value: s2, at: [a + (b - a) * 0.5, b] });
              actions.push({ do: 'set', actor: 'ops', value: ops, at: [a + (b - a) * 0.5, b] });
            }
            sum = s2;
            const better = sum > best;
            if (better) best = sum;
            actions.push({ do: 'set', actor: 'best', value: best, at: [0.92, 1] });
            actions.push({
              do: 'tone',
              actor: 'best',
              tone: better ? 'success' : null,
              at: [0.92, 1],
            });
            actions.push({ do: 'tone', actor: 'ops', tone: 'repeated', at: [0.2, 1] });
            beats.push({
              title: `Window ${start}..${end}: recompute`,
              text: `Throw the old sum away and add ${k} values again: ${values.slice(start, end + 1).join(' + ')} = ${sum}. ${k - 1} of them were already added last time (purple = repeated work).`,
              dur: 500 * k + 900,
              lines: [],
              actions,
            });
          } else {
            const out = required(values[start - 1]);
            const inn = required(values[end]);
            const afterAdd = sum + inn;
            ops += 1;
            const newSum = afterAdd - out;
            const better = newSum > best;
            if (better) best = newSum;
            actions.push({ do: 'pointer', actor: 'arr', pointer: 'R', index: end, at: [0, 0.3] });
            actions.push({
              do: 'cells',
              actor: 'arr',
              range: [end, end],
              tone: 'success',
              at: [0.25, 0.4],
            });
            actions.push({ do: 'set', actor: 'sum', value: afterAdd, at: [0.25, 0.45] });
            actions.push({ do: 'set', actor: 'ops', value: ops, at: [0.25, 0.45] });
            actions.push({
              do: 'cells',
              actor: 'arr',
              range: [start - 1, start - 1],
              tone: 'failure',
              at: [0.5, 0.55],
            });
            actions.push({
              do: 'pointer',
              actor: 'arr',
              pointer: 'L',
              index: start,
              at: [0.55, 0.8],
            });
            actions.push({ do: 'set', actor: 'sum', value: newSum, at: [0.6, 0.8] });
            actions.push({
              do: 'cells',
              actor: 'arr',
              range: [start - 1, start - 1],
              tone: null,
              at: [0.82, 0.86],
            });
            actions.push({
              do: 'cells',
              actor: 'arr',
              range: [start, end],
              tone: 'mechanism',
              at: [0.84, 0.88],
            });
            actions.push({ do: 'set', actor: 'best', value: best, at: [0.9, 1] });
            actions.push({
              do: 'tone',
              actor: 'best',
              tone: better ? 'success' : null,
              at: [0.9, 1],
            });
            const beat: Beat = {
              title: `Slide to ${start}..${end}`,
              text: `R brings in ${inn} (sum ${sum} → ${afterAdd}), L drops ${out} (→ ${newSum}). ${better ? 'New best!' : `Best stays ${best}.`}`,
              dur: 2200,
              lines: [5, 6, 7],
              actions,
            };
            if (start === 1)
              beat.predict = {
                q: `The window moves one step right. Which two numbers change the sum, and what is the new sum?`,
                a: `Only the entering ${inn} and the leaving ${out}: ${sum} + ${inn} − ${out} = ${newSum}. Everything in the middle is reused.`,
              };
            sum = newSum;
            beats.push(beat);
          }
        }
        if (p.method === 'offbyone' && k >= 1 && k <= n) {
          beats.push({
            title: `i = ${n} = nums.length: one slide too many`,
            text: `With \`i <= nums.length\` the loop runs once more. nums[${n}] is undefined, so sum becomes NaN, and Math.max(best, NaN) is NaN: the answer is destroyed.`,
            tone: 'failure',
            dur: 2600,
            lines: [13],
            actions: [
              { do: 'pointer', actor: 'arr', pointer: 'R', index: n, at: [0, 0.35] },
              { do: 'set', actor: 'sum', value: 'NaN', at: [0.4, 0.5] },
              { do: 'tone', actor: 'sum', tone: 'failure', at: [0.4, 1] },
              { do: 'set', actor: 'best', value: 'NaN', at: [0.7, 0.8] },
              { do: 'tone', actor: 'best', tone: 'failure', at: [0.7, 1] },
              {
                do: 'note',
                actor: 'sum',
                text: 'nums[' + n + '] is undefined',
                tone: 'failure',
                at: [0.3, 1],
              },
            ],
          });
          beats.push({
            title: 'Result: NaN instead of ' + best,
            text: 'The loop variable is the index ENTERING the window, so its last legal value is n − 1: `i < nums.length`. Derive the bound from what the index means.',
            tone: 'failure',
            dur: 2000,
            actions: [],
          });
          return {
            actors,
            beats,
            edge: edge || {
              label: 'off by one',
              why: 'The last entering index is n − 1. `<=` reads one past the end.',
            },
          };
        }
        beats.push({
          title: 'Result',
          text: `Largest sum of ${k} neighbours = ${best}. ${ops} additions for n = ${n}, k = ${k}. ${brute ? `Brute force costs about (n − k + 1) × k = O(n·k).` : 'Each value enters once (and leaves once): O(n) time, O(1) extra space.'}`,
          tone: 'success',
          dur: 1800,
          actions: [
            { do: 'tone', actor: 'best', tone: 'success' },
            { do: 'pulse', actor: 'best' },
            { do: 'tone', actor: 'ops', tone: brute ? 'repeated' : 'success' },
          ],
        });
        return { actors, beats, edge };
      },
    };

    return required(handlers['sliding-window']);
  })(),
  'binary-tree-balance': (() => {
    interface TreeNode {
      id: string;
      val: number;
      left: TreeNode | null;
      right: TreeNode | null;
      depth: number;
      parent: TreeNode | null;
      order: number;
      x: number;
      y: number;
    }
    function buildTree(values: (number | null)[]): {
      root: TreeNode | null;
      nodes: TreeNode[];
      skewed: boolean;
    } {
      const vals = values;
      if (!vals.length || vals[0] === null) return { root: null, nodes: [], skewed: false };
      const nodes: TreeNode[] = [];
      let id = 0;
      const mk = (val: number, depth: number, parent: TreeNode | null): TreeNode => {
        const n: TreeNode = {
          order: 0,
          x: 0,
          y: 0,
          id: `n${id++}`,
          val,
          left: null,
          right: null,
          depth,
          parent,
        };
        nodes.push(n);
        return n;
      };
      const root = mk(required(vals[0]), 0, null);
      const queue = [root];
      let i = 1;
      while (queue.length && i < vals.length) {
        const cur = required(queue.shift());
        if (i < vals.length) {
          if (vals[i] !== null) {
            cur.left = mk(required(vals[i]), cur.depth + 1, cur);
            queue.push(cur.left);
          }
          i += 1;
        }
        if (i < vals.length) {
          if (vals[i] !== null) {
            cur.right = mk(required(vals[i]), cur.depth + 1, cur);
            queue.push(cur.right);
          }
          i += 1;
        }
      }
      let order = 0;
      const ino = (n: TreeNode | null): void => {
        if (!n) return;
        ino(n.left);
        n.order = order++;
        ino(n.right);
      };
      ino(root);
      const maxDepth = Math.max(...nodes.map((n) => n.depth));
      const span = 560;
      const x0 = 60;
      nodes.forEach((n) => {
        n.x = nodes.length === 1 ? x0 + span / 2 : x0 + (n.order / (nodes.length - 1)) * span;
        n.y = 90 + n.depth * Math.min(90, 330 / Math.max(1, maxDepth));
      });
      const skewed =
        nodes.length >= 3 &&
        nodes.every((n) => !(n.left && n.right)) &&
        maxDepth === nodes.length - 1;
      return { root, nodes, skewed };
    }

    const handlers: Record<string, Generator> = {
      // Binary tree from level order (null = no node). Shared by tree lessons.
      'binary-tree-balance': (raw) => {
        const p = inputSchemas['binary-tree-balance'].parse(raw);
        const T = buildTree(p.values);
        const method = p.method === 'repeated' ? 'repeated' : 'postorder';
        const actors: Actor[] = [
          {
            id: 'title',
            kind: 'text',
            x: 470,
            y: 30,
            text:
              method === 'postorder'
                ? 'One postorder pass: each node returns its height, or −1 once it is unbalanced'
                : 'isBalanced(node) asks height() for both children, then recurses again',
          },
        ];
        const links: Link[] = [];
        const tokens: Token[] = [
          { id: 'up', label: '', tone: 'success' },
          { id: 'down', label: '', tone: 'mechanism' },
        ];
        for (const n of T.nodes) {
          actors.push({
            id: n.id,
            kind: 'circle',
            x: n.x,
            y: n.y,
            r: 24,
            label: String(n.val),
            value: null,
            sub: '',
            inspectLabel: `node ${n.val}`,
          });
          if (n.parent)
            links.push({ id: `e${n.parent.id}_${n.id}`, from: n.parent.id, to: n.id, bend: 0 });
        }
        actors.push({
          id: 'stack',
          kind: 'store',
          x: 805,
          y: 235,
          w: 250,
          h: 330,
          label: 'call stack',
          rows: [],
          inspectLabel: 'call stack',
          code: true,
        });
        actors.push({
          id: 'visits',
          kind: 'box',
          x: 805,
          y: 450,
          w: 250,
          h: 60,
          label: method === 'postorder' ? 'node visits' : 'height() node reads',
          value: 0,
          inspectLabel: 'visits',
        });
        const beats: Beat[] = [];
        const stack: string[] = [];
        let visits = 0;
        const perNode: Record<string, number> = {};
        const stackRows = (): string[] => stack.slice().reverse();
        const fnName = method === 'postorder' ? 'heightOrFail' : 'height';
        const push = (frame: string): Action => {
          stack.push(frame);
          return { do: 'rows', actor: 'stack', value: stackRows(), at: [0, 0.05] };
        };
        const pop = (): Action => {
          stack.pop();
          return { do: 'rows', actor: 'stack', value: stackRows(), at: [0.9, 0.95] };
        };
        const visit = (n: TreeNode, tone: Tone = 'mechanism'): Action[] => {
          visits += 1;
          perNode[n.id] = (perNode[n.id] ?? 0) + 1;
          return [
            { do: 'set', actor: 'visits', value: visits, at: [0.2, 0.5] },
            {
              do: 'text',
              actor: n.id,
              field: 'sub',
              value: required(perNode[n.id]) > 1 ? `visited ×${required(perNode[n.id])}` : '',
              at: [0.2, 0.3],
            },
            { do: 'tone', actor: n.id, tone: tone || 'mechanism', at: [0, 0.2] },
          ];
        };
        const up = (n: TreeNode, text: string, tone: Tone): Action[] =>
          n.parent
            ? [
                { do: 'label', token: 'up', text, tone },
                {
                  do: 'move',
                  token: 'up',
                  link: `e${n.parent.id}_${n.id}`,
                  reverse: true,
                  at: [0.45, 0.85],
                },
                { do: 'hide', token: 'up', at: [0.88, 0.9] },
              ]
            : [];
        if (!T.root) {
          beats.push({
            title: 'Empty tree',
            text: 'root is null. An empty tree is balanced: the base case returns true (height 0) without touching any node.',
            tone: 'success',
            dur: 2200,
            actions: [],
          });
          beats.push({
            title: 'Result: true',
            text: 'No node, no imbalance. Make sure the null check comes before any `.left` access.',
            tone: 'success',
            dur: 1600,
            actions: [],
          });
          return {
            actors,
            links,
            tokens,
            beats,
            edge: {
              label: 'empty tree',
              why: 'The null base case answers alone: true, with height 0. A missing null check crashes on `root.left`.',
            },
          };
        }
        if (method === 'postorder') {
          const h = (n: TreeNode | null): number => {
            if (!n) return 0;
            beats.push({
              title: `${fnName}(${n.val}) starts`,
              text: `Postorder: ${n.val} cannot answer until both children have answered. It goes left first.`,
              dur: 1300,
              lines: [1, 2, 3],
              actions: [
                push(`${fnName}(${n.val})`),
                ...visit(n),
                ...(n.parent
                  ? ([
                      { do: 'label', token: 'down', text: `${fnName}(${n.val})` },
                      { do: 'move', token: 'down', link: `e${n.parent.id}_${n.id}`, at: [0, 0.4] },
                      { do: 'hide', token: 'down', at: [0.42, 0.45] },
                    ] satisfies Action[])
                  : []),
              ],
            });
            const l = h(n.left);
            if (l === -1) {
              beats.push({
                title: `${n.val}: left said −1, stop`,
                text: `The left subtree is already unbalanced, so ${n.val} returns −1 at once and never visits its right side.`,
                tone: 'failure',
                dur: 1600,
                lines: [4],
                actions: [
                  { do: 'tone', actor: n.id, tone: 'failure' },
                  ...up(n, '−1', 'failure'),
                  pop(),
                ],
              });
              return -1;
            }
            const r = h(n.right);
            if (r === -1) {
              beats.push({
                title: `${n.val}: right said −1, stop`,
                text: `An unbalanced subtree below makes the whole tree unbalanced. ${n.val} passes −1 straight up.`,
                tone: 'failure',
                dur: 1600,
                lines: [5, 6],
                actions: [
                  { do: 'tone', actor: n.id, tone: 'failure' },
                  ...up(n, '−1', 'failure'),
                  pop(),
                ],
              });
              return -1;
            }
            if (Math.abs(l - r) > 1) {
              beats.push({
                title: `${n.val}: |${l} − ${r}| = ${Math.abs(l - r)} > 1 → −1`,
                text: `Heights ${l} and ${r} differ by more than one. ${n.val} reports failure with −1 instead of a height.`,
                tone: 'failure',
                dur: 2000,
                lines: [7],
                actions: [
                  { do: 'tone', actor: n.id, tone: 'failure' },
                  {
                    do: 'note',
                    actor: n.id,
                    text: `|${l} − ${r}| > 1`,
                    tone: 'failure',
                    at: [0.1, 1],
                  },
                  ...up(n, '−1', 'failure'),
                  pop(),
                ],
              });
              return -1;
            }
            const hh = 1 + Math.max(l, r);
            beats.push({
              title: `${n.val}: |${l} − ${r}| ≤ 1 → return ${hh}`,
              text: `Both children answered (${l}, ${r}). Balanced here, so ${n.val} returns its height 1 + max = ${hh}. One value carries both facts.`,
              tone: 'success',
              dur: 1800,
              lines: [8],
              actions: [
                { do: 'tone', actor: n.id, tone: 'success' },
                { do: 'text', actor: n.id, field: 'sub', value: `h=${hh}`, at: [0.3, 0.4] },
                ...up(n, `h=${hh}`, 'success'),
                pop(),
              ],
            });
            return hh;
          };
          const res = h(T.root);
          beats.push({
            title: res === -1 ? 'Result: false' : 'Result: true',
            text:
              res === -1
                ? `${visits} of ${T.nodes.length} nodes visited, none twice: the −1 stopped the walk as soon as an imbalance appeared. O(n) time, O(h) stack.`
                : `${visits} visits for ${T.nodes.length} nodes: every node exactly once. O(n) time, O(h) stack.`,
            tone: res === -1 ? 'failure' : 'success',
            dur: 1800,
            actions: [{ do: 'tone', actor: 'visits', tone: 'success' }],
          });
        } else {
          const heightScan = (n: TreeNode | null): { hh: number; scanned: TreeNode[] } => {
            const scanned: TreeNode[] = [];
            const walk = (m: TreeNode | null): number => {
              if (!m) return 0;
              scanned.push(m);
              return 1 + Math.max(walk(m.left), walk(m.right));
            };
            const hh = walk(n);
            return { hh, scanned };
          };
          const isBal = (n: TreeNode | null): boolean => {
            if (!n) return true;
            const acts: Action[] = [
              push(`isBalanced(${n.val})`),
              { do: 'tone', actor: n.id, tone: 'mechanism', at: [0, 0.1] },
            ];
            const L = heightScan(n.left);
            const R = heightScan(n.right);
            const all = L.scanned.concat(R.scanned);
            all.forEach((m, k) => {
              const a0 = 0.15 + (k / Math.max(1, all.length)) * 0.6;
              visits += 1;
              perNode[m.id] = (perNode[m.id] ?? 0) + 1;
              acts.push(
                { do: 'pulse', actor: m.id, at: [a0, a0 + 0.2] },
                {
                  do: 'tone',
                  actor: m.id,
                  tone: required(perNode[m.id]) > 1 ? 'repeated' : 'mechanism',
                  at: [a0, a0 + 0.05],
                },
                {
                  do: 'text',
                  actor: m.id,
                  field: 'sub',
                  value: required(perNode[m.id]) > 1 ? `visited ×${perNode[m.id]}` : '',
                  at: [a0, a0 + 0.05],
                },
                { do: 'set', actor: 'visits', value: visits, at: [a0, a0 + 0.05] },
              );
            });
            const ok = Math.abs(L.hh - R.hh) <= 1;
            beats.push({
              title: `isBalanced(${n.val}): height() scans ${all.length} node${all.length === 1 ? '' : 's'}`,
              text: `To compare, ${n.val} calls height(left) = ${L.hh} and height(right) = ${R.hh}. ${all.length ? `That re-walks ${all.map((m) => m.val).join(', ')}.` : 'Both children are empty.'} Purple = scanned before.`,
              tone: ok ? null : 'failure',
              dur: 1400 + all.length * 250,
              lines: [8, 9],
              actions: acts.concat([
                { do: 'tone', actor: n.id, tone: ok ? 'success' : 'failure', at: [0.85, 0.95] },
              ]),
            });
            if (!ok) {
              beats.push({
                title: `${n.val}: |${L.hh} − ${R.hh}| > 1 → false`,
                text: 'Unbalanced here, so the whole answer is false.',
                tone: 'failure',
                dur: 1500,
                lines: [10],
                actions: [pop()],
              });
              return false;
            }
            const res = isBal(n.left) && isBal(n.right);
            beats.push({
              title: `isBalanced(${n.val}) returns ${res}`,
              text: res
                ? `Balanced here and in both subtrees. The heights it just computed are thrown away.`
                : 'A subtree failed.',
              tone: res ? 'success' : 'failure',
              dur: 1200,
              lines: [11, 12],
              actions: [pop()],
            });
            return res;
          };
          const res = isBal(T.root);
          const n = T.nodes.length;
          beats.push({
            title: res ? 'Result: true' : 'Result: false',
            text: `${visits} node visits for ${n} nodes. Height scans repeat across ancestors. Balanced trees take O(n log n); an unbalanced root can stop this version after one scan.`,
            tone: visits > n ? 'warning' : 'success',
            dur: 1800,
            actions: [{ do: 'tone', actor: 'visits', tone: visits > n ? 'repeated' : 'success' }],
          });
        }
        let edge = null;
        if (T.nodes.length === 1)
          edge = {
            label: 'single node',
            why: 'Both children are null (height 0), so |0 − 0| = 0 and the answer is true after one visit.',
          };
        else if (T.skewed)
          edge = {
            label: 'skewed tree',
            why: 'A chain can fail at the root after one height scan. Do not assume every input takes the worst-case amount of work.',
          };
        return { actors, links, tokens, beats, edge };
      },
    };

    return required(handlers['binary-tree-balance']);
  })(),
  'lost-update': (() => {
    const handlers: Record<string, Generator> = {
      'lost-update': (raw) => {
        const p = inputSchemas['lost-update'].parse(raw);
        const schedules: Record<string, string[]> = {
          serial: ['A.read', 'A.add', 'A.write', 'B.read', 'B.add', 'B.write'],
          interleaved: ['A.read', 'B.read', 'A.add', 'B.add', 'A.write', 'B.write'],
          overlap: ['A.read', 'A.add', 'B.read', 'A.write', 'B.add', 'B.write'],
          locked: [
            'A.lock',
            'A.read',
            'B.wait',
            'A.add',
            'A.write',
            'A.unlock',
            'B.lock',
            'B.read',
            'B.add',
            'B.write',
            'B.unlock',
          ],
          atomic: ['A.atomic', 'B.atomic'],
        };
        const plan = required(schedules[p.schedule] ?? schedules.interleaved);
        const guarded = p.schedule === 'locked' || p.schedule === 'atomic';
        const start = Number.isFinite(p.start) ? p.start : 5;
        const actors: Actor[] = [
          {
            id: 'laneA',
            kind: 'lane',
            x: 40,
            y: 70,
            w: 250,
            h: 300,
            label: 'Request A (thread 1)',
          },
          {
            id: 'laneB',
            kind: 'lane',
            x: 670,
            y: 70,
            w: 250,
            h: 300,
            label: 'Request B (thread 2)',
          },
          {
            id: 'A',
            kind: 'box',
            x: 165,
            y: 200,
            w: 180,
            h: 84,
            label: 'A local copy',
            value: '—',
            inspectLabel: 'A local copy',
          },
          {
            id: 'B',
            kind: 'box',
            x: 795,
            y: 200,
            w: 180,
            h: 84,
            label: 'B local copy',
            value: '—',
            inspectLabel: 'B local copy',
          },
          {
            id: 'db',
            kind: 'box',
            x: 480,
            y: 200,
            w: 190,
            h: 96,
            label: 'stock in database',
            value: start,
            inspectLabel: 'stock (database)',
          },
          {
            id: 'sold',
            kind: 'box',
            x: 480,
            y: 335,
            w: 230,
            h: 76,
            label: 'confirmed sales',
            value: 0,
            inspectLabel: 'confirmed sales',
          },
          {
            id: 'lock',
            kind: 'box',
            x: 480,
            y: 80,
            w: 250,
            h: 40,
            label:
              p.schedule === 'locked'
                ? 'row lock: free'
                : p.schedule === 'atomic'
                  ? 'guard: WHERE stock > 0'
                  : 'no lock, no guard',
            value: null,
            small: 'prose',
            tone: guarded ? null : 'muted',
            inspect: false,
          },
          {
            id: 'title',
            kind: 'text',
            x: 480,
            y: 36,
            text: `Two requests each sell one item. Starting stock: ${start}`,
          },
        ];
        const links: Link[] = [
          { id: 'dbA', from: 'db', to: 'A', bend: -30 },
          { id: 'Adb', from: 'A', to: 'db', bend: -30 },
          { id: 'dbB', from: 'db', to: 'B', bend: 30 },
          { id: 'Bdb', from: 'B', to: 'db', bend: 30 },
        ];
        const tokens: Token[] = [
          { id: 'tA', label: '', tone: 'mechanism' },
          { id: 'tB', label: '', tone: 'mechanism' },
        ];
        let db = start;
        let sold = 0;
        const local: Record<'A' | 'B', number | null> = { A: null, B: null };
        const rejected = { A: false, B: false };
        const beats: Beat[] = [
          {
            lines: [1],
            title: 'Start',
            text: `Stock is ${start}. Two customers try to buy one item at the same moment. ${start >= 2 ? `Correct result: stock ${start - 2}, 2 sales.` : start === 1 ? 'Correct result: exactly 1 sale, stock 0, the other buyer is told "sold out".' : 'Correct result: 0 sales, both buyers told "sold out".'}`,
            dur: 1600,
            actions: [],
          },
        ];
        let predictUsed = false;
        const saleActs = (): Action[] => {
          sold += 1;
          return [
            { do: 'set', actor: 'sold', value: sold, at: [0.85, 0.9] },
            {
              do: 'tone',
              actor: 'sold',
              tone: sold > start ? 'failure' : 'success',
              at: [0.85, 1],
            },
          ];
        };
        for (const stepName of plan) {
          const [who, op = ''] = stepName.split('.');
          if (who !== 'A' && who !== 'B') throw new Error('Invalid schedule participant');
          const other = who === 'A' ? 'B' : 'A';
          const tk = `t${who}`;
          if (rejected[who] && op !== 'unlock') continue;
          const acts: Action[] = [];
          let title = '';
          let text = '';
          let tone: Tone = null;
          const dur = 1700;
          let predict = null;
          if (op === 'read') {
            local[who] = db;
            acts.push(
              { do: 'tone', actor: who, tone: 'mechanism' },
              { do: 'label', token: tk, text: `read ${db}` },
              { do: 'move', token: tk, link: `db${who}`, at: [0, 0.8] },
              { do: 'set', actor: who, value: db, at: [0.8, 0.9] },
              { do: 'hide', token: tk, at: [0.9, 1] },
            );
            title = `${who} reads stock`;
            text = `${who} copies the current value ${db} into its own memory. The database does not know ${who} plans to change it.`;
            if (guarded && db <= 0) {
              rejected[who] = true;
              acts.push(
                { do: 'tone', actor: who, tone: 'warning', at: [0.9, 1] },
                {
                  do: 'note',
                  actor: who,
                  text: 'sold out: no sale',
                  tone: 'warning',
                  at: [0.9, 1],
                },
              );
              title = `${who} reads ${db} → sold out`;
              text = `${who} holds the lock and sees ${db}. The guard refuses the sale instead of writing a negative stock.`;
              tone = 'warning';
            }
          } else if (op === 'add') {
            const before = required(local[who]);
            local[who] = before - 1;
            acts.push(
              { do: 'tone', actor: who, tone: 'mechanism' },
              { do: 'pulse', actor: who },
              { do: 'set', actor: who, value: local[who], at: [0.3, 0.7] },
            );
            title = `${who} subtracts 1 locally`;
            text = `${before} − 1 = ${local[who]}. ${who} computes this from its own copy, not from the database.`;
            if (!guarded && before <= 0) {
              text += ' Nothing checks that there was anything left to sell.';
              tone = 'warning';
            }
          } else if (op === 'write') {
            const lost = !guarded && local[who] === db;
            acts.push(
              { do: 'tone', actor: who, tone: 'mechanism' },
              { do: 'label', token: tk, text: `write ${local[who]}` },
              { do: 'move', token: tk, link: `${who}db`, at: [0, 0.75] },
              { do: 'set', actor: 'db', value: local[who], at: [0.75, 0.85] },
              { do: 'hide', token: tk, at: [0.85, 0.9] },
            );
            acts.push(...saleActs());
            if (lost) {
              acts.push(
                { do: 'tone', actor: 'db', tone: 'failure', at: [0.8, 1] },
                {
                  do: 'note',
                  actor: 'db',
                  text: `${other}'s sale was overwritten`,
                  tone: 'failure',
                  at: [0.8, 1],
                },
              );
              tone = 'failure';
              title = `${who} writes ${local[who]} — lost update`;
              text = `${who} overwrites the database with ${local[who]}, computed from an old read. ${other}'s subtraction disappears, but both customers got a confirmation.`;
            } else if (required(local[who]) < 0) {
              acts.push(
                { do: 'tone', actor: 'db', tone: 'failure', at: [0.8, 1] },
                { do: 'note', actor: 'db', text: 'negative stock', tone: 'failure', at: [0.8, 1] },
              );
              tone = 'failure';
              title = `${who} writes ${local[who]} — negative stock`;
              text = `${who} sold an item that did not exist. The race is not the only bug here: nothing checks stock > 0.`;
            } else {
              acts.push({ do: 'tone', actor: 'db', tone: 'success', at: [0.8, 1] });
              title = `${who} writes ${local[who]}`;
              text = `${who} stores ${local[who]} and confirms the sale.`;
            }
            if (
              !predictUsed &&
              (p.schedule === 'interleaved' || p.schedule === 'overlap') &&
              who === 'B'
            ) {
              predict = {
                q: `B is about to write its copy (${local[who]}) back. The database currently holds ${db}. What value ends up stored, and is that correct?`,
                a: `${local[who]}. B computed it from a read taken before A's write, so A's sale is silently lost.`,
              };
              predictUsed = true;
            }
            db = required(local[who]);
            acts.push({ do: 'tone', actor: who, tone: null, at: [0.95, 1] });
          } else if (op === 'lock') {
            acts.push(
              { do: 'tone', actor: 'lock', tone: 'warning' },
              { do: 'text', actor: 'lock', field: 'label', value: `row lock: held by ${who}` },
              { do: 'tone', actor: who, tone: 'mechanism' },
            );
            title = `${who} takes the row lock`;
            text = `SELECT … FOR UPDATE: nobody else can read-to-update this row until ${who} commits.`;
          } else if (op === 'wait') {
            acts.push(
              { do: 'tone', actor: who, tone: 'warning' },
              { do: 'note', actor: who, text: 'blocked: waiting for lock', tone: 'warning' },
            );
            title = `${who} tries to read — blocked`;
            text = `${who} wants the row too, but the lock makes it wait. Waiting costs latency, not correctness.`;
            tone = 'warning';
            if (!predictUsed) {
              predict = {
                q: 'B is blocked by the lock. When B finally reads, which value will it see?',
                a: `The value after A's write. B only reads after A commits and releases the lock.`,
              };
              predictUsed = true;
            }
          } else if (op === 'unlock') {
            acts.push(
              { do: 'tone', actor: 'lock', tone: null },
              { do: 'text', actor: 'lock', field: 'label', value: 'row lock: free' },
              { do: 'tone', actor: who, tone: rejected[who] ? 'warning' : 'success' },
            );
            title = `${who} commits and releases the lock`;
            text = 'The next request may now read the updated value.';
          } else if (op === 'atomic') {
            const before = db;
            acts.push(
              { do: 'tone', actor: who, tone: 'mechanism' },
              { do: 'label', token: tk, text: 'stock = stock - 1 WHERE stock > 0' },
              { do: 'move', token: tk, link: `${who}db`, at: [0, 0.6] },
            );
            if (before > 0) {
              db -= 1;
              acts.push(
                { do: 'set', actor: 'db', value: db, at: [0.6, 0.8] },
                { do: 'hide', token: tk, at: [0.8, 0.85] },
                { do: 'tone', actor: 'db', tone: 'success', at: [0.7, 1] },
                ...saleActs(),
              );
              title = `${who}: one atomic update, 1 row changed`;
              text = `The database does read + check + subtract as one step (${before} → ${db}). There is no copy that can go stale.`;
            } else {
              rejected[who] = true;
              acts.push(
                { do: 'hide', token: tk, at: [0.6, 0.65] },
                { do: 'tone', actor: who, tone: 'warning', at: [0.6, 1] },
                {
                  do: 'note',
                  actor: who,
                  text: '0 rows updated: sold out',
                  tone: 'warning',
                  at: [0.6, 1],
                },
              );
              title = `${who}: 0 rows updated → sold out`;
              text = `Stock is ${before}, so WHERE stock > 0 matches nothing. The API tells ${who} the item is sold out.`;
              tone = 'warning';
            }
            if (!predictUsed) {
              predict = {
                q: 'Both requests send the conditional atomic update. Can one overwrite the other, or sell below zero?',
                a: 'Neither. Each update reads the latest committed value inside the database, and the WHERE guard refuses to go below zero.',
              };
              predictUsed = true;
            }
          }
          const LINES: Record<string, number[]> = {
            read: [2],
            add: [3],
            write: [3],
            lock: [6],
            wait: [6],
            unlock: [7, 8],
            atomic: [11, 12, 13],
          };
          beats.push({
            title,
            text,
            tone,
            dur,
            actions: acts,
            predict: predict || undefined,
            lines: op === 'read' && guarded ? [6, 7] : op === 'write' && guarded ? [8] : LINES[op],
          });
        }
        const wantSold = Math.max(0, Math.min(2, start));
        const ok = sold === wantSold && db === start - wantSold && db >= 0;
        let title;
        let text;
        if (ok) {
          title = `Final stock ${db}, ${sold} sale${sold === 1 ? '' : 's'} — correct`;
          text =
            wantSold === 2
              ? 'Both sales are counted.'
              : wantSold === 1
                ? 'Exactly one buyer got the last item; the other was told it is sold out.'
                : 'Nothing to sell, and nothing was sold.';
        } else if (db < 0) {
          title = `Final stock ${db} — sold an item that did not exist`;
          text = `${sold} confirmed sales from a stock of ${start}. Without a stock > 0 guard, the decrement runs even when nothing is left.`;
        } else if (sold > start) {
          title = `Final stock ${db} — but ${sold} sales were confirmed`;
          text = `${sold} customers were promised an item, but only ${start} existed. This is the oversell bug.`;
        } else {
          title = `Final stock ${db} — should be ${start - wantSold}`;
          text =
            'Two items were sold but stock only went down by one. Nothing crashed and no error was logged: that is why lost updates are hard to find.';
        }
        beats.push({
          title,
          text,
          tone: ok ? 'success' : 'failure',
          dur: 1800,
          lines:
            p.schedule === 'atomic' ? [11, 12, 13] : p.schedule === 'locked' ? [6, 7, 8] : [2, 3],
          actions: [
            { do: 'tone', actor: 'db', tone: ok ? 'success' : 'failure' },
            { do: 'pulse', actor: 'db' },
          ],
        });
        let edge = null;
        if (start === 0)
          edge = {
            label: 'stock 0',
            why: 'Nothing to sell. Unguarded read-modify-write happily writes −1 and −2; the guarded fixes answer "sold out" twice.',
          };
        else if (start === 1)
          edge = {
            label: 'last item',
            why: 'Exactly one sale may succeed. Fixing the race is not enough; the update also needs a stock > 0 guard.',
          };
        else if (p.schedule === 'serial')
          edge = {
            label: 'lucky timing',
            why: 'The same unsafe code passes because the requests did not overlap. Tests that send requests one at a time never catch a lost update.',
          };
        return { actors, links, tokens, beats, edge };
      },
    };

    return required(handlers['lost-update']);
  })(),
  'event-loop': (() => {
    /* Event loop simulator: tokenizer, parser and rule engine ported from the concept-animations player
   (checked there against real Node output for every preset). */

    const handlers: Record<string, Generator> = {
      // JavaScript event loop: the learner's own program, run by the ported rule engine.
      'event-loop': (raw) => {
        const p = inputSchemas['event-loop'].parse(raw);
        const src = String(p.code || '')
          .replace(/\t/g, '  ')
          .replace(/\s+$/, '');
        const codeLines = src.split('\n');
        const code = {
          language: 'ts',
          title: 'Your program',
          lines: codeLines.length ? codeLines : [''],
        };
        const actors: Actor[] = [
          {
            id: 'waiting',
            kind: 'store',
            x: 175,
            y: 150,
            w: 310,
            h: 130,
            label: 'waiting .then reactions',
            rows: [],
            code: true,
          },
          {
            id: 'timers',
            kind: 'store',
            x: 785,
            y: 150,
            w: 310,
            h: 130,
            label: 'timers · t = 0 ms',
            rows: [],
            code: true,
          },
          {
            id: 'stack',
            kind: 'store',
            x: 480,
            y: 215,
            w: 220,
            h: 260,
            label: 'call stack',
            rows: [],
            code: true,
          },
          {
            id: 'micro',
            kind: 'store',
            x: 175,
            y: 312,
            w: 310,
            h: 130,
            label: 'microtask queue',
            rows: [],
            code: true,
          },
          {
            id: 'task',
            kind: 'store',
            x: 785,
            y: 312,
            w: 310,
            h: 130,
            label: 'task queue',
            rows: [],
            code: true,
          },
          {
            id: 'console',
            kind: 'box',
            x: 480,
            y: 455,
            w: 920,
            h: 80,
            label: 'console output',
            value: '',
            lang: 'http',
            valueSmall: true,
          },
        ];
        const links: Link[] = [
          { id: 's2t', from: 'stack', to: 'timers', bend: -24 },
          { id: 's2w', from: 'stack', to: 'waiting', bend: 24 },
          { id: 's2m', from: 'stack', to: 'micro', bend: -24 },
          { id: 'm2s', from: 'micro', to: 'stack', bend: -24 },
          { id: 'q2s', from: 'task', to: 'stack', bend: 24 },
          { id: 't2q', from: 'timers', to: 'task', bend: 0 },
          { id: 'w2m', from: 'waiting', to: 'micro', bend: 0 },
          { id: 's2c', from: 'stack', to: 'console', bend: 0 },
        ];
        const tokens: Token[] = [0, 1, 2, 3, 4, 5].map((k) => ({ id: `k${k}`, label: '' }));
        let program;
        let err = null;
        try {
          if (codeLines.length > 16)
            throw new Error('Keep the program to 16 lines so it fits on screen.');
          program = EL.parse(src);
        } catch (e) {
          err = errorMessage(e);
        }
        if (err !== null) {
          return {
            actors,
            links,
            tokens,
            code,
            edge: { label: 'cannot run', why: err },
            beats: [
              {
                title: 'This program cannot run here',
                text: err,
                tone: 'failure',
                dur: 2200,
                lines: [1],
                actions: [{ do: 'tone', actor: 'stack', tone: 'failure' }],
              },
              {
                title: 'What the simulator understands',
                text: 'console.log("x"), setTimeout(() => …, ms), queueMicrotask(() => …) and Promise.resolve().then(() => …) chains, nested with { }.',
                dur: 2200,
                lines: [1],
                actions: [],
              },
            ],
          };
        }
        const snaps: Snapshot[] = [];
        const copy = (arr: Task[]): Task[] => arr.map((task) => ({ ...task }));
        try {
          EL.simulate(required(program), (caption, opts, m) =>
            snaps.push({
              caption,
              opts,
              line: m.line,
              clock: m.clock,
              console: m.console.slice(),
              stack: copy(m.stack),
              webapis: copy(m.webapis),
              pending: copy(m.pending),
              micro: copy(m.micro),
              macro: copy(m.macro),
            }),
          );
        } catch (e) {
          return {
            actors,
            links,
            tokens,
            code,
            edge: { label: 'too long', why: errorMessage(e) },
            beats: [
              {
                title: 'Too long to animate',
                text: errorMessage(e),
                tone: 'failure',
                dur: 2000,
                lines: [1],
                actions: [],
              },
              {
                title: 'Shorten the program',
                text: 'Keep it to a handful of callbacks.',
                dur: 1600,
                lines: [1],
                actions: [],
              },
            ],
          };
        }
        const REG: Record<Region, string> = {
          stack: 'stack',
          webapis: 'timers',
          pending: 'waiting',
          micro: 'micro',
          macro: 'task',
        };
        const where = (snap: Model): Record<string, Region> => {
          const w: Record<string, Region> = {};
          for (const k of EL.regions) for (const t of snap[k]) w[t.id] = k;
          return w;
        };
        const LINK: Record<string, string> = {
          'stack>webapis': 's2t',
          'stack>pending': 's2w',
          'stack>micro': 's2m',
          'micro>stack': 'm2s',
          'macro>stack': 'q2s',
          'webapis>macro': 't2q',
          'pending>micro': 'w2m',
        };
        const short = (t: Task): string =>
          t.kind === 'script'
            ? 'script'
            : t.kind === 'timer'
              ? 'timer'
              : t.kind === 'then'
                ? '.then'
                : 'micro';
        const cut = (x: string, n: number): string => (x.length > n ? x.slice(0, n - 1) + '…' : x);
        const rowOf = (t: Task, key: Region): string =>
          cut(
            key === 'webapis'
              ? `${t.label} · ${t.sub} · at ${t.due}ms`
              : key === 'pending'
                ? `${t.label} · ${t.sub} · waits`
                : `${t.label} · ${t.sub}`,
            key === 'stack' ? 26 : 38,
          );
        const rowsFor = (snap: Model, key: Region): string[] => {
          const list = key === 'stack' ? snap.stack.slice().reverse() : snap[key];
          const cap = key === 'stack' ? 6 : 3;
          const rows = list.slice(0, list.length > cap ? cap - 1 : cap).map((t) => rowOf(t, key));
          if (list.length > cap) rows.push(`+${list.length - cap + 1} more`);
          return rows;
        };
        const beats: Beat[] = [];
        let prev: Model = {
          line: null,
          stack: [],
          webapis: [],
          pending: [],
          micro: [],
          macro: [],
          console: [],
          clock: 0,
        };
        let lastLines = [1];
        snaps.forEach((snap, n) => {
          const before = where(prev);
          const after = where(snap);
          const acts: Action[] = [];
          let k = 0;
          const all = new Map<string, Task>();
          for (const key of EL.regions) for (const t of snap[key]) all.set(t.id, t);
          const gained = new Set<Region>();
          const lost = new Set<Region>();
          for (const [id, to] of Object.entries(after)) {
            const from =
              before[id] ||
              (to === 'macro' && required(all.get(id)).kind === 'script' ? null : 'stack');
            if (from === to) continue;
            gained.add(to);
            if (from) lost.add(from);
            const link = from ? LINK[`${from}>${to}`] : undefined;
            if (link !== undefined && k < tokens.length) {
              const tk = `k${k++}`;
              acts.push(
                { do: 'label', token: tk, text: short(required(all.get(id))) },
                { do: 'move', token: tk, link, at: [0.05, 0.5] },
                { do: 'hide', token: tk, at: [0.52, 0.55] },
              );
            }
          }
          for (const [id, from] of Object.entries(before)) if (!after[id]) lost.add(from);
          for (const key of EL.regions) {
            if (!gained.has(key) && !lost.has(key)) continue;
            acts.push({
              do: 'rows',
              actor: REG[key],
              value: rowsFor(snap, key),
              at: gained.has(key) ? [0.5, 0.55] : [0.05, 0.1],
            });
          }
          if (snap.console.length > prev.console.length) {
            const text = required(snap.console[snap.console.length - 1]);
            if (k < tokens.length) {
              const tk = `k${k++}`;
              acts.push(
                { do: 'label', token: tk, text: `"${cut(text, 10)}"` },
                { do: 'move', token: tk, link: 's2c', at: [0.05, 0.5] },
                { do: 'hide', token: tk, at: [0.52, 0.55] },
              );
            }
            const out = snap.console.join('  ');
            acts.push(
              {
                do: 'set',
                actor: 'console',
                value: out.length > 80 ? '…' + out.slice(-79) : out,
                at: [0.5, 0.55],
              },
              { do: 'pulse', actor: 'console', at: [0.5, 0.9] },
            );
          }
          if (snap.clock !== prev.clock)
            acts.push({
              do: 'text',
              actor: 'timers',
              field: 'label',
              value: `timers · t = ${snap.clock} ms`,
              at: [0, 0.05],
            });
          acts.push({
            do: 'tone',
            actor: 'stack',
            tone: snap.stack.length ? 'mechanism' : null,
            at: [0.5, 0.55],
          });
          const lines =
            snap.opts.done === true
              ? codeLines.map((_, j) => j + 1)
              : snap.line !== null
                ? [snap.line]
                : lastLines;
          lastLines = lines;
          const beat: Beat = {
            title: (snap.opts.title ?? '') || `Step ${n + 1}`,
            text: snap.caption,
            dur: snap.opts.done === true ? 2400 : 1500,
            lines,
            actions: acts,
          };
          if (snap.opts.done === true) beat.tone = 'success';
          if (snap.opts.predict !== undefined) {
            const nextRun = snaps.slice(n + 1).find((x) => x.stack.length);
            beat.predict = {
              q: snap.opts.predict,
              a: `The microtask queue${nextRun ? ` (${required(nextRun.stack[nextRun.stack.length - 1]).label})` : ''}. With an empty stack, every microtask runs before the next timer callback.`,
            };
          }
          beats.push(beat);
          prev = snap;
        });
        return { actors, links, tokens, beats, code, edge: null };
      },
    };

    return required(handlers['event-loop']);
  })(),
  'memory-db': (() => {
    const handlers: Record<string, Generator> = {
      // Memory DB: set / get / delete, then keys sorted by value (with or without a key tie-break).
      'memory-db': (raw) => {
        const p = inputSchemas['memory-db'].parse(raw);
        const ops = p.ops.map(String);
        const tie = p.tie !== 'none';
        const actors: Actor[] = [
          {
            id: 'title',
            kind: 'text',
            x: 480,
            y: 30,
            text: 'class MemoryDB { private store = new Map<string, string>() }',
          },
          {
            id: 'call',
            kind: 'box',
            x: 175,
            y: 170,
            w: 300,
            h: 90,
            label: 'call',
            value: '—',
            code: true,
            valueSmall: true,
            inspectLabel: 'current call',
          },
          {
            id: 'store',
            kind: 'store',
            x: 500,
            y: 250,
            w: 240,
            h: 330,
            label: 'store: Map (key → value)',
            rows: [],
            code: true,
            inspectLabel: 'store',
          },
          {
            id: 'entries',
            kind: 'store',
            x: 800,
            y: 250,
            w: 240,
            h: 330,
            label: 'sorted entries',
            rows: [],
            code: true,
            inspectLabel: 'entries',
          },
          {
            id: 'result',
            kind: 'box',
            x: 175,
            y: 360,
            w: 300,
            h: 90,
            label: 'returns',
            value: '—',
            code: true,
            valueSmall: true,
            inspectLabel: 'return value',
          },
        ];
        const links: Link[] = [
          { id: 'c2s', from: 'call', to: 'store', bend: -20 },
          { id: 's2r', from: 'store', to: 'result', bend: -20 },
        ];
        const tokens: Token[] = [{ id: 'op', label: '' }];
        const store = new Map<string, string>();
        const beats: Beat[] = [];
        let edge = null;
        const rows = (): string[] => [...store.entries()].map(([k, v]) => `${k} → ${v}`);
        for (const operation of ops.slice(0, 9)) {
          const [cmd = '', key = '', val = ''] = operation.split(':');
          const acts: Action[] = [
            {
              do: 'set',
              actor: 'call',
              value: `${cmd}(${[key, val]
                .filter(Boolean)
                .map((x) => `"${x}"`)
                .join(', ')})`,
              at: [0, 0.1],
            },
            { do: 'label', token: 'op', text: cmd },
            { do: 'move', token: 'op', link: 'c2s', at: [0.1, 0.45] },
            { do: 'hide', token: 'op', at: [0.46, 0.5] },
          ];
          let title;
          let text;
          let tone: Tone = null;
          let ret = 'undefined';
          let lines: number[] = [];
          if (cmd === 'set') {
            const had = store.has(key);
            store.set(key, val);
            ret = 'void';
            title = `set("${key}", "${val}")${had ? ': overwrite' : ''}`;
            text = had
              ? `"${key}" already existed; Map.set replaces its value. Still one entry per key.`
              : `A new entry "${key}" → "${val}".`;
            if (had)
              edge = edge || {
                label: 'overwrite',
                why: 'set on an existing key replaces the value; no duplicate key appears.',
              };
            lines = [3];
          } else if (cmd === 'get') {
            const has = store.has(key);
            ret = has ? `"${store.get(key)}"` : 'undefined';
            title = `get("${key}") → ${ret}`;
            text = has
              ? 'Keyed lookup: O(1), no scan.'
              : `"${key}" is not in the Map. The contract says: return undefined, don't throw.`;
            tone = has ? 'success' : 'warning';
            if (!has)
              edge = edge || {
                label: 'missing key',
                why: 'get on an absent key returns undefined; tests should assert that path too.',
              };
            lines = [2];
          } else if (cmd === 'delete') {
            const had = store.delete(key);
            ret = String(had);
            title = `delete("${key}")${had ? '' : ': nothing to delete'}`;
            text = had
              ? `The entry is gone: later reads and sorts won't see it.`
              : `"${key}" was never there. Delete of a missing key is a no-op, not an error.`;
            tone = had ? null : 'warning';
            if (!had)
              edge = edge || {
                label: 'delete missing',
                why: 'Deleting an absent key must not throw: it is a no-op.',
              };
            lines = [4];
          } else if (cmd === 'sort') {
            const entries = [...store.entries()];
            const ties = entries.some(([, v], k) => entries.some(([, w], j) => j !== k && v === w));
            entries.sort(([ka, va], [kb, vb]) =>
              va === vb ? (tie ? ka.localeCompare(kb) : 0) : va.localeCompare(vb),
            );
            ret = `[${entries.map(([k]) => `"${k}"`).join(', ')}]`;
            acts.push({
              do: 'rows',
              actor: 'entries',
              value: entries.map(([k, v]) => `[${k}, ${v}]`),
              at: [0.5, 0.7],
            });
            title = `keysByValue() → ${entries.length} key${entries.length === 1 ? '' : 's'}`;
            text = !entries.length
              ? 'An empty Map sorts to []: no special case needed.'
              : ties
                ? tie
                  ? 'Equal values: the tie-break compares keys, so the order is fully defined.'
                  : 'Equal values: the comparator returns 0, so the order of those keys is whatever insertion order was. The spec asked for key order.'
                : 'Copy the entries, sort by value, project to keys. Deleted keys never appear because they left the Map.';
            tone = ties && !tie ? 'failure' : 'success';
            if (ties)
              edge = edge || {
                label: 'equal values',
                why: tie
                  ? 'The tie-break branch returns keyA.localeCompare(keyB), so ties are ordered by key.'
                  : 'Without a tie-break, equal values keep insertion order, which the spec does not promise.',
              };
            if (!entries.length)
              edge = edge || {
                label: 'empty store',
                why: '[] in, [] out: the method needs no special case.',
              };
            lines = tie ? [7, 8, 9, 10, 11, 12, 13] : [7, 8, 9, 13];
          } else {
            title = `unknown call "${cmd}"`;
            text = 'Use set:key:value, get:key, delete:key or sort.';
          }
          acts.push(
            { do: 'rows', actor: 'store', value: rows(), at: [0.5, 0.55] },
            { do: 'set', actor: 'result', value: ret, at: [0.6, 0.7] },
            { do: 'tone', actor: 'result', tone: tone || 'success', at: [0.6, 1] },
          );
          beats.push({ title, text, tone, dur: 1900, lines, actions: acts });
        }
        if (beats.length < 2)
          beats.push({
            title: 'Done',
            text: 'Add more calls to see the store change.',
            dur: 1200,
            actions: [],
          });
        return { actors, links, tokens, beats, edge };
      },
    };

    return required(handlers['memory-db']);
  })(),
  sequence: (() => {
    const handlers: Record<string, Generator> = {
      // Sequence diagram: lifelines, messages that travel and stay drawn, saved records, and "your decision" stops.
      sequence: (raw) => {
        const p = inputSchemas['sequence'].parse(raw);
        const flow = p.flow;
        const parts = flow.participants;
        const n = parts.length;
        const W = (flow.width ?? 0) || 960;
        const colW = W / n;
        const cx: Record<string, number> = {};
        parts.forEach((q, i) => {
          cx[q.id] = Math.round(colW * i + colW / 2);
        });
        const rowH = (flow.rowH ?? 0) || 56;
        const top = 96;
        const rowsUsed: number[] = [];
        let r = -1;
        for (const m of flow.messages) {
          if (m.with !== true && !(m.decision ?? '')) r += 1;
          else if ((m.decision ?? '') && !(m.from ?? '')) r += 1;
          rowsUsed.push(r);
        }
        const H =
          (flow.height ?? 0) || top + (Math.max(0, r) + 1) * rowH + ((flow.saved ?? '') ? 150 : 40);
        const laneH = (flow.saved ?? '') ? H - 140 : H - 30;
        const actors: Actor[] = parts.map((q) => ({
          id: `lane_${q.id}`,
          kind: 'lane',
          x: required(cx[q.id]) - colW / 2 + 12,
          y: 16,
          w: colW - 24,
          h: laneH,
          label: q.label,
        }));
        const links: Link[] = [];
        const tokens: Token[] = [];
        const beats: Beat[] = [];
        const saved: string[] = [];
        const savedCap = 2;
        if (flow.saved ?? '')
          actors.push({
            id: 'saved',
            kind: 'store',
            x: W / 2,
            y: H - 70,
            w: W - 60,
            h: 110,
            label: flow.saved,
            rows: [],
            code: true,
            lang: 'http',
          });
        if (flow.payloadPanel === true)
          actors.push({
            id: 'wire',
            kind: 'store',
            x: 1000,
            y: 330,
            w: 520,
            h: 480,
            label: 'Active message: headers and body',
            rows: [],
            code: true,
            lang: 'http',
          });
        let beat: Beat | null = null;
        flow.messages.forEach((m, k) => {
          const y = top + required(rowsUsed[k]) * rowH + ((m.offset ?? 0) || 0); // offset: overlapping messages on the same pair of lifelines
          if (m.with !== true || !beat) {
            beat = {
              title: m.title,
              text: m.text,
              dur: (m.dur ?? 0) || 2200,
              lines: m.lines || [1],
              actions: [],
            };
            if (m.tone) beat.tone = m.tone;
            if (m.predict) beat.predict = m.predict;
            beats.push(beat);
          }
          if (flow.payloadPanel === true)
            beat.actions.push({ do: 'rows', actor: 'wire', value: m.wire || [], at: [0, 0] });
          if (m.decision ?? '') {
            const at = (m.at ?? '') || required(parts[Math.floor(n / 2)]).id;
            const dw = Math.min(colW * 2.4, 700, W - 40);
            const dx = Math.max(dw / 2 + 20, Math.min(W - dw / 2 - 20, required(cx[at])));
            actors.push({
              id: `dec${k}`,
              kind: 'box',
              x: dx,
              y,
              w: dw,
              h: 44,
              label: m.decision,
              small: 'prose',
              tone: 'warning',
              inspectLabel: 'your decision',
            });
            beat.actions.push({ do: 'pulse', actor: `dec${k}`, at: [0.2, 0.8] });
            if (m.save !== undefined) {
              if (m.replaceSaved === true) saved.length = 0;
              saved.push(m.save);
              beat.actions.push({
                do: 'rows',
                actor: 'saved',
                value: saved.slice(-savedCap),
                at: [0.65, 0.7],
              });
            }
            return;
          }
          const a = `d${k}a`;
          const b = `d${k}b`;
          const fromX = required(cx[required(m.from)]);
          const toX = required(cx[required(m.to)]);
          const dir = toX > fromX ? 1 : -1; // endpoints sit just off the lifeline on the arrow's side, so arrows meeting one lifeline never overlap
          actors.push(
            {
              id: a,
              kind: 'circle',
              x: fromX + dir * 8,
              y,
              r: 5,
              label: '',
              inspect: false,
              anchor: true,
            },
            {
              id: b,
              kind: 'circle',
              x: toX - dir * 8,
              y,
              r: 5,
              label: '',
              inspect: false,
              anchor: true,
            },
          );
          const lx = (fromX + toX) / 2;
          actors.push({
            id: `t${k}`,
            kind: 'text',
            x: lx,
            y: y - 12,
            text: '',
            code: true,
            lang: 'http',
          });
          links.push({ id: `m${k}`, from: a, to: b, bend: 0, tone: 'hidden' });
          tokens.push({ id: `k${k}`, label: m.label });
          const tone =
            m.lost === true
              ? 'failure'
              : m.tone === 'failure'
                ? 'failure'
                : m.tone === 'warning'
                  ? 'warning'
                  : m.reply === true
                    ? 'success'
                    : 'mechanism';
          if (m.lost === true)
            beat.actions.push(
              { do: 'drop', token: `k${k}`, link: `m${k}`, stopAt: 0.55, at: [0.05, 0.7] },
              { do: 'tone', link: `m${k}`, tone: 'failure', at: [0.05, 0.1] },
              {
                do: 'text',
                actor: `t${k}`,
                field: 'text',
                value: `${m.label}  ✕ lost`,
                at: [0.86, 0.9],
              },
              { do: 'hide', token: `k${k}`, at: [0.8, 0.85] },
            );
          else
            beat.actions.push(
              { do: 'move', token: `k${k}`, link: `m${k}`, at: [0.05, 0.6] },
              { do: 'hide', token: `k${k}`, at: [0.62, 0.65] },
              { do: 'tone', link: `m${k}`, tone, at: [0.05, 0.1] },
              { do: 'text', actor: `t${k}`, field: 'text', value: m.label, at: [0.6, 0.65] },
            );
          if (m.note !== undefined)
            beat.actions.push({
              do: 'note',
              actor: b,
              text: m.note,
              tone: m.noteTone || 'mechanism',
              at: [0.62, 1],
            });
          if (m.save !== undefined) {
            if (m.replaceSaved === true) saved.length = 0;
            saved.push(m.save);
            beat.actions.push({
              do: 'rows',
              actor: 'saved',
              value: saved.slice(-savedCap),
              at: [0.65, 0.7],
            });
          }
        });
        return { actors, links, tokens, beats, edge: flow.edge || null };
      },
    };

    return required(handlers['sequence']);
  })(),
};
