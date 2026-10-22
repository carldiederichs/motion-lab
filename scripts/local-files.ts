import { randomUUID } from 'node:crypto';
import { lstat, mkdir, realpath, rename, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { ROOT } from './paths.ts';
import { hasCode } from '../engine/assert.ts';

/** Write only inside the real local workspace, without following output symlinks. */
export async function writeLocal(
  name: string,
  contents: string,
  overwrite: boolean,
  root = ROOT,
): Promise<void> {
  if (!/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*\.(?:json|html)$/.test(name))
    throw new Error('Invalid local output filename');
  const directory = path.join(root, 'local');
  await mkdir(directory, { recursive: true });
  const info = await lstat(directory);
  if (info.isSymbolicLink() || !info.isDirectory())
    throw new Error('The local workspace must be a real directory');
  if ((await realpath(directory)) !== path.join(await realpath(root), 'local'))
    throw new Error('The local workspace cannot point outside this project');

  const destination = path.join(directory, name);
  const existing = await lstat(destination).catch((error: unknown) => {
    if (hasCode(error, 'ENOENT')) return undefined;
    throw error;
  });
  if (existing !== undefined && (existing.isSymbolicLink() || !existing.isFile()))
    throw new Error('Local output cannot be a symlink or special file');
  if (!overwrite) {
    await writeFile(destination, contents, { flag: 'wx' });
    return;
  }

  // Renaming a complete file also keeps a failed build from leaving partial HTML.
  const temporary = path.join(directory, `.motion-${randomUUID()}.tmp`);
  try {
    await writeFile(temporary, contents, { flag: 'wx' });
    await rename(temporary, destination);
  } finally {
    await rm(temporary, { force: true });
  }
}
