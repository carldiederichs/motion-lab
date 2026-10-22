import { readFile, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { printLine } from './output.ts';
import { ROOT, render, slugPattern, validate } from './renderer.ts';
import { hasCode, errorMessage, required } from '../engine/assert.ts';
const [command, input, flag, template] = process.argv.slice(2);
try {
  if (command === 'new') {
    if (
      !slugPattern.test((input ?? '') || '') ||
      flag !== '--template' ||
      !slugPattern.test((template ?? '') || '')
    )
      throw Error('Usage: node scripts/cli.ts new my-explanation --template request-sequence');
    let templateText;
    try {
      templateText = await readFile(path.join(ROOT, 'examples', `${template}.json`), 'utf8');
    } catch (e) {
      if (!hasCode(e, 'ENOENT')) throw e;
      templateText = await readFile(path.join(ROOT, 'templates', `${template}.json`), 'utf8');
    }
    const spec = validate(JSON.parse(templateText));
    spec.slug = required(input);
    spec.title = 'My explanation';
    spec.date = new Date().toISOString().slice(0, 10);
    await mkdir(path.join(ROOT, 'local'), { recursive: true });
    await writeFile(
      path.join(ROOT, 'local', `${input}.json`),
      JSON.stringify(spec, null, 2) + '\n',
      { flag: 'wx' },
    );
    printLine(
      `Created local/${input}.json. Edit the scene, then run: node scripts/cli.ts build local/${input}.json`,
    );
  } else if (command === 'build' || command === 'validate') {
    if (input === undefined || input.length === 0) throw Error('Provide a JSON spec path');
    const raw = await readFile(input, 'utf8');
    if (Buffer.byteLength(raw) > 250000) throw Error('Spec exceeds 250 KB');
    const spec = validate(JSON.parse(raw));
    if (command === 'validate') printLine(`Valid: ${spec.slug}`);
    else {
      const html = await render(spec);
      await mkdir(path.join(ROOT, 'local'), { recursive: true });
      await writeFile(path.join(ROOT, 'local', `${spec.slug}.html`), html);
      printLine(
        `Built local/${spec.slug}.html. Open it directly, or npm run dev and visit /local/${spec.slug}.html. Run node scripts/verify.ts local/${spec.slug}.html before sharing.`,
      );
    }
  } else
    throw Error(
      'Commands: new <name> --template <example> | validate <spec.json> | build <spec.json>',
    );
} catch (e) {
  console.error(errorMessage(e));
  process.exitCode = 1;
}
