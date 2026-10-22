import { required } from './assert.ts';
import type { Param, Value } from './model.ts';
export function parseInput(prm: Param, raw: string): Value | Value[] {
  const fail = (message: string): never => {
    throw new Error(message);
  };
  if (raw.length > (prm.type === 'code' ? 4000 : 512)) fail('Input is too long.');
  if (prm.type === 'code') {
    const lines = raw.split('\n');
    if (lines.length > 16 || lines.some((line) => line.length > 58))
      fail('Use at most 16 lines and wrap each line at 58 characters.');
    return raw;
  }
  if (prm.type === 'select') {
    if (!required(prm.options).some((o) => String(o.value) === raw))
      fail('Choose one of the available options.');
    return raw;
  }
  if (['numbers', 'tree', 'list'].includes(prm.type)) {
    const parts = (prm.type === 'tree' ? raw.replace(/[\[\]]/g, '') : raw)
      .split(/[\s,]+/)
      .filter(Boolean);
    if (parts.length > ((prm.max ?? 0) || 14)) fail(`Use at most ${(prm.max ?? 0) || 14} items.`);
    if (!parts.length && prm.allowEmpty !== true && prm.type !== 'tree')
      fail('Enter at least one value.');
    if (prm.type === 'list') {
      if (parts.some((x) => x.length > 28)) fail('Keep each item within 28 characters.');
      if ((prm.pattern ?? '') && parts.some((x) => !new RegExp(required(prm.pattern)).test(x)))
        fail((prm.formatHint ?? '') || 'An item has an unsupported format.');
      return parts;
    }
    return parts.map((x) => {
      if (prm.type === 'tree' && /^null$/i.test(x)) return null;
      if (!/^[+-]?(?:\d+(?:\.\d+)?|\.\d+)$/.test(x)) fail('Use numbers separated by commas.');
      const n = Number(x);
      if (!Number.isFinite(n) || Math.abs(n) > 999) fail('Keep values between -999 and 999.');
      if (String(n).length > 6) fail('Use at most six characters per number.');
      if (prm.positiveInteger === true && (!Number.isInteger(n) || n < 1))
        fail('Use positive whole numbers.');
      return n;
    });
  }
  const n = Number(raw);
  if (!raw.trim() || !Number.isFinite(n) || !Number.isInteger(n)) fail('Enter a whole number.');
  if (n < (prm.min ?? -999) || n > (prm.max ?? 999))
    fail(`Use a value from ${prm.min ?? -999} to ${prm.max ?? 999}.`);
  return n;
}
