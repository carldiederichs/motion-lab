import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { compileBrowser } from './browser.ts';
import { ROOT } from './paths.ts';
import { extraGenerators } from '../engine/extended-generators.ts';
import { coreGenerators } from '../engine/generators.ts';
import { sceneSchema, specSchema, slugPattern } from '../engine/model.ts';
import type { Scene, Spec } from '../engine/model.ts';

export { slugPattern };
export { ROOT };

function need(ok: boolean, message: string): asserts ok {
  if (!ok) throw new Error(message);
}
function inspect(value: unknown, depth = 0): void {
  need(depth < 40, 'Spec nesting exceeds 40 levels');
  if (typeof value === 'number') need(Number.isFinite(value), 'Numbers must be finite');
  if (typeof value === 'string') need(value.length <= 12000, 'Text field exceeds 12000 characters');
  if (value !== null && typeof value === 'object') {
    need(!Array.isArray(value) || value.length <= 500, 'Array exceeds 500 items');
    for (const [key, item] of Object.entries(value)) {
      need(!['__proto__', 'constructor', 'prototype'].includes(key), `Forbidden key: ${key}`);
      inspect(item, depth + 1);
    }
  }
}
function unique(items: readonly { id: string }[], label: string): Set<string> {
  const ids = new Set<string>();
  for (const item of items) {
    need(!ids.has(item.id), `Invalid/duplicate ${label} id`);
    ids.add(item.id);
  }
  return ids;
}
export function validateScene(raw: unknown, label = 'Scene'): Scene {
  inspect(raw);
  const scene = sceneSchema.parse(raw);
  const ids = unique(scene.actors, 'actor');
  const links = unique(scene.links ?? [], 'link');
  const tokens = unique(scene.tokens ?? [], 'token');
  const actors = new Map(scene.actors.map((actor) => [actor.id, actor]));
  for (const actor of scene.actors) {
    if (actor.kind === 'cells') unique(actor.pointers ?? [], `${actor.id} pointer`);
  }
  for (const link of scene.links ?? [])
    need(ids.has(link.from) && ids.has(link.to), `${label}: missing link endpoint`);
  for (const token of scene.tokens ?? []) {
    if (token.at !== undefined) need(ids.has(token.at), `${label}: missing token position`);
  }
  for (const beat of scene.beats)
    for (const action of beat.actions) {
      if ('actor' in action && action.actor !== undefined)
        need(ids.has(action.actor), `${label}: missing actor ${action.actor}`);
      if ('link' in action && action.link !== undefined)
        need(links.has(action.link), `${label}: missing link ${action.link}`);
      if ('token' in action && action.token !== undefined)
        need(tokens.has(action.token), `${label}: missing token ${action.token}`);
      if (action.do === 'show') need(ids.has(action.place), `${label}: missing token destination`);
      if (action.do === 'tone')
        need(
          [action.actor, action.link, action.token].filter((id) => id !== undefined).length === 1,
          `${label}: tone needs one target`,
        );
      if (['pointer', 'cells', 'cellValue'].includes(action.do) && 'actor' in action) {
        const actor = actors.get(action.actor ?? '');
        need(actor?.kind === 'cells', `${label}: cell action needs cells`);
        if (action.do === 'pointer')
          need(
            actor.pointers?.some((pointer) => pointer.id === action.pointer) === true,
            `${label}: missing pointer`,
          );
        if (action.do === 'cellValue')
          need(
            action.index >= 0 && action.index < actor.values.length,
            `${label}: invalid cell index`,
          );
      }
      if (action.do === 'row' || action.do === 'rows')
        need(actors.get(action.actor)?.kind === 'store', `${label}: row action needs a store`);
      if (action.do === 'row')
        need(
          action.value !== undefined || action.remove !== undefined,
          `${label}: row needs a value or removal`,
        );
    }
  return scene;
}
export function validate(raw: unknown): Spec {
  inspect(raw);
  const spec = specSchema.parse(raw);
  const variants = spec.variants ?? [];
  if (spec.simulation !== undefined) {
    need(
      Object.hasOwn(coreGenerators, spec.simulation.generator) ||
        Object.hasOwn(extraGenerators, spec.simulation.generator),
      'Unknown generator; compose a scene or register a tested generator',
    );
    for (const param of spec.simulation.params)
      if (param.type === 'select')
        need(param.options !== undefined && param.options.length > 0, 'Select needs options');
  } else if (variants.length > 0) {
    for (const variant of variants) validateScene(variant.scene, variant.label);
  } else validateScene(spec.scene);
  for (const edge of spec.edgeCases)
    need(
      edge.params !== undefined || (edge.variant !== undefined && edge.variant < variants.length),
      'Edge case must select inputs or a scenario',
    );
  return spec;
}
let playerCode: Promise<string> | undefined;
let themeCode: Promise<string> | undefined;
export async function render(raw: unknown): Promise<string> {
  const spec = validate(raw);
  playerCode ??= compileBrowser('engine/player.ts');
  themeCode ??= compileBrowser('engine/theme-init.ts');
  const [template, css, player, theme] = await Promise.all([
    readFile(path.join(ROOT, 'engine/player.html'), 'utf8'),
    readFile(path.join(ROOT, 'engine/diagram-design.css'), 'utf8'),
    playerCode,
    themeCode,
  ]);
  const payload = JSON.stringify(spec)
    .replaceAll('<', '\\u003c')
    .replaceAll('>', '\\u003e')
    .replaceAll('&', '\\u0026');
  const title = spec.title
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
  return template
    .replace('/*__DIAGRAM_DESIGN__*/', () => css)
    .replace('/*__PLAYER__*/', () => player)
    .replace('/*__THEME__*/', () => theme)
    .replace('__MOTION_TITLE__', () => title)
    .replace('__MOTION_SPEC__', () => payload)
    .replace('href="/motion-lab-icon.svg"', 'href="/icon.svg"');
}
