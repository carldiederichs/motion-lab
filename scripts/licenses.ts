import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { ROOT } from './paths.ts';

export const noticeFiles = [
  ['Motion Lab', 'LICENSE'],
  ['Diagram Design adaptation', 'docs/THIRD-PARTY-LICENSE.txt'],
  ['Primer Octicons: GitHub mark', 'docs/OCTICONS-LICENSE.txt'],
  ['Zod: bundled validation library', 'docs/ZOD-LICENSE.txt'],
] as const;

export async function licenseNotices(): Promise<string> {
  const notices = await Promise.all(
    noticeFiles.map(
      async ([name, file]) => `${name}\n\n${await readFile(path.join(ROOT, file), 'utf8')}`,
    ),
  );
  return notices.join('\n\n========================================\n\n');
}

export async function licenseBanner(): Promise<string> {
  return `/*!\n${(await licenseNotices()).replaceAll('*/', '* /')}\n*/`;
}

/** New bundled dependencies need a license review before they can be distributed. */
export function assertLicensedDependencies(inputs: readonly string[]): void {
  for (const input of inputs) {
    const dependencies = input.replaceAll('\\', '/').split('node_modules/').slice(1);
    if (dependencies.some((dependency) => !dependency.startsWith('zod/')))
      throw Error(`Review the license and add distribution notices before bundling ${input}`);
  }
}
