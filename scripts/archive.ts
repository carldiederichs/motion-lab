import { readFile, readdir, lstat } from 'node:fs/promises';
import path from 'node:path';

import { ROOT } from './renderer.ts';
import { required, hasCode } from '../engine/assert.ts';
// Deliberate allowlist. Never package working directories or Git history.
export const releaseRoots = [
  'engine',
  'site',
  'examples',
  'templates',
  'scripts',
  'tests',
  'docs',
  '.agents',
  'AGENTS.md',
  'README.md',
  'LICENSE',
  'package.json',
  'package-lock.json',
  'vercel.json',
  'railway.json',
  'Dockerfile',
  '.dockerignore',
  '.gitignore',
  'playwright.config.mjs',
  'tsconfig.json',
  'eslint.config.mjs',
  '.prettierrc.json',
  '.prettierignore',
];
export async function releaseFiles(root = ROOT): Promise<string[]> {
  const files: string[] = [];
  async function visit(rel: string): Promise<void> {
    const info = await lstat(path.join(root, rel));
    if (info.isSymbolicLink()) throw Error(`Release cannot contain symlinks: ${rel}`);
    if (info.isDirectory())
      for (const entry of (await readdir(path.join(root, rel))).sort())
        await visit(`${rel}/${entry}`);
    else if (info.isFile()) files.push(rel);
    else throw Error(`Unsupported release entry: ${rel}`);
  }
  for (const item of releaseRoots) {
    try {
      await visit(item);
    } catch (e) {
      if (!hasCode(e, 'ENOENT')) throw e;
    }
  }
  return files;
}
const crcTable = Array.from({ length: 256 }, (_, i) => {
  for (let n = 0; n < 8; n++) i = i & 1 ? 0xedb88320 ^ (i >>> 1) : i >>> 1;
  return i >>> 0;
});
function crc32(b: Uint8Array): number {
  let c = 0xffffffff;
  for (const byte of b) c = required(crcTable[(c ^ byte) & 255]) ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
export async function toolkitZip(): Promise<Buffer<ArrayBuffer>> {
  const records = [],
    central = [];
  let offset = 0;
  for (const rel of await releaseFiles()) {
    const name = Buffer.from(`motion-lab/${rel}`),
      data = await readFile(path.join(ROOT, rel)),
      crc = crc32(data);
    const h = Buffer.alloc(30);
    h.writeUInt32LE(0x04034b50);
    h.writeUInt16LE(20, 4);
    h.writeUInt16LE(0x800, 6);
    h.writeUInt16LE(0x21, 12);
    h.writeUInt32LE(crc, 14);
    h.writeUInt32LE(data.length, 18);
    h.writeUInt32LE(data.length, 22);
    h.writeUInt16LE(name.length, 26);
    const c = Buffer.alloc(46);
    c.writeUInt32LE(0x02014b50);
    c.writeUInt16LE(20, 4);
    c.writeUInt16LE(20, 6);
    c.writeUInt16LE(0x800, 8);
    c.writeUInt16LE(0x21, 14);
    c.writeUInt32LE(crc, 16);
    c.writeUInt32LE(data.length, 20);
    c.writeUInt32LE(data.length, 24);
    c.writeUInt16LE(name.length, 28);
    c.writeUInt32LE(offset, 42);
    records.push(h, name, data);
    central.push(c, name);
    offset += h.length + name.length + data.length;
  }
  const directory = Buffer.concat(central),
    end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50);
  end.writeUInt16LE(central.length / 2, 8);
  end.writeUInt16LE(central.length / 2, 10);
  end.writeUInt32LE(directory.length, 12);
  end.writeUInt32LE(offset, 16);
  return Buffer.concat([...records, directory, end]);
}
