import { execFileSync } from 'node:child_process';
import { readFile, readdir, lstat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { releaseFiles } from './archive.ts';
import { printLine } from './output.ts';
import { ROOT } from './renderer.ts';
import { hasCode } from '../engine/assert.ts';
import { catalogueSchema } from '../engine/model.ts';
// Generic release rules: no examples of the owner's private data are needed.
export const prohibited: [RegExp, string][] = [
  [/\/(?:Users|home)\/[A-Za-z0-9_.-]+\//, 'absolute home path'],
  [/\b(?:sk-(?:proj-)?|ghp_|github_pat_)[A-Za-z0-9_-]{20,}/, 'credential-shaped value'],
  [/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/, 'private key'],
  [/\b(?:memories_v2|rollout_summaries|shared-context)\b/, 'private workspace reference'],
  [/https?:\/\/(?:www\.)?(?:notion\.so|app\.notion\.com)\//, 'private workspace link'],
  [/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i, 'email address'],
];
export function scan(text: string, name = 'file'): string[] {
  return prohibited.filter(([pattern]) => pattern.test(text)).map(([, kind]) => `${name}: ${kind}`);
}
export async function audit(root = ROOT): Promise<{ files: number; issues: string[] }> {
  const issues = [],
    files = await releaseFiles(root);
  for (const rel of files) {
    if (/(^|\/)(?:\.env(?:\.|$)|local|artifacts|\.git|node_modules)(\/|$)/.test(rel))
      issues.push(`${rel}: excluded file`);
    const data = await readFile(path.join(root, rel), 'utf8');
    if (rel !== 'scripts/privacy.ts') issues.push(...scan(data, rel));
  }
  // Public deployment contains only known assets, lessons and the deliberate toolkit ZIP.
  const expected = new Set([
    'index.html',
    'app.js',
    'style.css',
    'icon.svg',
    'github.svg',
    '404.html',
    'catalogue.json',
    'LICENSE.txt',
    'THIRD-PARTY-NOTICES.txt',
    'downloads/motion-lab-toolkit.zip',
  ]);
  const catalogue = catalogueSchema.parse(
    JSON.parse(await readFile(path.join(root, 'examples/catalogue.json'), 'utf8')),
  );
  for (const item of catalogue) expected.add(`lessons/${item.slug}.html`);
  async function walk(dir: string, prefix = ''): Promise<void> {
    for (const name of await readdir(dir)) {
      const rel = prefix + name,
        info = await lstat(path.join(dir, name));
      if (info.isSymbolicLink()) issues.push(`dist/${rel}: symlink`);
      else if (info.isDirectory()) await walk(path.join(dir, name), rel + '/');
      else {
        if (!expected.has(rel)) issues.push(`dist/${rel}: unexpected output`);
        if (!rel.endsWith('.zip'))
          issues.push(...scan(await readFile(path.join(dir, name), 'utf8'), 'dist/' + rel));
      }
    }
  }
  try {
    await walk(path.join(root, 'dist'));
  } catch (e) {
    if (!hasCode(e, 'ENOENT')) throw e;
    issues.push('dist: run npm run build before the release audit');
  }
  if (root === ROOT) {
    try {
      const tracked = execFileSync('git', ['ls-files', '-z'], {
        cwd: root,
        encoding: 'utf8',
      })
        .split('\0')
        .filter(Boolean);
      for (const rel of tracked) {
        if (!files.includes(rel) && !rel.startsWith('.github/'))
          issues.push(`${rel}: tracked outside the release allowlist`);
      }
    } catch {
      /* A downloaded toolkit intentionally has no Git history. */
    }
  }
  return { files: files.length, issues };
}
if (
  process.argv[1] !== undefined &&
  path.resolve(process.argv[1] ?? '') === fileURLToPath(import.meta.url)
) {
  const report = await audit();
  printLine(JSON.stringify(report, null, 2));
  if (report.issues.length) process.exitCode = 1;
}
