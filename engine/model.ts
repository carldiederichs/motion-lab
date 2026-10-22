import { z } from 'zod';

export const slugPattern = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/;
const id = z.string().regex(/^[A-Za-z][A-Za-z0-9_-]{0,79}$/);
const finite = z.number().finite();
const text = z.string().max(12000);
export const valueSchema = z.union([text, finite, z.boolean(), z.null()]);
export type Value = z.infer<typeof valueSchema>;
export const toneSchema = z
  .enum(['mechanism', 'success', 'failure', 'warning', 'repeated', 'context', 'muted', 'hidden'])
  .nullable();
export type Tone = z.infer<typeof toneSchema>;
const timing = z
  .tuple([finite, finite])
  .refine(([a, b]) => 0 <= a && a <= b && b <= 1, 'Invalid action timing');
export const pointerSchema = z.strictObject({
  id,
  label: text,
  index: z.int(),
  tone: toneSchema.optional(),
  side: z.enum(['above', 'below']).optional(),
  below: z.boolean().optional(),
  level: z.int().nonnegative().optional(),
});
export type Pointer = z.infer<typeof pointerSchema>;
const actorBase = {
  id,
  x: finite,
  y: finite,
  label: text.optional(),
  sub: text.optional(),
  value: valueSchema.optional(),
  tone: toneSchema.optional(),
  inspectLabel: text.optional(),
  code: z.boolean().optional(),
  lang: text.optional(),
  labelCode: z.boolean().optional(),
  small: z.union([z.boolean(), z.literal('prose')]).optional(),
  inspect: z.boolean().optional(),
  valueSmall: z.boolean().optional(),
  anchor: z.union([z.boolean(), z.enum(['start', 'middle', 'end'])]).optional(),
};
export const actorSchema = z.discriminatedUnion('kind', [
  z.strictObject({
    ...actorBase,
    kind: z.literal('box'),
    w: finite.positive(),
    h: finite.positive(),
  }),
  z.strictObject({
    ...actorBase,
    kind: z.literal('store'),
    w: finite.positive(),
    h: finite.positive(),
    rows: z.array(valueSchema).max(500).optional(),
  }),
  z.strictObject({
    ...actorBase,
    kind: z.literal('lane'),
    w: finite.positive(),
    h: finite.positive(),
  }),
  z.strictObject({ ...actorBase, kind: z.literal('circle'), r: finite.positive() }),
  z.strictObject({ ...actorBase, kind: z.literal('ring'), r: finite.positive() }),
  z.strictObject({ ...actorBase, kind: z.literal('text'), text: text.optional() }),
  z.strictObject({
    ...actorBase,
    kind: z.literal('cells'),
    cell: finite.positive(),
    values: z.array(valueSchema).max(20),
    pointers: z.array(pointerSchema).max(20).optional(),
  }),
]);
export type Actor = z.infer<typeof actorSchema>;
const actionBase = { at: timing.optional() };
export const actionSchema = z.discriminatedUnion('do', [
  z.strictObject({
    ...actionBase,
    do: z.enum(['move', 'drop']),
    token: id,
    link: id,
    reverse: z.boolean().optional(),
    stopAt: finite.optional(),
    from: finite.optional(),
    to: finite.optional(),
  }),
  z.strictObject({ ...actionBase, do: z.literal('show'), token: id, place: id }),
  z.strictObject({ ...actionBase, do: z.literal('hide'), token: id }),
  z.strictObject({
    ...actionBase,
    do: z.literal('label'),
    token: id,
    text,
    tone: toneSchema.optional(),
  }),
  z.strictObject({
    ...actionBase,
    do: z.literal('tone'),
    actor: id.optional(),
    token: id.optional(),
    link: id.optional(),
    tone: toneSchema,
  }),
  z.strictObject({ ...actionBase, do: z.literal('set'), actor: id, value: valueSchema }),
  z.strictObject({
    ...actionBase,
    do: z.literal('text'),
    actor: id,
    field: z.enum(['label', 'sub', 'text']).optional(),
    value: text,
  }),
  z.strictObject({
    ...actionBase,
    do: z.literal('row'),
    actor: id,
    value: valueSchema.optional(),
    remove: valueSchema.optional(),
  }),
  z.strictObject({
    ...actionBase,
    do: z.literal('rows'),
    actor: id,
    value: z.array(valueSchema).max(500),
  }),
  z.strictObject({
    ...actionBase,
    do: z.literal('cells'),
    actor: id,
    range: z.tuple([z.int(), z.int()]),
    tone: toneSchema,
  }),
  z.strictObject({
    ...actionBase,
    do: z.literal('cellValue'),
    actor: id,
    index: z.int(),
    value: valueSchema,
  }),
  z.strictObject({
    ...actionBase,
    do: z.literal('pointer'),
    actor: id,
    pointer: id,
    index: z.int(),
  }),
  z.strictObject({
    ...actionBase,
    do: z.literal('note'),
    actor: id,
    text,
    tone: toneSchema.optional(),
    until: finite.optional(),
  }),
  z.strictObject({ ...actionBase, do: z.literal('pulse'), actor: id }),
]);
export type Action = z.infer<typeof actionSchema>;
export const beatSchema = z.strictObject({
  title: z.string().min(1).max(80),
  text: z.string().max(420),
  dur: finite.min(400).max(8000),
  actions: z.array(actionSchema).max(500),
  lines: z.array(z.int()).optional(),
  tone: toneSchema.optional(),
  focus: z.array(id).optional(),
  predict: z.strictObject({ q: text, a: text }).optional(),
});
export type Beat = z.infer<typeof beatSchema>;
export const linkSchema = z.strictObject({
  id,
  from: id,
  to: id,
  label: text.optional(),
  bend: finite.optional(),
  tone: toneSchema.optional(),
});
export type Link = z.infer<typeof linkSchema>;
export const tokenSchema = z.strictObject({
  id,
  label: text.optional(),
  at: id.optional(),
  tone: toneSchema.optional(),
  lang: text.optional(),
});
export type Token = z.infer<typeof tokenSchema>;
export const codeLanguageSchema = z.enum(['ts', 'js', 'python', 'java', 'cpp']);
const codeLines = z.array(z.string().max(58)).min(1).max(100);
const codeAlternativeSchema = z
  .strictObject({
    language: codeLanguageSchema,
    title: text.optional(),
    lines: codeLines,
    sourceLines: z.array(z.array(z.int().positive()).max(10)).max(100),
  })
  .refine(
    (code) => code.sourceLines.length === code.lines.length,
    'Each translated line needs its source-line mapping',
  );
export type CodeAlternative = z.infer<typeof codeAlternativeSchema>;
const codeSchema = z
  .strictObject({
    language: text.optional(),
    title: text.optional(),
    lines: codeLines,
    alternatives: z.array(codeAlternativeSchema).max(4).optional(),
  })
  .superRefine((code, ctx) => {
    const languages = new Set([code.language]);
    for (const alternative of code.alternatives ?? []) {
      if (languages.has(alternative.language))
        ctx.addIssue({ code: 'custom', message: 'Duplicate code language' });
      languages.add(alternative.language);
      if (alternative.sourceLines.flat().some((line) => line > code.lines.length))
        ctx.addIssue({ code: 'custom', message: 'Translated line references missing source line' });
    }
  });
export type Code = z.infer<typeof codeSchema>;
const complexitySchema = z.strictObject({
  time: z.string().min(1),
  space: z.string().min(1),
  example: text.optional(),
  derivation: z.array(text).optional(),
  lowerBound: text.optional(),
});
const edgeSchema = z.strictObject({ label: text, why: text });
export const sceneSchema = z.strictObject({
  actors: z.array(actorSchema).min(1).max(100),
  links: z.array(linkSchema).max(100).optional(),
  tokens: z.array(tokenSchema).max(100).optional(),
  beats: z.array(beatSchema).min(2).max(80),
  edge: edgeSchema.nullable().optional(),
  code: codeSchema.optional(),
  lang: text.optional(),
});
export type Scene = z.infer<typeof sceneSchema>;
export const paramValueSchema = z.union([valueSchema, z.array(valueSchema).max(500)]);
export const paramsSchema = z.record(z.string(), z.unknown());
export type Params = z.infer<typeof paramsSchema>;
export const paramSchema = z.strictObject({
  id: z.string().regex(slugPattern),
  label: text,
  type: z.enum(['numbers', 'tree', 'list', 'int', 'range', 'select', 'code']),
  default: paramValueSchema,
  max: finite.optional(),
  min: finite.optional(),
  rows: z.int().positive().optional(),
  step: finite.positive().optional(),
  allowEmpty: z.boolean().optional(),
  pattern: z
    .string()
    .regex(/^\^\[01\]\{1,[1-9]\}\$/)
    .optional(),
  formatHint: text.optional(),
  positiveInteger: z.boolean().optional(),
  options: z
    .array(z.strictObject({ label: text, value: text }))
    .min(1)
    .optional(),
});
export type Param = z.infer<typeof paramSchema>;
export const variantSchema = z.strictObject({
  label: text,
  scene: sceneSchema.optional(),
  params: paramsSchema.optional(),
  code: codeSchema.optional(),
  complexity: complexitySchema.optional(),
  hidden: z.boolean().optional(),
});
export type Variant = z.infer<typeof variantSchema>;
export const specSchema = z.strictObject({
  kind: z.literal('motion'),
  version: z.literal(3),
  slug: z.string().regex(slugPattern).max(80),
  title: z.string().min(1).max(160),
  subtitle: text.optional(),
  component: text,
  date: text.optional(),
  aliases: z.array(text),
  family: text.optional(),
  stage: z.strictObject({ width: finite.min(600).max(1600), height: finite.min(250).max(1000) }),
  scene: sceneSchema.optional(),
  variants: z.array(variantSchema).max(16).optional(),
  simulation: z
    .strictObject({
      generator: text,
      params: z.array(paramSchema),
      sceneCode: z.boolean().optional(),
      hint: text.optional(),
      qaParams: z.array(paramsSchema).optional(),
    })
    .optional(),
  edgeCases: z
    .array(
      edgeSchema.extend({
        params: paramsSchema.optional(),
        variant: z.int().nonnegative().optional(),
      }),
    )
    .min(2),
  code: codeSchema.optional(),
  complexity: complexitySchema.optional(),
  camera: z.boolean().optional(),
  defaultPanel: z.enum(['none', 'code', 'complexity', 'reference']).optional(),
  reference: z
    .strictObject({
      title: text.optional(),
      sections: z.array(z.strictObject({ title: text, items: z.array(text) })),
    })
    .optional(),
});
export type Spec = z.infer<typeof specSchema>;
export type EdgeCase = Spec['edgeCases'][number];
export type Generator = (params: Params) => Scene;
export const catalogueSchema = z.array(
  z.strictObject({
    slug: z.string().regex(slugPattern),
    title: text,
    description: text,
    category: text,
    family: text,
    tags: z.array(text).optional(),
  }),
);
export type CatalogueItem = z.infer<typeof catalogueSchema>[number];
