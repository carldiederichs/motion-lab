import { z } from 'zod';

import { toneSchema } from './model.ts';

const numbers = z.array(z.number().finite()).max(20);
const strings = z.array(z.string()).max(20);
const message = z.object({
  title: z.string(),
  text: z.string(),
  label: z.string().default(''),
  from: z.string().optional(),
  to: z.string().optional(),
  dur: z.number().optional(),
  lines: z.array(z.number()).optional(),
  tone: toneSchema.optional(),
  predict: z.object({ q: z.string(), a: z.string() }).optional(),
  with: z.boolean().optional(),
  decision: z.string().optional(),
  at: z.string().optional(),
  offset: z.number().optional(),
  wire: strings.optional(),
  save: z.string().optional(),
  replaceSaved: z.boolean().optional(),
  lost: z.boolean().optional(),
  reply: z.boolean().optional(),
  note: z.string().optional(),
  noteTone: toneSchema.optional(),
});
export const inputSchemas = {
  'two-sum': z.object({
    values: numbers.max(8).default([]),
    target: z.number().finite(),
    method: z.enum(['map', 'rescan']).optional(),
  }),
  'sliding-window': z.object({
    values: numbers.max(8),
    k: z.number().int(),
    method: z.enum(['sliding', 'brute', 'offbyone']).optional(),
  }),
  'binary-tree-balance': z.object({
    values: z.array(z.number().finite().nullable()).max(9).default([]),
    method: z.enum(['postorder', 'repeated']).optional(),
  }),
  'lost-update': z.object({
    schedule: z
      .enum(['serial', 'interleaved', 'overlap', 'locked', 'atomic'])
      .default('interleaved'),
    start: z.number().default(5),
  }),
  'event-loop': z.object({
    code: z
      .string()
      .max(4000)
      .refine(
        (code) =>
          code.split('\n').length <= 16 && code.split('\n').every((line) => line.length <= 58),
        'Wrap code at 58 columns and use at most 16 lines',
      )
      .default(''),
  }),
  'memory-db': z.object({
    ops: strings.max(9).default([]),
    tie: z.enum(['key', 'none']).optional(),
  }),
  sequence: z.object({
    flow: z.object({
      participants: z.array(z.object({ id: z.string(), label: z.string() })).min(1),
      messages: z.array(message),
      width: z.number().optional(),
      height: z.number().optional(),
      rowH: z.number().optional(),
      saved: z.string().optional(),
      payloadPanel: z.boolean().optional(),
      edge: z.object({ label: z.string(), why: z.string() }).optional(),
    }),
  }),
  'consistent-hash': z.object({ keys: numbers.max(6).default([12, 35, 60, 92]) }),
  'binary-search': z.object({ values: numbers.max(10).default([]), target: z.number().finite() }),
  islands: z.object({
    grid: z
      .array(z.string().regex(/^[01]{1,5}$/))
      .min(1)
      .max(4)
      .default(['1100', '0101', '0011']),
  }),
  'linked-list': z.object({ values: numbers.max(6).default([]) }),
  'coin-change': z.object({
    amount: z.number().int().min(0).max(10),
    coins: z.array(z.number().int().positive()).max(4),
  }),
  'graph-bfs': z.object({ mode: z.enum(['standard', 'cycle', 'disconnected']).optional() }),
};
