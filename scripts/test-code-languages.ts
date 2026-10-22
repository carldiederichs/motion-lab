import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { printLine } from './output.ts';
import { required } from '../engine/assert.ts';
import { specSchema } from '../engine/model.ts';

type Case = { slug: string; variant?: number; python: string; java: string; cpp: string };
const cases: Case[] = [
  ...[0, 1].map((variant) => ({
    slug: 'two-sum',
    variant,
    python:
      'assert two_sum([3,3],6)==[0,1]\nassert two_sum([1],2) is None\nassert two_sum([2,7,11],9)==[0,1]',
    java: 'assert Arrays.equals(twoSum(new int[]{3,3},6),new int[]{0,1}); assert twoSum(new int[]{1},2)==null;',
    cpp: 'assert((twoSum({3,3},6)==std::vector<int>{0,1})); assert(twoSum({1},2).empty());',
  })),
  ...[undefined, 1].map((variant): Case => {
    const name = variant === undefined ? 'max' : 'best';
    return {
      slug: 'sliding-window',
      ...(variant === undefined ? {} : { variant }),
      python: `assert ${name}_window([-4,-2,-7],2)==-6\nassert ${name}_window([1,2],0) is None\nassert ${name}_window([1,2],2)==3`,
      java: `assert ${name}Window(new int[]{-4,-2,-7},2)==-6; assert ${name}Window(new int[]{1,2},0)==null;`,
      cpp: `assert(${name}Window({-4,-2,-7},2)==-6); assert(!${name}Window({1,2},0));`,
    };
  }),
  {
    slug: 'binary-search',
    python:
      'assert binary_search([],2)==-1\nassert binary_search([1,3,8],8)==2\nassert binary_search([1,3,8],4)==-1',
    java: 'assert binarySearch(new int[]{},2)==-1; assert binarySearch(new int[]{1,3,8},8)==2; assert binarySearch(new int[]{1,3,8},4)==-1;',
    cpp: 'assert(binarySearch({},2)==-1); assert(binarySearch({1,3,8},8)==2); assert(binarySearch({1,3,8},4)==-1);',
  },
  {
    slug: 'coin-change',
    python:
      'assert coin_change([2],3)==-1\nassert coin_change([1,3,4],6)==2\nassert coin_change([2],0)==0',
    java: 'assert coinChange(new int[]{2},3)==-1; assert coinChange(new int[]{1,3,4},6)==2; assert coinChange(new int[]{2},0)==0;',
    cpp: 'assert(coinChange({2},3)==-1); assert(coinChange({1,3,4},6)==2); assert(coinChange({2},0)==0);',
  },
  {
    slug: 'reverse-linked-list',
    python:
      'assert reverse(None) is None\na,b=Node(),Node()\na.next=b\nassert reverse(a) is b\nassert b.next is a and a.next is None',
    java: 'assert reverse(null)==null; Node a=new Node(), b=new Node(); a.next=b; assert reverse(a)==b; assert b.next==a && a.next==null;',
    cpp: 'assert(reverse(nullptr)==nullptr); Node a,b; a.next=&b; assert(reverse(&a)==&b); assert(b.next==&a && a.next==nullptr);',
  },
  {
    slug: 'graph-bfs',
    python: 'assert bfs([[1],[0,2],[],[]],0)=={0:0,1:1,2:2}\nassert bfs([[]],0)=={0:0}',
    java: 'var d=bfs(List.of(List.of(1),List.of(0,2),List.of(),List.of()),0); assert d.equals(Map.of(0,0,1,1,2,2));',
    cpp: 'auto d=bfs({{1},{0,2},{},{}},0); assert(d.size()==3 && d.at(2)==2 && d.count(3)==0);',
  },
  ...[0, 1].map((variant) => ({
    slug: 'balanced-tree',
    variant,
    python:
      variant === 0
        ? 'assert height_or_fail(None)==0\na=Node(); a.left=Node(); a.left.left=Node()\nassert height_or_fail(a)==-1'
        : 'assert is_balanced(None)\na=Node(); a.left=Node(); a.left.left=Node()\nassert not is_balanced(a)',
    java: 'assert isBalanced(null); Node a=new Node(); a.left=new Node(); a.left.left=new Node(); assert !isBalanced(a);',
    cpp: 'assert(isBalanced(nullptr)); Node a,b,c; a.left=&b; b.left=&c; assert(!isBalanced(&a));',
  })),
];
const scratch = await mkdtemp(path.join(tmpdir(), 'motion-code-'));
const run = (command: string, args: string[]): void => {
  execFileSync(command, args, { cwd: scratch, stdio: 'pipe', timeout: 30000 });
};
try {
  for (const [index, sample] of cases.entries()) {
    const spec = specSchema.parse(
      JSON.parse(
        await readFile(new URL(`../examples/${sample.slug}.json`, import.meta.url), 'utf8'),
      ),
    );
    const source = required(
      sample.variant === undefined ? spec.code : spec.variants?.[sample.variant]?.code,
    );
    for (const language of ['python', 'java', 'cpp'] as const) {
      const code = required(source.alternatives?.find((view) => view.language === language));
      assert.equal(code.lines.length, code.sourceLines.length);
      const text = code.lines.join('\n');
      if (language === 'python') {
        await writeFile(
          path.join(scratch, 'sample.py'),
          `class Node:\n    def __init__(self):\n        self.next = self.left = self.right = None\nroot = None\n${text}\n${sample.python}\n`,
        );
        run('python3', ['sample.py']);
      } else if (language === 'java') {
        const className = `Sample${index}`;
        await writeFile(
          path.join(scratch, `${className}.java`),
          `import java.util.*;\nclass ${className} {\nstatic class Node { Node next, left, right; }\n${text}\npublic static void main(String[] args) { ${sample.java} }\n}`,
        );
        run(process.env.MOTION_JAVAC ?? 'javac', ['-Xlint:all', '-Werror', `${className}.java`]);
        run(process.env.MOTION_JAVA ?? 'java', ['-ea', '-cp', scratch, className]);
      } else {
        await writeFile(
          path.join(scratch, 'sample.cpp'),
          `#include <algorithm>\n#include <cassert>\n#include <climits>\n#include <cmath>\n#include <optional>\n#include <unordered_map>\n#include <vector>\nstruct Node { Node* next=nullptr; Node* left=nullptr; Node* right=nullptr; };\n${text}\nint main() { ${sample.cpp} }\n`,
        );
        run(process.env.CXX ?? 'c++', [
          '-std=c++17',
          '-Wall',
          '-Wextra',
          '-Werror',
          'sample.cpp',
          '-o',
          'sample',
        ]);
        run(path.join(scratch, 'sample'), []);
      }
    }
  }
  printLine(
    `Executed ${cases.length * 3} published Python, Java and C++ implementations against boundary and counterexample cases.`,
  );
} finally {
  await rm(scratch, { recursive: true, force: true });
}
