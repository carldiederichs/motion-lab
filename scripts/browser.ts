import path from 'node:path';

import { build } from 'esbuild';

import { assertLicensedDependencies, licenseBanner } from './licenses.ts';
import { ROOT } from './paths.ts';
import { required } from '../engine/assert.ts';

/** Compile trusted browser source for embedding in a standalone HTML document. */
export async function compileBrowser(entry: string): Promise<string> {
  const result = await build({
    entryPoints: [path.join(ROOT, entry)],
    bundle: true,
    write: false,
    format: 'iife',
    platform: 'browser',
    target: 'es2023',
    legalComments: 'inline',
    metafile: true,
    banner: { js: await licenseBanner() },
  });
  assertLicensedDependencies(Object.keys(result.metafile.inputs));
  return required(result.outputFiles[0], 'Missing browser bundle').text.replaceAll(
    '</script',
    '<\\/script',
  );
}
