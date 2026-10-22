import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import { z } from 'zod';

import { required } from '../engine/assert.ts';
import { extraGenerators } from '../engine/extended-generators.ts';
import { coreGenerators } from '../engine/generators.ts';
import { specSchema } from '../engine/model.ts';
import type { Actor, Params, Scene, Spec } from '../engine/model.ts';

export const qaReportSchema = z.object({
  status: z.string(),
  issues: z.array(z.string()),
  frames: z.number().optional(),
});
export async function fixture(url: URL | string): Promise<Spec> {
  return specSchema.parse(JSON.parse(await readFile(url, 'utf8')));
}
export function firstScene(spec: Spec): Scene {
  return required(spec.variants?.[0]?.scene ?? spec.scene);
}
export function actor(scene: Scene, id: string): Actor {
  return required(scene.actors.find((item) => item.id === id));
}
export function cells(scene: Scene, id: string): number[] {
  const item = actor(scene, id);
  assert(item.kind === 'cells');
  return z.array(z.number()).parse(item.values);
}
export function finalValue(scene: Scene, id: string): unknown {
  return scene.beats
    .flatMap((beat) => beat.actions)
    .filter((action) => action.do === 'set')
    .filter((action) => action.actor === id)
    .at(-1)?.value;
}
export function rowValues(scene: Scene, beat: number): (string | number | boolean | null)[] {
  const action = required(
    required(scene.beats[beat])
      .actions.filter((item) => item.do === 'rows')
      .at(-1),
  );
  assert(action.do === 'rows');
  return action.value;
}
export function generate(name: string, params: Params): Scene {
  return required({ ...coreGenerators, ...extraGenerators }[name])(params);
}
