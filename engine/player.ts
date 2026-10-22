import { required, assertNever, errorMessage } from './assert.ts';
import { element, control } from './dom.ts';
import { extraGenerators } from './extended-generators.ts';
import { coreGenerators } from './generators.ts';
import { specSchema, sceneSchema } from './model.ts';
import type {
  Actor,
  Beat,
  Code,
  EdgeCase,
  Link,
  Params,
  Pointer,
  Scene,
  Value,
  Variant,
} from './model.ts';
import { parseInput } from './parse-input.ts';
import type {
  ActorIndex,
  ActorState,
  ActorView,
  Box,
  Frame,
  Point,
  SceneViews,
  State,
  InspectorRow,
} from './player-types.ts';
const GENERATORS = { ...coreGenerators, ...extraGenerators };

const SPEC = specSchema.parse(JSON.parse(element('motion-spec', HTMLScriptElement).textContent));
const variants = SPEC.variants ?? [];
const SVGNS = 'http://www.w3.org/2000/svg';
const params = new URLSearchParams(location.search);
if (params.get('embed') === '1') document.body.classList.add('embedded');
const QA = params.get('motion-qa') === '1';
const FRAME = params.has('motion-frame') ? Number(params.get('motion-frame')) : null;
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const $ = (id: string): HTMLElement => element(id, HTMLElement);
const clamp = (v: number, a = 0, b = 1): number => Math.max(a, Math.min(b, v));
const ease = (p: number): number => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2);
const clone = <T>(value: T): T => structuredClone(value);
const TONE_COLOR: Record<string, string> = {
  mechanism: 'var(--blue)',
  success: 'var(--green)',
  failure: 'var(--red)',
  warning: 'var(--amber)',
  repeated: 'var(--purple)',
  context: 'var(--muted)',
  muted: 'var(--faint)',
};
const THEME_ICONS: Record<string, string> = {
  system:
    '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="12" rx="2"/><path d="M8.5 20h7M12 16v4"/></svg>',
  light:
    '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="12" cy="12" r="4.2"/><path d="M12 2.5v2.3M12 19.2v2.3M4.6 4.6l1.6 1.6M17.8 17.8l1.6 1.6M2.5 12h2.3M19.2 12h2.3M4.6 19.4l1.6-1.6M17.8 6.2l1.6-1.6"/></svg>',
  dark: '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"/></svg>',
};
const THEME_NAMES: Record<string, string> = {
  system: 'Theme: follows your system',
  light: 'Theme: light',
  dark: 'Theme: dark',
};
const W = SPEC.stage.width || 960;
const H = SPEC.stage.height || 400;

/* ---------- Code highlighting (ported from the step walkthrough tokenizer) ---------- */
const CODE_KW = new Set([
  'const',
  'let',
  'var',
  'function',
  'return',
  'if',
  'else',
  'true',
  'false',
  'null',
  'undefined',
  'number',
  'boolean',
  'string',
  'type',
  'interface',
  'new',
  'throw',
  'async',
  'await',
  'class',
  'extends',
  'implements',
  'public',
  'private',
  'protected',
  'switch',
  'case',
  'break',
  'for',
  'of',
  'in',
  'while',
  'try',
  'catch',
  'finally',
  'import',
  'export',
  'from',
  'SELECT',
  'FROM',
  'WHERE',
  'UPDATE',
  'SET',
  'INSERT',
  'INTO',
  'VALUES',
  'JOIN',
  'ON',
  'GROUP',
  'BY',
  'ORDER',
  'LIMIT',
  'FOR',
  'DELETE',
  'CREATE',
  'TABLE',
  'UNIQUE',
]);
const CODE_TOKEN =
  /(\/\/.*$|--\s.*$|`(?:\\.|[^`\\])*`?|'(?:\\.|[^'\\])*'?|"(?:\\.|[^"\\])*"?|\b[A-Za-z_$][\w$]*\b|\b\d+(?:\.\d+)?\b)/g;
const HTTP_LINE =
  /^(?:(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)(\s+\S+)(\s+HTTP\/[\d.]+)?|([A-Za-z][\w-]*)(:)(.*))$/;
function tokenClass(value: string, line: string, end: number): string | null {
  if (value.startsWith('//') || value.startsWith('--')) return 'tok-comment';
  if (value[0] === '"' || value[0] === "'" || value[0] === '`') return 'tok-string';
  if (/^\d/.test(value)) return 'tok-number';
  if (CODE_KW.has(value)) return 'tok-keyword';
  if (/^\s*\(/.test(line.slice(end))) return 'tok-function';
  if (/^[A-Z][a-z]/.test(value)) return 'tok-type';
  return null;
}
// HTTP fragments inside the diagram: methods, paths, path params, query keys, header names, status codes, JSON.
const HTTP_FRAG =
  /(\b(?:GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS|Bearer|JSON|CSV)\b)|(\{[\w-]+\}|<[\w-]+>)|((?:^|[?&])[\w-]+(?==)|\b[\w-]+(?=\s*=\s))|(\b[1-5]\d\d\b)|("(?:\\.|[^"\\])*"?)|(\/[^\s?{}"',]*|\b[\w-]+(?:\.[\w-]+)+\b|\b[a-z]+_[\w]+\b|\b[a-z]+(?:-[\w]+)+\b)|(\b[A-Z][\w]*(?:-[A-Z][\w]*)+:?|\b[A-Z][a-z]+-?[A-Za-z]*:(?=\s|$)|\b[a-z]+\/[\w.+-]+\b)|(\b\d+(?:\.\d+)?\b)|(\btrue\b|\bfalse\b|\bnull\b)/g;
function httpTokens(line: string): [string, string | null][] {
  const out: [string, string | null][] = [];
  let last = 0;
  let m;
  HTTP_FRAG.lastIndex = 0;
  const cls = [
    'tok-keyword',
    'tok-type',
    'tok-function',
    'tok-number',
    'tok-string',
    'tok-string',
    'tok-function',
    'tok-number',
    'tok-keyword',
  ];
  while ((m = HTTP_FRAG.exec(line)) !== null) {
    if (m[0] === '') {
      HTTP_FRAG.lastIndex += 1;
      continue;
    }
    if (m.index > last) out.push([line.slice(last, m.index), null]);
    const g = m.findIndex((x, i) => i > 0 && x !== undefined) - 1;
    out.push([m[0], (cls[g] ?? '') || null]);
    last = m.index + m[0].length;
  }
  if (last < line.length) out.push([line.slice(last), null]);
  return out;
}
function tokens(line: string, http: boolean | 'fragment'): [string, string | null][] {
  if (http === 'fragment') return httpTokens(line);
  if (http) {
    const h = HTTP_LINE.exec(line);
    if (h) {
      if (h[1] !== undefined && h[1] !== '')
        return [
          [h[1], 'tok-keyword'],
          ...httpTokens(h[2] ?? ''),
          [(h[3] ?? '') || '', 'tok-comment'],
        ];
      return [[required(h[4]) + required(h[5]), 'tok-function'], ...httpTokens(h[6] ?? '')];
    }
    return httpTokens(line);
  }
  const out: [string, string | null][] = [];
  let last = 0;
  let m;
  CODE_TOKEN.lastIndex = 0;
  while ((m = CODE_TOKEN.exec(line)) !== null) {
    if (m.index > last) out.push([line.slice(last, m.index), null]);
    out.push([m[0], tokenClass(m[0], line, m.index + m[0].length)]);
    last = m.index + m[0].length;
  }
  if (last < line.length) out.push([line.slice(last), null]);
  return out;
}
function highlightLine(line: string, into: Element, http: boolean | 'fragment' = false): void {
  for (const [text, cls] of tokens(line, http)) {
    if (!text) continue;
    if (cls !== null) {
      const sp = document.createElement('span');
      sp.className = cls;
      sp.textContent = text;
      into.appendChild(sp);
    } else into.appendChild(document.createTextNode(text));
  }
}
const lastText = new WeakMap<Node, string>();
function svgCodeText(
  node: SVGTextElement | undefined,
  text: Value | undefined,
  lang?: string,
): void {
  if (node === undefined) return;
  const s = String(text ?? '');
  if (lastText.get(node) === s) return;
  lastText.set(node, s);
  node.textContent = '';
  if (!s) return;
  for (const [t, cls] of tokens(s, lang === 'http' ? 'fragment' : false)) {
    if (!t) continue;
    const ts = document.createElementNS(SVGNS, 'tspan');
    if (cls !== null) ts.setAttribute('class', cls);
    ts.textContent = t;
    node.appendChild(ts);
  }
}
function setText(node: SVGTextElement | undefined, text: Value | undefined): void {
  if (node === undefined) return;
  const s = String(text ?? '');
  if (lastText.get(node) !== s) {
    lastText.set(node, s);
    node.textContent = s;
  }
}
// Prose: numbers, "quoted strings" and code-like words are highlighted with the same token colours.
const PROSE_TOKEN =
  /("[^"]{1,60}"|“[^”]{1,60}”)|(\b(?:GET|POST|PUT|PATCH|DELETE|HTTP|NaN|null|undefined|true|false|SELECT|UPDATE|INSERT|WHERE)\b)|(\b[a-z]+[A-Z][\w]*(?:\(\))?|\b\w+\(\)|\b[a-z]\w*_\w+\b|\b[a-z]\w*\.[a-z]\w*(?:\(\))?|\/v\d\/[\w/{}.-]*)|(−?\b\d+(?:[.,]\d+)?(?:\s?(?:ms|GB|TB|KB|%))?\b)/g;
function proseTokens(text: string, into: Element): void {
  let last = 0;
  let m;
  PROSE_TOKEN.lastIndex = 0;
  while ((m = PROSE_TOKEN.exec(text)) !== null) {
    if (m.index > last) into.appendChild(document.createTextNode(text.slice(last, m.index)));
    const sp = document.createElement('span');
    sp.className =
      (m[1] ?? '')
        ? 'tok-string'
        : (m[2] ?? '')
          ? 'tok-keyword'
          : (m[3] ?? '')
            ? 'tok-function'
            : 'tok-number';
    sp.textContent = m[0];
    into.appendChild(sp);
    last = m.index + m[0].length;
  }
  if (last < text.length) into.appendChild(document.createTextNode(text.slice(last)));
}
function richText(target: Element, text: string | undefined): void {
  target.textContent = '';
  String((text ?? '') || '')
    .split(/(`[^`]+`)/)
    .forEach((part) => {
      if (part.length > 2 && part[0] === '`' && part[part.length - 1] === '`') {
        const c = document.createElement('code');
        c.className = 'mp-inline';
        highlightLine(part.slice(1, -1), c, SPEC.code?.language === 'http' ? 'fragment' : false);
        target.appendChild(c);
      } else if (part) proseTokens(part, target);
    });
}

/* ---------- Scene engine: state is a pure function of time ---------- */
function initialState(sc: Scene): State {
  const st: State = { actors: {}, tokens: {}, links: {}, notes: [], pulses: [] };
  for (const a of sc.actors) {
    const actorState: ActorState = {
      tone: a.tone || null,
      value: a.value ?? null,
      label: a.label ?? null,
      sub: a.sub ?? null,
      rows: clone(a.kind === 'store' ? (a.rows ?? []) : []),
      newRows: [],
      text: a.kind === 'text' ? (a.text ?? null) : null,
      values: [],
      cellTones: [],
      pointers: {},
      _rowAppear: null,
    };
    st.actors[a.id] = actorState;
    if (a.kind === 'cells') {
      actorState.values = clone(a.values);
      actorState.cellTones = a.values.map(() => null);
      actorState.pointers = {};
      for (const ptr of a.pointers || []) actorState.pointers[ptr.id] = ptr.index;
    }
  }
  for (const l of sc.links || []) st.links[l.id] = { active: false, tone: l.tone || null };
  for (const t of sc.tokens || [])
    st.tokens[t.id] = {
      visible: !!(t.at ?? ''),
      actor: (t.at ?? '') || null,
      link: null,
      pos: 0,
      reverse: false,
      opacity: 1,
      label: (t.label ?? '') || '',
      tone: t.tone || 'mechanism',
      dropped: false,
      moving: false,
    };
  return st;
}
function applyBeat(st: State, beat: Beat, p: number, final: boolean): State {
  st.notes = [];
  st.pulses = [];
  for (const l of Object.values(st.links)) l.active = false;
  for (const act of beat.actions) {
    const [a0, a1] = act.at || [0, 1];
    if (p < a0 && !final) continue;
    const local = final ? 1 : clamp(a1 === a0 ? 1 : (p - a0) / (a1 - a0));
    const e = ease(local);
    const actor = (): ActorState => required(st.actors['actor' in act ? (act.actor ?? '') : '']);
    switch (act.do) {
      case 'move':
      case 'drop': {
        const t = required(st.tokens[act.token]);
        t.visible = true;
        t.link = act.link;
        t.actor = null;
        t.reverse = act.reverse === true;
        if (act.do === 'drop') {
          const stopAt = act.stopAt ?? 0.55;
          const travel = clamp(local / 0.7);
          t.pos = stopAt * ease(travel);
          t.dropped = local > 0.7;
          t.opacity = local > 0.7 ? 1 - clamp((local - 0.7) / 0.3) * 0.75 : 1;
          if (final) {
            t.visible = false;
            t.dropped = false;
            t.opacity = 1;
          }
        } else {
          const f0 = act.from ?? 0;
          const f1 = act.to ?? 1;
          t.pos = f0 + (f1 - f0) * e;
          t.dropped = false;
          t.opacity = 1;
        }
        t.moving = !final && local > 0 && local < 1;
        if (t.moving) required(st.links[act.link]).active = true;
        break;
      }
      case 'show': {
        const t = required(st.tokens[act.token]);
        t.visible = true;
        t.actor = act.place;
        t.link = null;
        t.dropped = false;
        t.opacity = 1;
        break;
      }
      case 'hide': {
        const t = required(st.tokens[act.token]);
        t.visible = false;
        t.dropped = false;
        t.opacity = 1;
        t.moving = false;
        break;
      }
      case 'label': {
        required(st.tokens[act.token]).label = act.text;
        if (act.tone) required(st.tokens[act.token]).tone = act.tone;
        break;
      }
      case 'tone':
        if (act.token !== undefined) required(st.tokens[act.token]).tone = act.tone;
        else if (act.link !== undefined) required(st.links[act.link]).tone = act.tone;
        else actor().tone = act.tone;
        break;
      case 'set': {
        const target = act.value;
        const state = actor();
        if (typeof target === 'number' && typeof state.value === 'number' && !final && local < 1)
          state.value = state.value + (target - state.value) * e;
        else actor().value = target;
        break;
      }
      case 'text':
        actor()[act.field || 'label'] = act.value;
        break;
      case 'row': {
        if (act.remove !== undefined) {
          actor().rows = actor().rows.filter((r) => r !== act.remove);
          break;
        }
        actor().rows = actor().rows.concat([required(act.value)]);
        if (!final) actor().newRows = actor().newRows.concat([required(act.value)]);
        actor()._rowAppear = { row: required(act.value), k: e };
        break;
      }
      case 'rows': {
        const was = actor().rows;
        actor().rows = clone(act.value);
        if (!final) actor().newRows = actor().rows.filter((r) => !was.includes(r));
        actor()._rowAppear = null;
        break;
      }
      case 'cells': {
        const [i, j] = act.range;
        for (let x = i; x <= j; x += 1) actor().cellTones[x] = act.tone;
        break;
      }
      case 'cellValue': {
        actor().values[act.index] = act.value;
        break;
      }
      case 'pointer': {
        const from = actor().pointers[act.pointer];
        actor().pointers[act.pointer] =
          from === -1 || from === undefined || final ? act.index : from + (act.index - from) * e;
        break;
      }
      case 'note':
        if (!final && p <= (act.until ?? 1.01))
          st.notes.push({
            actor: act.actor,
            text: act.text,
            tone: act.tone || 'mechanism',
            k: clamp(local * 4),
          });
        break;
      case 'pulse':
        if (!final && local > 0 && local < 1) st.pulses.push({ actor: act.actor, k: local });
        break;
      default:
        assertNever(act);
    }
  }
  if (final)
    for (const a of Object.values(st.actors)) {
      a.newRows = [];
      a._rowAppear = null;
    }
  return st;
}
function el<K extends keyof SVGElementTagNameMap>(
  tag: K,
  attrs: Record<string, string | number | boolean | null | undefined>,
  parent?: Element,
): SVGElementTagNameMap[K] {
  const node = document.createElementNS(SVGNS, tag);
  for (const [k, v] of Object.entries(attrs))
    if (v !== null && v !== undefined) node.setAttribute(k, String(v));
  if (parent) parent.appendChild(node);
  return node;
}
function box(a: Actor): Box {
  if (a.kind === 'circle' || a.kind === 'ring')
    return { x: a.x - a.r, y: a.y - a.r, w: a.r * 2, h: a.r * 2 };
  if (a.kind === 'cells') {
    const n = a.values.length;
    return { x: a.x - a.cell / 2, y: a.y - a.cell / 2 - 60, w: n * a.cell, h: a.cell + 130 };
  }
  if (a.kind === 'text') {
    const w = String((a.text ?? '') || '').length * 8.5;
    return { x: a.anchor === 'start' ? a.x : a.x - w / 2, y: a.y - 16, w, h: 22 };
  }
  return { x: a.x - a.w / 2, y: a.y - a.h / 2, w: a.w, h: a.h };
}
function anchor(a: Actor, towards: Point): Point {
  const b = box(required(a));
  const cx = a.x;
  const cy = a.y;
  const dx = towards.x - cx;
  const dy = towards.y - cy;
  if (a.kind === 'circle') {
    const d = Math.hypot(dx, dy) || 1;
    return { x: cx + (dx / d) * a.r, y: cy + (dy / d) * a.r };
  }
  const sx = dx === 0 ? Infinity : b.w / 2 / Math.abs(dx);
  const sy = dy === 0 ? Infinity : b.h / 2 / Math.abs(dy);
  const s = Math.min(sx, sy);
  return { x: cx + dx * s, y: cy + dy * s };
}
function fmt(v: Value | undefined): string {
  if (v === null || v === undefined) return '';
  if (typeof v === 'number') return Number.isInteger(v) ? String(v) : String(Math.round(v));
  return String(v);
}
// Pointer placement: L / i / slow above the array, R / j / fast below; same-side neighbours stack so labels never overlap.
const ABOVE_POINTERS = new Set(['L', 'l', 'i', 'slow', 'left', 'lo', 'low', 'start', 'prev']);
function pointerSide(ptr: Pointer): 'above' | 'below' {
  if (ptr.side) return ptr.side;
  if (ptr.below === true) return 'below';
  if (ptr.below === false) return 'above';
  return ABOVE_POINTERS.has(ptr.id) || ABOVE_POINTERS.has(ptr.label) ? 'above' : 'below';
}

class Stage {
  readonly svg: SVGSVGElement;
  readonly scene: Scene;
  readonly byId: ActorIndex = {};
  readonly starts: number[] = [];
  readonly snaps: State[] = [];
  total = 0;
  readonly focus: Box[];
  els: SceneViews;
  cam: Box = { x: 0, y: 0, w: W, h: H };
  constructor(svg: SVGSVGElement, sc: Scene) {
    this.svg = svg;
    this.scene = sc;
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    this.byId = {};
    for (const a of sc.actors) this.byId[a.id] = a;
    this.starts = [];
    this.snaps = [];
    this.total = 0;
    let st = initialState(sc);
    for (const b of sc.beats) {
      this.starts.push(this.total);
      this.snaps.push(clone(st));
      this.total += b.dur || 1600;
      st = applyBeat(clone(st), b, 1, true);
    }
    this.starts.push(this.total);
    this.snaps.push(st);
    this.focus = sc.beats.map((b) => this.focusBox(b));
    this.els = this.build();
  }
  beatAt(t: number): number {
    for (let i = this.scene.beats.length - 1; i >= 0; i -= 1)
      if (t >= required(this.starts[i])) return i;
    return 0;
  }
  stateAt(t: number): Frame {
    if (t >= this.total)
      return {
        st: clone(required(this.snaps[this.snaps.length - 1])),
        i: this.scene.beats.length - 1,
        p: 1,
      };
    const i = this.beatAt(t);
    const b = required(this.scene.beats[i]);
    const p = clamp((t - required(this.starts[i])) / (b.dur || 1600));
    return { st: applyBeat(clone(required(this.snaps[i])), b, p, false), i, p };
  }
  linkPath(l: Link): { d: string; label: Point } {
    const f = required(this.byId[l.from]);
    const t = required(this.byId[l.to]);
    const bend = (l.bend ?? 0) || 0;
    const mx = (f.x + t.x) / 2;
    const my = (f.y + t.y) / 2;
    const dx = t.x - f.x;
    const dy = t.y - f.y;
    const d = Math.hypot(dx, dy) || 1;
    const cx = mx + (-dy / d) * bend;
    const cy = my + (dx / d) * bend;
    const p1 = anchor(f, { x: cx, y: cy });
    const p2 = anchor(t, { x: cx, y: cy });
    return {
      d: `M${p1.x.toFixed(1)},${p1.y.toFixed(1)} Q${cx.toFixed(1)},${cy.toFixed(1)} ${p2.x.toFixed(1)},${p2.y.toFixed(1)}`,
      label: { x: cx, y: cy },
    };
  }
  // Camera: the region the current chapter acts on, padded, never tighter than 72% of the stage.
  focusBox(beat: Beat): Box {
    const ids = new Set<string>();
    for (const a of beat.actions) {
      if ('actor' in a && a.actor !== undefined) ids.add(a.actor);
      if ('link' in a && (a.link ?? '')) {
        const l = (this.scene.links || []).find((x) => x.id === a.link);
        if (l) {
          ids.add(l.from);
          ids.add(l.to);
        }
      }
    }
    if (beat.focus) beat.focus.forEach((id) => ids.add(id));
    const boxes = [...ids]
      .map((id) => this.byId[id])
      .filter(
        (a): a is Actor =>
          a !== undefined && a.kind !== 'lane' && a.kind !== 'ring' && a.kind !== 'text',
      )
      .map(box);
    if (!boxes.length) return { x: 0, y: 0, w: W, h: H };
    const x0 = Math.min(...boxes.map((b) => b.x)) - 70;
    const y0 = Math.min(...boxes.map((b) => b.y)) - 70;
    const x1 = Math.max(...boxes.map((b) => b.x + b.w)) + 70;
    const y1 = Math.max(...boxes.map((b) => b.y + b.h)) + 50;
    let w = Math.max(x1 - x0, W * 0.72);
    let h = (w * H) / W;
    if (y1 - y0 > h) {
      h = y1 - y0;
      w = (h * W) / H;
    }
    const cx = (x0 + x1) / 2;
    const cy = (y0 + y1) / 2;
    w = Math.min(w, W);
    h = Math.min(h, H);
    return { x: clamp(cx - w / 2, 0, W - w), y: clamp(cy - h / 2, 0, H - h), w, h };
  }
  cameraAt(t: number, on: boolean): Box {
    if (!on) return { x: 0, y: 0, w: W, h: H };
    const i = this.beatAt(Math.min(t, this.total - 1));
    const cur = this.focus[i] || { x: 0, y: 0, w: W, h: H };
    const prev = i > 0 ? this.focus[i - 1] : { x: 0, y: 0, w: W, h: H };
    const dur = required(this.scene.beats[i]).dur || 1600;
    const k = ease(clamp((t - required(this.starts[i])) / Math.min(700, dur * 0.35)));
    const mix = (a: number, b: number): number => a + (b - a) * k;
    return {
      x: mix(required(prev).x, cur.x),
      y: mix(required(prev).y, cur.y),
      w: mix(required(prev).w, cur.w),
      h: mix(required(prev).h, cur.h),
    };
  }
  build(): SceneViews {
    const svg = this.svg;
    svg.textContent = '';
    const els: SceneViews = {
      actors: {},
      links: {},
      tokens: {},
      pulses: el('g', {}, svg),
      notes: el('g', {}, svg),
    };
    const defs = el('defs', {}, svg);
    const mid = `mp-arrow-${svg.id}`;
    const marker = el(
      'marker',
      {
        id: mid,
        viewBox: '0 0 10 10',
        refX: 9,
        refY: 5,
        markerWidth: 7,
        markerHeight: 7,
        orient: 'auto-start-reverse',
      },
      defs,
    );
    el(
      'path',
      {
        d: 'M1,1 L9,5 L1,9',
        fill: 'none',
        stroke: 'context-stroke',
        'stroke-width': 1.5,
        'stroke-linecap': 'round',
        'stroke-linejoin': 'round',
      },
      marker,
    );
    const gl = el('g', {}, svg);
    const gk = el('g', {}, svg);
    const ga = el('g', {}, svg);
    els.pulses = el('g', {}, svg);
    const gt = el('g', {}, svg);
    els.notes = el('g', {}, svg);
    for (const a of this.scene.actors.filter((x) => x.kind === 'lane')) {
      el('rect', { class: 's-lane', x: a.x, y: a.y, width: a.w, height: a.h, rx: 12 }, gl);
      const t = el('text', { class: 's-lane-label', x: a.x + 12, y: a.y + 20 }, gl);
      t.textContent = a.label ?? '';
    }
    for (const a of this.scene.actors.filter((x) => x.kind === 'ring')) {
      el('circle', { class: 's-link', cx: a.x, cy: a.y, r: a.r, 'stroke-dasharray': '4 5' }, gl);
    }
    for (const l of this.scene.links || []) {
      const geo = this.linkPath(l);
      const path = el('path', { class: 's-link', d: geo.d, 'marker-end': `url(#${mid})` }, gk);
      if (l.label !== undefined) {
        const lb = el(
          'text',
          { class: 's-link-label', x: geo.label.x, y: geo.label.y - 6, 'text-anchor': 'middle' },
          gk,
        );
        lb.textContent = l.label;
      }
      els.links[l.id] = { path, len: null };
    }
    for (const a of this.scene.actors) {
      if (a.kind === 'lane' || a.kind === 'ring') continue;
      const g = el('g', { 'data-actor': a.id, 'data-kind': a.kind }, ga);
      const rec: ActorView = { g };
      if (a.anchor === true) g.setAttribute('opacity', String(0)); // invisible arrow endpoint (sequence diagrams): no placeholder dots before a message is sent
      if (a.kind === 'text')
        rec.text = el(
          'text',
          {
            class: 's-text',
            x: a.x,
            y: a.y,
            'text-anchor': typeof a.anchor === 'string' ? a.anchor : 'middle',
          },
          g,
        );
      else if (a.kind === 'cells') {
        rec.cells = [];
        rec.ptrs = {};
        a.values.forEach((_value, i) => {
          const x = a.x + i * a.cell - a.cell / 2 + 3;
          const r = el(
            'rect',
            {
              class: 's-cell',
              x,
              y: a.y - a.cell / 2,
              width: a.cell - 6,
              height: a.cell - 6,
              rx: 8,
            },
            g,
          );
          const tv = el(
            'text',
            { class: 's-cell-v', x: x + (a.cell - 6) / 2, y: a.y + 3, 'text-anchor': 'middle' },
            g,
          );
          const ti = el(
            'text',
            {
              class: 's-cell-i',
              x: x + (a.cell - 6) / 2,
              y: a.y - a.cell / 2 - 7,
              'text-anchor': 'middle',
            },
            g,
          );
          ti.textContent = String(i);
          required(rec.cells).push({ r, tv });
        });
        for (const ptr of a.pointers || []) {
          const pg = el('g', { class: 's-ptr' }, g);
          const col = TONE_COLOR[ptr.tone || 'mechanism'];
          const side = pointerSide(ptr);
          const tri = el(
            'path',
            { d: side === 'below' ? 'M0,0 L-8,12 L8,12 z' : 'M0,12 L-8,0 L8,0 z', fill: col },
            pg,
          );
          const tt = el('text', { 'text-anchor': 'middle', fill: col }, pg);
          tt.textContent = ptr.label;
          rec.ptrs[ptr.id] = { g: pg, tri, text: tt, side, fixedLevel: ptr.level, x: 0, level: 0 };
        }
      } else {
        rec.shape =
          a.kind === 'circle'
            ? el('circle', { class: 's-shape', cx: a.x, cy: a.y, r: a.r }, g)
            : el(
                'rect',
                {
                  class: 's-shape',
                  x: a.x - a.w / 2,
                  y: a.y - a.h / 2,
                  width: a.w,
                  height: a.h,
                  rx: a.kind === 'store' ? 6 : 12,
                },
                g,
              );
        const top =
          a.kind === 'store'
            ? a.y - a.h / 2 + 20
            : a.value !== null && a.value !== undefined
              ? a.y - 10
              : a.y + 6;
        rec.label = el(
          'text',
          {
            class:
              a.small === true || a.small === 'prose'
                ? `s-label s-small${a.small === 'prose' ? ' s-prose' : ''}`
                : 's-label',
            x: a.x,
            y: a.small === true || a.small === 'prose' ? a.y + 5 : top,
            'text-anchor': 'middle',
          },
          g,
        );
        rec.value = el(
          'text',
          {
            class: a.valueSmall === true ? 's-value s-vsm' : 's-value',
            x: a.x,
            y: a.y + (a.valueSmall === true ? 20 : 24),
            'text-anchor': 'middle',
          },
          g,
        );
        rec.sub = el(
          'text',
          {
            class: 's-sub',
            x: a.x,
            y: a.y + (a.kind === 'circle' ? a.r : a.h / 2) + 20,
            'text-anchor': 'middle',
          },
          g,
        );
        if (a.kind === 'store') rec.rows = el('g', {}, g);
      }
      els.actors[a.id] = rec;
    }
    // Packets: a pill that carries its value, with a short fading trail behind it.
    for (const t of this.scene.tokens || []) {
      const g = el('g', { class: 's-packet', 'data-token': t.id }, gt);
      const trail: SVGCircleElement[] = []; // Decorative rings removed; packets carry the motion.
      const rect = el('rect', { rx: 11, height: 22, y: -11 }, g);
      const lbl = el('text', { x: 0, y: 5, 'text-anchor': 'middle' }, g);
      const x = el('g', {}, g);
      el('line', { class: 's-x', x1: -7, y1: -20, x2: 7, y2: -6 }, x);
      el('line', { class: 's-x', x1: 7, y1: -20, x2: -7, y2: -6 }, x);
      els.tokens[t.id] = { g, rect, lbl, x, trail, _pt: null, _w: 0 };
    }
    return els;
  }
  pointAt(linkId: string, pos: number): Point {
    const rec = required(this.els.links[linkId]);
    if (rec.len === null) rec.len = rec.path.getTotalLength();
    return rec.path.getPointAtLength(rec.len * clamp(pos));
  }
  render(st: State, t: number, cameraOn: boolean): void {
    const els = this.els;
    for (const a of this.scene.actors) {
      if (a.kind === 'lane' || a.kind === 'ring') continue;
      const s = required(st.actors[a.id]);
      const rec = required(els.actors[a.id]);
      if (a.kind === 'text') {
        if (a.code === true || (a.lang ?? '')) svgCodeText(rec.text, s.text ?? a.text, a.lang);
        else setText(rec.text, s.text ?? a.text);
        continue;
      }
      if (a.kind === 'cells') {
        required(rec.cells).forEach((c, idx) => {
          setText(c.tv, fmt(s.values[idx]));
          if (s.cellTones[idx]) c.r.setAttribute('data-tone', String(required(s).cellTones[idx]));
          else c.r.removeAttribute('data-tone');
        });
        const placed: Record<'above' | 'below', { x: number; level: number }[]> = {
          above: [],
          below: [],
        };
        const order = Object.entries(rec.ptrs ?? {})
          .filter(([pid]) => s.pointers[pid] !== undefined && s.pointers[pid] >= 0)
          .sort((x, y) => required(s.pointers[x[0]]) - required(s.pointers[y[0]]));
        for (const [pid, p] of Object.entries(rec.ptrs ?? {}))
          if (!(required(s.pointers[pid]) >= 0)) p.g.setAttribute('opacity', String(0));
        for (const [pid, p] of order) {
          const cx = a.x + required(s.pointers[pid]) * a.cell;
          let level = p.fixedLevel ?? 0;
          if (p.fixedLevel === undefined)
            while (placed[p.side].some((q) => q.level === level && Math.abs(q.x - cx) < 34))
              level += 1;
          placed[p.side].push({ x: cx, level });
          const base =
            p.side === 'below'
              ? a.y + a.cell / 2 + 2 + level * 30
              : a.y - a.cell / 2 - 36 - level * 30;
          p.tri.setAttribute('transform', `translate(0,${base})`);
          p.text.setAttribute('y', String(p.side === 'below' ? base + 29 : base - 5));
          p.g.setAttribute('opacity', String(1));
          p.g.setAttribute('transform', `translate(${cx.toFixed(1)},0)`);
          p.x = cx;
          p.level = level;
        }
        continue;
      }
      if (s.tone) rec.g.setAttribute('data-tone', String(required(s).tone));
      else rec.g.removeAttribute('data-tone');
      if (a.kind !== 'store' && (a.labelCode === true || a.small === true))
        svgCodeText(rec.label, s.label ?? '', a.lang);
      else setText(rec.label, s.label ?? '');
      if (a.code === true || (a.lang ?? '')) svgCodeText(rec.value, fmt(s.value), a.lang);
      else setText(rec.value, fmt(s.value));
      svgCodeText(rec.sub, s.sub ?? '', a.lang);
      if (rec.rows && a.kind === 'store') {
        const sig = JSON.stringify([s.rows, s.newRows, s._rowAppear && s._rowAppear.k.toFixed(2)]);
        if (rec._sig !== sig) {
          rec._sig = sig;
          rec.rows.textContent = '';
          const rh = 26;
          const y0 = a.y - a.h / 2 + 36;
          s.rows.forEach((row, idx) => {
            const appear = s._rowAppear && s._rowAppear.row === row ? s._rowAppear.k : 1;
            const rg = el(
              'g',
              {
                class: s.newRows.includes(row) ? 's-row-new' : '',
                opacity: appear,
                transform: `translate(${(1 - appear) * 14},0)`,
              },
              rec.rows,
            );
            if (String(row).trim())
              el(
                'rect',
                {
                  class: 's-row-bg',
                  x: a.x - a.w / 2 + 10,
                  y: y0 + idx * (rh + 4),
                  width: a.w - 20,
                  height: rh,
                  rx: 5,
                },
                rg,
              );
            const tx = el(
              'text',
              { class: 's-row', x: a.x - a.w / 2 + 18, y: y0 + idx * (rh + 4) + 18 },
              rg,
            );
            svgCodeText(tx, row, a.lang);
          });
        }
      }
    }
    for (const l of this.scene.links || []) {
      const s = required(st.links[l.id]);
      const rec = required(els.links[l.id]);
      rec.path.classList.toggle('active', !!s.active && !reduceMotion);
      rec.path.style.stroke = s.tone && s.tone !== 'hidden' ? (TONE_COLOR[s.tone] ?? '') : '';
      rec.path.style.opacity = s.tone === 'hidden' ? '0' : ''; // sequence diagrams: an arrow appears when its message is sent
    }
    for (const tk of this.scene.tokens || []) {
      const s = required(st.tokens[tk.id]);
      const rec = required(els.tokens[tk.id]);
      if (!s.visible) {
        rec.g.setAttribute('opacity', String(0));
        rec.trail.forEach((c) => c.setAttribute('opacity', String(0)));
        rec._pt = null;
        continue;
      }
      let pt;
      const pos = s.reverse ? 1 - s.pos : s.pos;
      if (s.link ?? '') pt = this.pointAt(required(s.link), pos);
      else {
        const a = required(this.byId[required(s.actor)]);
        pt = { x: a.x, y: a.y - ('h' in a ? a.h / 2 : 'r' in a ? a.r : 0) - 14 };
      }
      svgCodeText(rec.lbl, s.label, (tk.lang ?? '') || this.scene.lang);
      const w = Math.max(24, String(s.label).length * 8 + 18);
      rec.rect.setAttribute('x', String(-w / 2));
      rec.rect.setAttribute('width', String(w));
      rec.rect.style.fill = (TONE_COLOR[s.tone ?? 'mechanism'] ?? '') || 'var(--blue)';
      rec.rect.style.stroke = 'var(--surface)';
      rec.g.setAttribute('opacity', String(required(s).opacity));
      rec.g.setAttribute('transform', `translate(${pt.x.toFixed(1)},${pt.y.toFixed(1)})`);
      rec.x.setAttribute('opacity', String(required(s).dropped ? 1 : 0));
      rec.trail.forEach((c, k) => {
        if (!(s.link ?? '') || !s.moving || s.opacity <= 0 || pos <= 0 || pos >= 1) {
          c.setAttribute('opacity', String(0));
          return;
        } // trail only while the packet itself is visibly in flight
        const back = this.pointAt(
          required(s.link),
          s.reverse ? pos + (k + 1) * 0.035 : pos - (k + 1) * 0.035,
        );
        c.setAttribute('cx', back.x.toFixed(1));
        c.setAttribute('cy', back.y.toFixed(1));
        c.setAttribute('opacity', ((0.45 - k * 0.12) * s.opacity).toFixed(3));
        c.style.fill = (TONE_COLOR[s.tone ?? 'mechanism'] ?? '') || 'var(--blue)';
      });
      rec._pt = pt;
      rec._w = w;
    }
    els.pulses.textContent = '';
    els.notes.textContent = '';
    for (const n of st.notes) {
      const a = required(this.byId[n.actor]);
      const b = box(a);
      const g = el('g', { class: 's-note', opacity: n.k }, els.notes);
      const wdt = Math.max(60, n.text.length * 8 + 22);
      el(
        'rect',
        {
          x: a.x - wdt / 2,
          y: b.y - 36,
          width: wdt,
          height: 28,
          rx: 7,
          stroke: TONE_COLOR[n.tone ?? 'mechanism'],
        },
        g,
      );
      const tx = el('text', { x: a.x, y: b.y - 16, 'text-anchor': 'middle' }, g);
      tx.textContent = n.text;
    }
    const cam = this.cameraAt(t, cameraOn);
    this.svg.setAttribute(
      'viewBox',
      `${cam.x.toFixed(1)} ${cam.y.toFixed(1)} ${cam.w.toFixed(1)} ${cam.h.toFixed(1)}`,
    );
    this.cam = cam;
  }
}

/* ---------- Player ---------- */
let variantIndex = 0;
let compareIndex = -1;
let paramValues: Params = {};
let activeEdge: EdgeCase | null = null;
let A: Stage | null = null;
let B: Stage | null = null;
let t = 0;
let playing = false;
let speed = 1;
let last = 0;
let revealed = new Set<number>();
let currentBeat = -1;
let sidePanel: string | null = null;
const scrub = element('mp-scrub', HTMLInputElement);
const visibleVariants = (): [Variant, number][] =>
  variants.map((v, i): [Variant, number] => [v, i]).filter(([v]) => v.hidden !== true);

function sceneFor(vi: number, extra: Params = {}): Scene {
  const v = variants[vi];
  if (SPEC.simulation)
    return sceneSchema.parse(
      required(GENERATORS[SPEC.simulation.generator])({
        ...paramValues,
        ...activeEdge?.params,
        ...extra,
        ...v?.params,
      }),
    );
  return required(v?.scene ?? SPEC.scene);
}
function total(): number {
  return Math.max(A ? A.total : 0, B ? B.total : 0);
}
function activeStage(): Stage {
  return required(A, 'The primary stage has not loaded');
}
function emit(..._events: unknown[]): void {
  /* No telemetry. Playback stays in this browser. */
}
function showBadge(
  target: HTMLElement,
  edge: { label: string; why: string } | null | undefined,
): void {
  if (!edge) {
    target.hidden = true;
    return;
  }
  target.hidden = false;
  target.textContent = '';
  const b = document.createElement('b');
  b.textContent = `Edge case · ${edge.label}`;
  target.appendChild(b);
  const s = document.createElement('span');
  richText(s, edge.why || '');
  target.appendChild(s);
}
function load(): void {
  const sceneA = sceneFor(variantIndex);
  sceneCode = sceneA.code || null;
  renderCode();
  renderComplexity();
  A = new Stage(element('mp-stage-a', SVGSVGElement), sceneA);
  const compare = compareIndex >= 0;
  $('mp-wrap-b').hidden = !compare;
  $('mp-cmp-divider').hidden = !compare;
  element('mp-maximize', HTMLButtonElement).hidden = !compare;
  $('mp-stages').classList.toggle('compare', compare);
  $('mp-work').classList.toggle('compare-on', compare);
  if (!compare) B = null;
  if (compare && (sidePanel ?? '')) {
    panelBeforeCompare = sidePanel;
    setSide(null, false);
  }
  if (!compare) {
    if ((panelBeforeCompare ?? '') && !(sidePanel ?? '')) setSide(panelBeforeCompare, false);
    panelBeforeCompare = null;
    setMax(false);
  }
  $('mp-label-a').hidden = !compare;
  B = compare ? new Stage(element('mp-stage-b', SVGSVGElement), sceneFor(compareIndex)) : null;
  if (compare) {
    $('mp-label-a').textContent = required(variants[variantIndex]).label;
    $('mp-label-b').textContent = required(variants[compareIndex]).label;
  }
  showBadge($('mp-badge-a'), activeEdge || A.scene.edge);
  showBadge($('mp-badge-b'), B && B.scene.edge);
  t = 0;
  revealed = new Set();
  currentBeat = -1;
  scrub.max = String(Math.round(total()));
  const ticks = $('mp-ticks');
  ticks.textContent = '';
  A.scene.beats.forEach((b, i) => {
    if (i === 0) return;
    const d = document.createElement('span');
    d.className = 'mp-tick' + (b.predict ? ' predict' : '');
    d.style.left = `${(required(activeStage().starts[i]) / total()) * 100}%`;
    ticks.appendChild(d);
  });
  const ch = $('mp-chapters');
  ch.textContent = '';
  A.scene.beats.forEach((b, i) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'mp-chapter';
    richText(btn, `${i + 1}. ${b.title}${b.predict ? ' ?' : ''}`);
    btn.addEventListener('click', () => {
      pause();
      seek(i === 0 ? 0 : required(activeStage().starts[i]) + b.dur - 1);
      emit('chapter');
    });
    ch.appendChild(btn);
  });
  $('mp-overlay').hidden = false;
  $('mp-predict-layer').hidden = true;
  draw();
}
let lastCompareBeat = -1;
function draw(): void {
  const cam = element('mp-camera', HTMLInputElement).checked && !reduceMotion;
  const a = activeStage().stateAt(Math.min(t, activeStage().total));
  activeStage().render(a.st, Math.min(t, activeStage().total), cam);
  let b = null;
  if (B) {
    b = B.stateAt(Math.min(t, B.total));
    B.render(b.st, Math.min(t, B.total), cam);
  }
  scrub.value = String(Math.round(t));
  $('mp-time').textContent = `${(t / 1000).toFixed(1)} / ${(total() / 1000).toFixed(1)} s`;
  const i = a.i;
  if (i !== currentBeat || (B && b && b.i !== lastCompareBeat)) {
    currentBeat = i;
    lastCompareBeat = b ? b.i : -1;
    const beat = required(activeStage().scene.beats[i]);
    $('mp-count').textContent =
      `Chapter ${i + 1} of ${activeStage().scene.beats.length}${B ? ' · left' : ''}`;
    richText($('mp-cap-title'), beat.title);
    richText($('mp-cap-text'), beat.text || '');
    if (beat.tone) $('mp-caption').dataset.tone = beat.tone ?? '';
    else delete $('mp-caption').dataset.tone;
    document
      .querySelectorAll('.mp-chapter')
      .forEach((c, k) => c.setAttribute('aria-current', String(k === i)));
    $('mp-cap-b').hidden = !B;
    if (B && b) {
      const bb = required(B.scene.beats[b.i]);
      richText(
        $('mp-cap-b'),
        `Right (${required(variants[compareIndex]).label}): ${bb.title}. ${bb.text || ''}`,
      );
    }
    const explicit = (beat.lines || []).filter(
      (n) => Number.isInteger(n) && n > 0 && n <= ((curCode()?.lines.length ?? 0) || 0),
    );
    highlightCode(explicit.length ? explicit : inferLines(activeStage(), i));
  }
  if (sidePanel === 'inspector') renderInspector(a, b);
}
function seek(ms: number): void {
  t = clamp(ms, 0, total());
  $('mp-overlay').hidden = true;
  draw();
}
function play(): void {
  if (t >= total()) {
    t = 0;
    revealed = new Set();
  }
  playing = true;
  $('mp-overlay').hidden = true;
  $('mp-predict-layer').hidden = true;
  element('mp-play', HTMLButtonElement).textContent = '❚❚ Pause';
  last = performance.now();
  requestAnimationFrame(tick);
  emit('play');
}
function pause(): void {
  if (playing) emit('pause');
  playing = false;
  element('mp-play', HTMLButtonElement).textContent = '▶ Play';
}
function tick(now: number): void {
  if (!playing) return;
  const dt = Math.min(64, now - last);
  last = now;
  const next = t + dt * speed;
  const bi = activeStage().beatAt(t);
  const nb = bi + 1;
  if (
    element('mp-predict-mode', HTMLInputElement).checked &&
    nb < activeStage().scene.beats.length &&
    next >= required(activeStage().starts[nb]) &&
    required(activeStage().scene.beats[nb]).predict &&
    !revealed.has(nb)
  ) {
    t = required(activeStage().starts[nb]);
    draw();
    pause();
    showPredict(nb);
    return;
  }
  t = next;
  if (t >= total()) {
    t = total();
    draw();
    pause();
    emit('end');
    return;
  }
  draw();
  requestAnimationFrame(tick);
}
function showPredict(i: number): void {
  const pr = required(activeStage().scene.beats[i]).predict;
  richText($('mp-predict-q'), required(pr).q);
  richText($('mp-predict-a'), required(pr).a || '');
  $('mp-predict-a').hidden = true;
  element('mp-reveal', HTMLButtonElement).hidden = !required(pr).a;
  $('mp-predict-layer').hidden = false;
  revealed.add(i);
  element('mp-continue', HTMLButtonElement).focus();
}
function chapter(delta: number): void {
  pause();
  const target = clamp(activeStage().beatAt(t) + delta, 0, activeStage().scene.beats.length - 1);
  // A paused step shows the chapter result; Play still animates every transition.
  const end =
    required(activeStage().starts[target]) +
    (required(activeStage().scene.beats[target]).dur || 1600);
  seek(target === 0 ? 0 : end - 1);
}

/* ---------- Inspector: every value in the scene, updated each frame; what changed this chapter is highlighted ---------- */
function describe(stage: Stage, snap: State): InspectorRow[] {
  const rows: InspectorRow[] = [];
  for (const a of stage.scene.actors) {
    if (a.kind === 'lane' || a.kind === 'ring' || a.kind === 'text' || a.inspect === false)
      continue;
    const s = required(snap.actors[a.id]);
    const name =
      (a.inspectLabel ?? '') ||
      (((a.label ?? '') !== '' && a.kind !== 'box' ? a.label : null) ?? '') ||
      (a.label ?? '') ||
      a.id;
    if (a.kind === 'cells') {
      rows.push({
        k: name || 'array',
        v: `[${s.values.map(fmt).join(', ')}]`,
        key: `${a.id}:values`,
      });
      for (const [pid, idx] of Object.entries(s.pointers))
        if (idx >= 0)
          rows.push({ k: `pointer ${pid}`, v: `index ${Math.round(idx)}`, key: `${a.id}:${pid}` });
      continue;
    }
    if (a.kind === 'store') {
      rows.push({ k: name, rows: s.rows, key: `${a.id}:rows` });
      continue;
    }
    if (s.value !== null && s.value !== undefined && s.value !== '')
      rows.push({ k: name, v: fmt(s.value), key: `${a.id}:value` });
    else if ((a.small === true || a.small === 'prose') && s.label !== null)
      rows.push({ k: (a.inspectLabel ?? '') || a.id, v: s.label, key: `${a.id}:label` });
    if (s.sub !== null && s.sub.length > 0)
      rows.push({
        k: rows.some((r) => r.key === `${a.id}:value` || r.key === `${a.id}:label`)
          ? `${name} ·`
          : name,
        v: s.sub,
        key: `${a.id}:sub`,
      });
  }
  return rows;
}
function renderInspector(a: Frame, b: Frame | null): void {
  const panel = $('mp-panel-inspector');
  panel.textContent = '';
  const block = (stage: Stage, res: Frame, title: string): void => {
    const h = document.createElement('h3');
    h.textContent = title;
    panel.appendChild(h);
    const start = describe(stage, required(stage.snaps[res.i]));
    const now = describe(stage, res.st);
    if (!now.length)
      now.push({ k: 'Current step', v: required(stage.scene.beats[res.i]).title, key: 'chapter' });
    const before: Record<string, string> = {};
    start.forEach((r) => {
      before[r.key] = JSON.stringify(r.v ?? r.rows);
    });
    for (const r of now) {
      if (r.rows) {
        const kv = document.createElement('div');
        kv.className = 'mp-kv' + (before[r.key] !== JSON.stringify(r.rows) ? ' changed' : '');
        kv.innerHTML = '<span class="k"></span><span class="v"></span>';
        required(kv.firstChild).textContent = r.k;
        required(kv.lastChild).textContent = `${r.rows.length} rows`;
        panel.appendChild(kv);
        const list = document.createElement('div');
        list.className = 'mp-rowlist';
        const was = start.find((row) => row.key === r.key)?.rows ?? [];
        r.rows.forEach((row) => {
          const d = document.createElement('div');
          if (!was.includes(row)) d.className = 'new';
          highlightLine(String(row), d);
          list.appendChild(d);
        });
        panel.appendChild(list);
        continue;
      }
      const kv = document.createElement('div');
      kv.className = 'mp-kv' + (before[r.key] !== JSON.stringify(r.v) ? ' changed' : '');
      const k = document.createElement('span');
      k.className = 'k';
      k.textContent = r.k;
      const v = document.createElement('span');
      v.className = 'v';
      highlightLine(String(r.v), v);
      kv.append(k, v);
      panel.appendChild(kv);
    }
    const flying = Object.entries(res.st.tokens).filter(([, s]) => s.visible && s.link !== null);
    if (flying.length) {
      const h2 = document.createElement('h3');
      h2.textContent = 'In flight';
      panel.appendChild(h2);
      for (const [, s] of flying) {
        const l = (stage.scene.links ?? []).find((x) => x.id === s.link);
        const kv = document.createElement('div');
        kv.className = 'mp-kv flight';
        const k = document.createElement('span');
        k.className = 'k';
        k.textContent = `${required(l).from} → ${required(l).to}${s.dropped ? ' (lost)' : ''}`;
        const v = document.createElement('span');
        v.className = 'v';
        v.textContent = s.label;
        kv.append(k, v);
        panel.appendChild(kv);
      }
    }
  };
  block(activeStage(), a, B ? `Left · ${required(variants[variantIndex]).label}` : 'State now');
  if (B && b) block(B, b, `Right · ${required(variants[compareIndex]).label}`);
}

/* ---------- Side panel: inspector / code / complexity ---------- */
const IDENT = /[A-Za-z_][\w.]*(?:\(\))?/g;
const COMMON = new Set([
  'the',
  'and',
  'for',
  'not',
  'its',
  'this',
  'that',
  'with',
  'from',
  'one',
  'two',
  'are',
  'was',
  'has',
  'have',
  'each',
  'into',
  'then',
  'only',
  'but',
  'all',
  'can',
  'any',
  'now',
  'new',
  'yet',
  'out',
]);
function inferLines(stage: Stage, i: number): number[] {
  const CODE = curCode();
  if (!CODE) return [];
  const idents = (str: string): Set<string> =>
    new Set(
      (String(str || '').match(IDENT) || [])
        .map((w) => w.replace(/\(\)$/, '').toLowerCase())
        .filter((w) => w.length >= 3 && !COMMON.has(w)),
    );
  const b = required(stage.scene.beats[i]);
  const words = idents(
    [
      b.title,
      b.text,
      ...b.actions.map((a) => ['text' in a ? a.text : '', 'value' in a ? a.value : ''].join(' ')),
    ].join(' '),
  );
  const scored = CODE.lines
    .map((line, n) => {
      let sc = 0;
      for (const x of idents(line)) if (words.has(x)) sc += x.length > 5 ? 2 : 1;
      return [sc, n + 1] as const;
    })
    .filter(([sc]) => sc > 0)
    .sort((x, y) => y[0] - x[0])
    .slice(0, 3)
    .map(([, n]) => n)
    .sort((x, y) => x - y);
  if (scored.length) return scored;
  for (let k = i - 1; k >= 0; k -= 1) {
    const pb = required(stage.scene.beats[k]);
    const valid = (pb.lines || []).filter((n) => n > 0 && n <= CODE.lines.length);
    if (valid.length) return valid;
  }
  return [1];
}
function highlightCode(lines: number[]): void {
  if (sidePanel !== 'code') return;
  const body = $('mp-code-body');
  body.querySelectorAll('.ln').forEach((ln, k) => ln.classList.toggle('on', lines.includes(k + 1)));
  const on = body.querySelector('.ln.on');
  if (on !== null && !QA) on.scrollIntoView({ block: 'nearest' });
}
let sceneCode: Code | null = null; // a generator may return the learner's own program as the code panel (scene.code)
const curCode = ():
  { lines: string[]; language?: string | undefined; title?: string | undefined } | undefined => {
  if (sceneCode) return sceneCode;
  const v = variants[variantIndex];
  return (v && v.code) || SPEC.code;
};
const curComplexity = ():
  | {
      time: string;
      space: string;
      example?: string | undefined;
      derivation?: string[] | undefined;
      lowerBound?: string | undefined;
    }
  | undefined => {
  const v = variants[variantIndex];
  return (v && v.complexity) || SPEC.complexity;
};
const anyCode = (): boolean =>
  !!(
    SPEC.code ||
    variants.some((v) => v.code) ||
    (SPEC.simulation && SPEC.simulation.sceneCode === true)
  );
const anyComplexity = (): boolean => !!(SPEC.complexity || variants.some((v) => v.complexity));
function renderCode(): void {
  const CODE = curCode();
  if (!CODE) return;
  const body = $('mp-code-body');
  body.textContent = '';
  const http = CODE.language === 'http';
  CODE.lines.forEach((line, i) => {
    const row = document.createElement('div');
    row.className = 'ln';
    const no = document.createElement('span');
    no.className = 'no';
    no.textContent = String(i + 1);
    const src = document.createElement('span');
    src.className = 'src';
    if (line.length) highlightLine(line, src, http);
    else src.textContent = ' ';
    row.append(no, src);
    body.appendChild(row);
  });
}
function renderComplexity(): void {
  const c = curComplexity();
  if (!c) return;
  const p = $('mp-panel-complexity');
  p.textContent = '';
  const m = document.createElement('div');
  m.className = 'metric';
  m.innerHTML = '<div>Time<strong></strong></div><div>Space<strong></strong></div>';
  required(m.querySelectorAll('strong')[0]).textContent = c.time;
  required(m.querySelectorAll('strong')[1]).textContent = c.space;
  p.appendChild(m);
  for (const line of [
    ...((c.example ?? '') ? [`Example: ${c.example}`] : []),
    ...(c.derivation ?? []),
    ...((c.lowerBound ?? '') ? [`Lower bound: ${c.lowerBound}`] : []),
  ]) {
    const para = document.createElement('p');
    richText(para, line);
    p.appendChild(para);
  }
}
function renderReference(): void {
  const r = SPEC.reference;
  if (!r) return;
  const p = $('mp-panel-reference');
  p.textContent = '';
  for (const sec of r.sections) {
    const h = document.createElement('h4');
    h.textContent = sec.title;
    p.appendChild(h);
    const ul = document.createElement('ul');
    for (const item of sec.items) {
      const li = document.createElement('li');
      richText(li, item);
      ul.appendChild(li);
    }
    p.appendChild(ul);
  }
}
function pref(key: string, value?: string): string | null {
  try {
    if (value === undefined) return localStorage.getItem(key);
    localStorage.setItem(key, value);
  } catch {
    return null;
  }
  return null;
}
function setSide(panel: string | null, remember: boolean): void {
  if (
    (panel !== null && !['inspector', 'code', 'complexity', 'reference'].includes(panel)) ||
    (panel === 'code' && !anyCode()) ||
    (panel === 'complexity' && !anyComplexity()) ||
    (panel === 'reference' && !SPEC.reference)
  )
    panel = 'inspector';
  if (
    panel === null &&
    ($('mp-side').contains(document.activeElement) || document.activeElement === $('mp-divider'))
  )
    $('mp-side-toggle').focus();
  sidePanel = panel;
  $('mp-side').hidden = !(panel ?? '');
  $('mp-divider').hidden = !(panel ?? '');
  $('mp-work').classList.toggle('with-side', !!(panel ?? ''));
  element('mp-side-toggle', HTMLButtonElement).setAttribute(
    'aria-pressed',
    String(!!(panel ?? '')),
  );
  element('mp-side-toggle', HTMLButtonElement).textContent =
    (panel ?? '') ? 'Panel ▾' : 'Inspector ▸';
  document.querySelectorAll<HTMLButtonElement>('.mp-side-tabs [data-panel]').forEach((b) => {
    const selected = b.dataset.panel === panel;
    b.setAttribute('aria-selected', String(selected));
    b.tabIndex = selected ? 0 : -1;
  });
  $('mp-panel-inspector').hidden = panel !== 'inspector';
  $('mp-panel-code').hidden = panel !== 'code';
  $('mp-panel-complexity').hidden = panel !== 'complexity';
  $('mp-panel-reference').hidden = panel !== 'reference';
  if (remember) {
    pref('motionlab.panel', (panel ?? '') || 'none');
    if (panel !== null && panel !== '') pref('motionlab.lastPanel', panel);
  }
  currentBeat = -1;
  if (A) draw();
}

/* ---------- Controls ---------- */
function buildControls(): void {
  $('mp-title').textContent = SPEC.title;
  $('mp-subtitle').textContent = (SPEC.subtitle ?? '') || '';
  document.title = SPEC.title;
  const home = element('mp-home', HTMLAnchorElement);
  home.href =
    location.protocol === 'file:'
      ? 'https://motion-lab-alpha-three.vercel.app/#examples'
      : '/#examples';
  const from = params.get('from');
  if (from !== null && location.protocol !== 'file:') {
    try {
      const destination = new URL(from, location.origin);
      if (destination.origin === location.origin)
        home.href = destination.pathname + destination.search + destination.hash;
    } catch {
      // Invalid return links fall back to the gallery.
    }
  }
  const vt = $('mp-variants');
  vt.textContent = '';
  const visible = visibleVariants();
  visible.forEach(([v, i]) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'mp-tab';
    b.textContent = v.label;
    b.dataset.index = String(i);
    b.setAttribute('aria-pressed', String(i === variantIndex));
    b.addEventListener('click', () => {
      variantIndex = i;
      activeEdge = null;
      if (compareIndex === i) compareIndex = required(visible.find(([, j]) => j !== i))[1];
      syncTabs();
      pause();
      load();
      emit('variant');
    });
    vt.appendChild(b);
  });
  element('mp-compare', HTMLButtonElement).hidden = visible.length < 2;
  element('mp-compare', HTMLButtonElement).addEventListener('click', toggleCompare);
  wireCompareControls();
  if (SPEC.simulation && SPEC.simulation.params.length > 0) {
    const form = $('mp-params');
    form.hidden = false;
    form.textContent = '';
    for (const prm of SPEC.simulation.params) {
      paramValues[prm.id] = prm.default;
      const label = document.createElement('label');
      label.textContent = prm.label;
      let input;
      if (prm.type === 'select') {
        input = document.createElement('select');
        for (const o of required(prm.options)) {
          const op = document.createElement('option');
          op.value = o.value;
          op.textContent = o.label;
          input.appendChild(op);
        }
      } else if (prm.type === 'code') {
        input = document.createElement('textarea');
        input.rows = (prm.rows ?? 0) || 8;
        input.spellcheck = false;
        label.classList.add('wide');
      } else if (prm.type === 'range') {
        input = document.createElement('input');
        input.type = 'range';
        input.min = String(prm.min ?? 0);
        input.max = String(prm.max ?? 100);
        input.step = String(prm.step ?? 1);
      } else {
        input = document.createElement('input');
        input.type = 'text';
        input.size = prm.type === 'numbers' || prm.type === 'tree' || prm.type === 'list' ? 28 : 4;
      }
      input.id = `mp-param-${prm.id}`;
      const error = document.createElement('span');
      error.className = 'mp-input-error';
      error.setAttribute('role', 'alert');
      error.id = `mp-error-${prm.id}`;
      input.setAttribute('aria-describedby', error.id);
      if (input instanceof HTMLInputElement || input instanceof HTMLTextAreaElement)
        input.maxLength = prm.type === 'code' ? 4000 : 512;
      const commit = (): void => {
        const previous = clone(paramValues);
        const previousEdge = activeEdge;
        try {
          const val = parseInput(prm, input.value);
          paramValues[prm.id] = val;
          activeEdge = null;
          syncEdges();
          pause();
          load();
          error.textContent = '';
          input.removeAttribute('aria-invalid');
          input.setCustomValidity('');
          emit('input');
        } catch (e) {
          paramValues = previous;
          activeEdge = previousEdge;
          syncEdges();
          pause();
          load();
          error.textContent = errorMessage(e);
          input.setAttribute('aria-invalid', 'true');
          input.setCustomValidity(errorMessage(e));
        }
      };
      input.addEventListener(prm.type === 'range' ? 'input' : 'change', commit);
      if (prm.type === 'code')
        input.addEventListener('keydown', (e) => {
          if (!(e instanceof KeyboardEvent)) return;
          if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
            e.preventDefault();
            commit();
          }
        });
      if (input instanceof HTMLSelectElement) {
        const wrapper = document.createElement('span');
        wrapper.className = 'mp-select';
        wrapper.appendChild(input);
        label.appendChild(wrapper);
      } else label.appendChild(input);
      if (prm.type === 'code') {
        const run = document.createElement('button');
        run.type = 'button';
        run.className = 'mp-run';
        run.textContent = 'Run ▶';
        run.title = 'Run this program (Cmd+Enter)';
        run.addEventListener('click', commit);
        label.appendChild(run);
      }
      label.appendChild(error);
      form.appendChild(label);
    }
    const hint = document.createElement('div');
    hint.className = 'mp-hint';
    hint.textContent =
      (SPEC.simulation.hint ?? '') || 'Change an input: the whole animation is recomputed from it.';
    form.appendChild(hint);
    form.addEventListener('submit', (e) => e.preventDefault());
    syncInputs();
  }
  if (SPEC.edgeCases.length) {
    const edgeList = $('mp-edges');
    edgeList.hidden = false;
    SPEC.edgeCases.forEach((ec, n) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'mp-edge';
      b.textContent = ec.label;
      b.dataset.edge = String(n);
      b.setAttribute('aria-pressed', 'false');
      b.title = ec.why || '';
      b.addEventListener('click', () => applyEdge(n));
      edgeList.appendChild(b);
    });
  }
  renderCode();
  renderComplexity();
  renderReference();
  required(document.querySelector<HTMLButtonElement>('.mp-side-tabs [data-panel="code"]')).hidden =
    !anyCode();
  required(
    document.querySelector<HTMLButtonElement>('.mp-side-tabs [data-panel="complexity"]'),
  ).hidden = !anyComplexity();
  required(
    document.querySelector<HTMLButtonElement>('.mp-side-tabs [data-panel="reference"]'),
  ).hidden = !SPEC.reference;
  document.querySelectorAll<HTMLButtonElement>('.mp-side-tabs [data-panel]').forEach((b) => {
    b.addEventListener('click', () => setSide(b.dataset.panel ?? null, true));
    b.addEventListener('keydown', (e) => {
      if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) return;
      e.preventDefault();
      e.stopPropagation();
      const tabs = [
        ...document.querySelectorAll<HTMLButtonElement>('.mp-side-tabs [data-panel]'),
      ].filter((tab) => tab.hidden === false);
      const index = tabs.indexOf(b);
      const next =
        e.key === 'Home'
          ? 0
          : e.key === 'End'
            ? tabs.length - 1
            : (index + (e.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
      const tab = required(tabs[next]);
      setSide(tab.dataset.panel ?? null, true);
      tab.focus();
    });
  });
  element('mp-side-close', HTMLButtonElement).addEventListener('click', () => setSide(null, true));
  element('mp-side-toggle', HTMLButtonElement).addEventListener('click', () =>
    setSide((sidePanel ?? '') ? null : (pref('motionlab.lastPanel') ?? '') || 'inspector', true),
  );
  const work = $('mp-work');
  const divider = $('mp-divider');
  const setWidth = (px: number, remember: boolean): void => {
    const w = clamp(Math.round(px), 280, Math.max(320, work.clientWidth - 420));
    work.style.setProperty('--side-w', `${w}px`);
    divider.setAttribute('aria-valuenow', String(w));
    if (remember) pref('motionlab.sideWidth', String(w));
  };
  const savedW = Number(pref('motionlab.sideWidth'));
  if (savedW) setWidth(savedW, false);
  divider.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    divider.setPointerCapture(e.pointerId);
    divider.classList.add('dragging');
    const move = (ev: PointerEvent): void =>
      setWidth(work.getBoundingClientRect().right - ev.clientX, false);
    const up = (ev: PointerEvent): void => {
      divider.classList.remove('dragging');
      divider.removeEventListener('pointermove', move);
      divider.removeEventListener('pointerup', up);
      setWidth(work.getBoundingClientRect().right - ev.clientX, true);
    };
    divider.addEventListener('pointermove', move);
    divider.addEventListener('pointerup', up);
  });
  divider.addEventListener('keydown', (e) => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    e.preventDefault();
    e.stopPropagation();
    setWidth($('mp-side').getBoundingClientRect().width + (e.key === 'ArrowLeft' ? 24 : -24), true);
  });
  const saved = pref('motionlab.panel');
  const fallback = SPEC.defaultPanel === undefined ? 'inspector' : SPEC.defaultPanel;
  let want =
    (params.get('panel') ?? '') ||
    ((saved ?? '') && saved !== 'none' ? saved : saved === 'none' ? null : fallback);
  if (want === 'none') want = null;
  setSidePending =
    (want ?? '') &&
    (want !== 'code' || anyCode()) &&
    (want !== 'complexity' || anyComplexity()) &&
    (want !== 'reference' || SPEC.reference)
      ? want
      : (want ?? '')
        ? 'inspector'
        : null;
  element('mp-bigplay', HTMLButtonElement).addEventListener('click', play);
  element('mp-play', HTMLButtonElement).addEventListener('click', () =>
    playing ? pause() : play(),
  );
  element('mp-prev', HTMLButtonElement).addEventListener('click', () => chapter(-1));
  element('mp-next', HTMLButtonElement).addEventListener('click', () => chapter(1));
  element('mp-reveal', HTMLButtonElement).addEventListener('click', () => {
    $('mp-predict-a').hidden = false;
    emit('reveal');
  });
  element('mp-continue', HTMLButtonElement).addEventListener('click', () => {
    t += 1;
    play();
  });
  element('mp-camera', HTMLInputElement).addEventListener('change', () => {
    pref('motionlab.camera', element('mp-camera', HTMLInputElement).checked ? '1' : '0');
    draw();
  });
  if (
    pref('motionlab.camera') === '0' ||
    (SPEC.camera === false && pref('motionlab.camera') !== '1')
  )
    element('mp-camera', HTMLInputElement).checked = false;
  scrub.addEventListener('input', () => {
    pause();
    seek(Number(scrub.value));
  });
  scrub.addEventListener('change', () => emit('scrub'));
  document.querySelectorAll<HTMLButtonElement>('[data-speed]').forEach((b) =>
    b.addEventListener('click', () => {
      speed = Number(b.dataset.speed);
      document
        .querySelectorAll<HTMLButtonElement>('[data-speed]')
        .forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
      emit('speed');
    }),
  );
  const themeBtn = element('mp-theme', HTMLButtonElement);
  const order = ['system', 'light', 'dark'];
  const curTheme = (): string => document.documentElement.dataset.theme ?? 'system';
  const showTheme = (mode: string): void => {
    themeBtn.innerHTML = THEME_ICONS[mode] ?? required(THEME_ICONS.system);
    themeBtn.setAttribute('aria-label', `${THEME_NAMES[mode]}. Click to change.`);
    themeBtn.title = THEME_NAMES[mode] ?? required(THEME_NAMES.system);
  };
  showTheme(curTheme());
  themeBtn.addEventListener('click', () => {
    const next = required(order[(order.indexOf(curTheme()) + 1) % 3]);
    if (next === 'system') delete document.documentElement.dataset.theme;
    else document.documentElement.dataset.theme = next;
    pref('motionlab.theme', next);
    showTheme(next);
  });
  document.addEventListener('keydown', (e) => {
    const tg = e.target instanceof HTMLElement ? e.target : null;
    if (
      tg &&
      (['INPUT', 'SELECT', 'TEXTAREA'].includes(tg.tagName) ||
        (tg.tagName === 'BUTTON' && (e.key === ' ' || e.key === 'Enter')) ||
        tg.id === 'mp-divider' ||
        tg.id === 'mp-cmp-divider')
    )
      return;
    if (e.key === ' ') {
      e.preventDefault();
      playing ? pause() : play();
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      chapter(1);
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      chapter(-1);
    } else if (e.key === 'Home') {
      e.preventDefault();
      pause();
      seek(0);
    } else if (e.key === 'End') {
      e.preventDefault();
      pause();
      seek(total());
    } else if (
      (e.key === 'c' || e.key === 'C') &&
      element('mp-compare', HTMLButtonElement).hidden === false
    )
      toggleCompare();
    else if (e.key === 'i' || e.key === 'I')
      setSide(sidePanel === 'inspector' ? null : 'inspector', true);
  });
}
let setSidePending: string | null = null;
let panelBeforeCompare: string | null = null;
let beforeEdge: { variantIndex: number; compareIndex: number; params: Params } | null = null;
function setMax(on: boolean): void {
  $('mp-main').classList.toggle('max', on);
  element('mp-maximize', HTMLButtonElement).setAttribute('aria-pressed', String(on));
  element('mp-maximize', HTMLButtonElement).textContent = on ? '⤡ Exit (Esc)' : '⤢ Maximize';
  if (on) $('mp-main').prepend(element('mp-maximize', HTMLButtonElement));
  else element('mp-compare', HTMLButtonElement).after(element('mp-maximize', HTMLButtonElement));
}
function setSplit(pct: number, remember: boolean): void {
  const v = clamp(Math.round(pct), 25, 75);
  $('mp-stages').style.setProperty('--cmp-a', `${v}fr`);
  $('mp-stages').style.setProperty('--cmp-b', `${100 - v}fr`);
  $('mp-cmp-divider').setAttribute('aria-valuenow', String(v));
  if (remember) pref('motionlab.compareSplit', String(v));
}
function wireCompareControls(): void {
  const saved = Number(pref('motionlab.compareSplit'));
  setSplit(saved || 50, false);
  const dv = $('mp-cmp-divider');
  const comparison = $('mp-stages');
  const at = (x: number): number => {
    const r = comparison.getBoundingClientRect();
    return ((x - r.left) / r.width) * 100;
  };
  dv.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    dv.setPointerCapture(e.pointerId);
    dv.classList.add('dragging');
    const move = (ev: PointerEvent): void => setSplit(at(ev.clientX), false);
    const up = (ev: PointerEvent): void => {
      dv.classList.remove('dragging');
      dv.removeEventListener('pointermove', move);
      dv.removeEventListener('pointerup', up);
      setSplit(at(ev.clientX), true);
    };
    dv.addEventListener('pointermove', move);
    dv.addEventListener('pointerup', up);
  });
  dv.addEventListener('keydown', (e) => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    e.preventDefault();
    e.stopPropagation();
    const cur = Number(dv.getAttribute('aria-valuenow')) || 50;
    setSplit(cur + (e.key === 'ArrowLeft' ? -5 : 5), true);
  });
  element('mp-maximize', HTMLButtonElement).addEventListener('click', () =>
    setMax(!$('mp-main').classList.contains('max')),
  );
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && $('mp-main').classList.contains('max')) setMax(false);
  });
}
function syncTabs(): void {
  document
    .querySelectorAll<HTMLButtonElement>('.mp-tab')
    .forEach((x) =>
      x.setAttribute('aria-pressed', String(Number(x.dataset.index) === variantIndex)),
    );
  element('mp-compare', HTMLButtonElement).setAttribute('aria-pressed', String(compareIndex >= 0));
}
function syncInputs(): void {
  for (const prm of SPEC.simulation?.params ?? []) {
    const input = control(`mp-param-${prm.id}`);
    const value = paramValues[prm.id];
    input.value = Array.isArray(value)
      ? value.map((item: unknown) => (item === null ? 'null' : String(item))).join(', ')
      : String(value);
  }
}
function syncEdges(): void {
  document
    .querySelectorAll<HTMLButtonElement>('.mp-edge')
    .forEach((b) =>
      b.setAttribute('aria-pressed', String(activeEdge === SPEC.edgeCases[Number(b.dataset.edge)])),
    );
}
function clearEdge(): void {
  activeEdge = null;
  if (beforeEdge) {
    variantIndex = beforeEdge.variantIndex;
    compareIndex = beforeEdge.compareIndex;
    paramValues = beforeEdge.params;
    beforeEdge = null;
  }
  syncTabs();
  syncInputs();
  syncEdges();
  pause();
  load();
  emit('edge-off');
}
function toggleCompare(): void {
  const visible = visibleVariants();
  compareIndex =
    compareIndex >= 0 ? -1 : (visible.find(([, i]) => i !== variantIndex) || [null, -1])[1];
  syncTabs();
  pause();
  load();
  emit('compare');
}
function applyEdge(n: number): void {
  const ec = required(SPEC.edgeCases[n]);
  if (activeEdge === ec) {
    clearEdge();
    return;
  }
  if (!activeEdge) beforeEdge = { variantIndex, compareIndex, params: clone(paramValues) };
  const declared = new Set((SPEC.simulation?.params ?? []).map((x) => x.id));
  if (ec.params)
    for (const [k, val] of Object.entries(ec.params)) if (declared.has(k)) paramValues[k] = val;
  if (ec.variant !== undefined) variantIndex = ec.variant;
  compareIndex = -1;
  activeEdge = ec;
  syncTabs();
  syncInputs();
  syncEdges();
  pause();
  load();
  emit('edge', { edge: ec.label });
}

/* ---------- Self-check (headless QA) ---------- */
function qa(): void {
  const started = performance.now();
  const issues: string[] = [];
  const seen = new Set();
  let frames = 0;
  const scenes = [];
  const once = (key: string, msg: string): void => {
    if (!seen.has(key)) {
      seen.add(key);
      issues.push(msg);
    }
  };
  for (let cv = 0; cv < Math.max(1, variants.length); cv += 1) {
    variantIndex = cv;
    sceneCode =
      SPEC.simulation && SPEC.simulation.sceneCode === true ? sceneFor(cv).code || null : null;
    const CODE = curCode();
    if (!CODE) continue;
    renderCode();
    const body = $('mp-code-body');
    const visible = body.textContent;
    for (const bad of ['class=', '&gt;', '&lt;', '&amp;', '<span'])
      if (visible.includes(bad)) issues.push(`code panel shows markup as text: ${bad}`);
    if (
      CODE.lines.some((l) => /[A-Za-z0-9'"]/.test(l)) &&
      body.querySelectorAll('[class^="tok-"]').length === 0
    )
      issues.push(`variant ${cv}: code panel has no syntax highlighting`);
    const shown = body.querySelectorAll('.ln');
    if (shown.length !== CODE.lines.length)
      issues.push(`variant ${cv}: code panel shows ${shown.length} of ${CODE.lines.length} lines`);
    shown.forEach((ln, i) => {
      const text = required(ln.querySelector('.src')).textContent;
      const want = (CODE.lines[i] ?? '') || ' ';
      if (text !== want)
        issues.push(`variant ${cv}: code line ${i + 1} renders as ${JSON.stringify(text)}`);
    });
  }
  variantIndex = 0;
  if (SPEC.version === 3 && SPEC.edgeCases.length < 2)
    issues.push('a v3 lesson needs at least 2 edge-case presets');
  const runs: { v: number; ps: Params; tag: string; edge?: EdgeCase }[] = [];
  const nv = Math.max(1, variants.length);
  for (let v = 0; v < nv; v += 1) runs.push({ v, ps: {}, tag: `variant ${v}` });
  for (const ps of (SPEC.simulation && SPEC.simulation.qaParams) || [])
    runs.push({ v: 0, ps, tag: `input ${JSON.stringify(ps)}` });
  SPEC.edgeCases.forEach((ec) =>
    runs.push({ v: ec.variant ?? 0, ps: ec.params ?? {}, tag: `edge "${ec.label}"`, edge: ec }),
  );
  const svg = element('mp-stage-a', SVGSVGElement);
  for (const run of runs) {
    activeEdge = run.edge || null;
    paramValues = {};
    for (const prm of SPEC.simulation?.params ?? []) paramValues[prm.id] = prm.default;
    Object.assign(paramValues, run.ps);
    let stage;
    try {
      stage = new Stage(svg, sceneFor(run.v));
    } catch (err) {
      issues.push(`${run.tag}: scene failed: ${errorMessage(err)}`);
      continue;
    }
    const sc = stage.scene;
    if (run.edge && !run.edge.why) issues.push(`${run.tag}: edge case needs a "why"`);
    scenes.push({ tag: run.tag, beats: sc.beats.length, ms: Math.round(stage.total) });
    const ids = new Set(sc.actors.map((a) => a.id));
    const linkIds = new Set((sc.links || []).map((l) => l.id));
    const tokenIds = new Set((sc.tokens || []).map((x) => x.id));
    if (!sc.beats.length) issues.push(`${run.tag}: no beats`);
    sc.beats.forEach((b, i) => {
      if (!b.title) issues.push(`${run.tag}: beat ${i + 1} has no title`);
      for (const a of b.actions) {
        if ('actor' in a && a.actor !== undefined && !ids.has(a.actor))
          issues.push(`${run.tag}: beat ${i + 1} ${a.do} → unknown actor ${a.actor}`);
        if ('link' in a && a.link !== undefined && !linkIds.has(a.link))
          issues.push(`${run.tag}: beat ${i + 1} ${a.do} → unknown link ${a.link}`);
        if ('token' in a && a.token !== undefined && !tokenIds.has(a.token))
          issues.push(`${run.tag}: beat ${i + 1} ${a.do} → unknown token ${a.token}`);
      }
    });
    if (issues.length) continue;
    const boxes = sc.actors
      .filter((a) => a.kind === 'box' || a.kind === 'store' || a.kind === 'circle')
      .map((a) => ({ id: a.id, ...box(a) }));
    for (const b of boxes)
      if (b.x < 0 || b.y < 0 || b.x + b.w > W || b.y + b.h > H)
        once(`${run.tag}out${b.id}`, `${run.tag}: ${b.id} is outside the stage`);
    for (let i = 0; i < boxes.length; i += 1)
      for (let j = i + 1; j < boxes.length; j += 1) {
        const p = required(boxes[i]);
        const q = required(boxes[j]);
        if (p.x < q.x + q.w && q.x < p.x + p.w && p.y < q.y + q.h && q.y < p.y + p.h)
          once(`${run.tag}ov${p.id}${q.id}`, `${run.tag}: ${p.id} overlaps ${q.id}`);
      }
    for (const l of sc.links || []) {
      for (let k = 2; k <= 28; k += 1) {
        const pt = stage.pointAt(l.id, k / 30);
        const hit = boxes.find(
          (b) =>
            b.id !== l.from &&
            b.id !== l.to &&
            pt.x > b.x + 2 &&
            pt.x < b.x + b.w - 2 &&
            pt.y > b.y + 2 &&
            pt.y < b.y + b.h - 2,
        );
        if (hit) {
          once(`${run.tag}cross${l.id}`, `${run.tag}: link ${l.id} runs through ${hit.id}`);
          break;
        }
      }
    }
    for (let ms = 0; ms <= stage.total; ms += 40) {
      const { st } = stage.stateAt(ms);
      stage.render(st, ms, true);
      frames += 1;
      const c = stage.cam;
      if (c.x < -0.5 || c.y < -0.5 || c.x + c.w > W + 0.5 || c.y + c.h > H + 0.5)
        once(`${run.tag}cam`, `${run.tag}: camera leaves the stage at ${ms}ms`);
      for (const [id, rec] of Object.entries(stage.els.tokens)) {
        const s = required(st.tokens[id]);
        if (s.moving && !s.label.trim())
          once(`${run.tag}empty${id}`, `${run.tag}: moving packet ${id} needs a payload label`);
        if (s.visible && /[A-Za-z0-9]/.test(s.label) && rec.lbl.textContent !== s.label)
          once(
            `${run.tag}lbl${id}`,
            `${run.tag}: packet ${id} label renders as ${JSON.stringify(rec.lbl.textContent)}`,
          );
        if (!s.visible || !rec._pt) continue;
        const { x, y } = rec._pt;
        if (!Number.isFinite(x) || !Number.isFinite(y))
          once(`${run.tag}pos${id}`, `${run.tag}: packet ${id} has no position (${ms}ms)`);
        else if (x - rec._w / 2 < -40 || y < -10 || x + rec._w / 2 > W + 40 || y > H + 10)
          once(`${run.tag}oob${id}`, `${run.tag}: packet ${id} leaves the stage (${ms}ms)`);
      }
      for (const [id, rec] of Object.entries(stage.els.actors)) {
        const a = required(stage.byId[id]);
        if (a.kind === 'cells') {
          const labels = Object.values(rec.ptrs ?? {})
            .filter((p) => p.g.getAttribute('opacity') === '1')
            .map((p) => {
              const bb = p.text.getBBox();
              return { x: p.x + bb.x, y: bb.y, w: bb.width, h: bb.height, id: p.text.textContent };
            });
          for (let i2 = 0; i2 < labels.length; i2 += 1)
            for (let j2 = i2 + 1; j2 < labels.length; j2 += 1) {
              const p = required(labels[i2]);
              const q = required(labels[j2]);
              if (p.x < q.x + q.w && q.x < p.x + p.w && p.y < q.y + q.h && q.y < p.y + p.h)
                once(
                  `${run.tag}ptr${p.id}${q.id}`,
                  `${run.tag}: pointer labels ${p.id} and ${q.id} overlap (${ms}ms)`,
                );
            }
          continue;
        }
        if (
          (a.labelCode === true || a.small === true) &&
          a.kind !== 'store' &&
          rec.label &&
          /[A-Za-z0-9]{2,}/.test(rec.label.textContent) &&
          !rec.label.querySelector('[class^="tok-"]')
        )
          once(
            `${run.tag}hl${id}`,
            `${run.tag}: code in ${id} ("${rec.label.textContent}") has no syntax highlighting`,
          );
        if (rec.label && (a.kind === 'box' || a.kind === 'store') && rec.label.textContent) {
          const bb = rec.label.getBBox();
          if (bb.width > a.w - 8)
            once(`${run.tag}lw${id}`, `${run.tag}: label of ${id} is wider than its box (${ms}ms)`);
        }
        if (rec.value && 'w' in a && rec.value.textContent) {
          const bb = rec.value.getBBox();
          if (bb.width > a.w - 8)
            once(`${run.tag}vw${id}`, `${run.tag}: value of ${id} is wider than its box (${ms}ms)`);
        }
        if (rec.rows && a.kind === 'store') {
          const bb = rec.rows.getBBox();
          if (bb.height && bb.y + bb.height > a.y + a.h / 2 + 1)
            once(`${run.tag}ro${id}`, `${run.tag}: rows overflow ${id} (${ms}ms)`);
          for (const row of rec.rows.querySelectorAll<SVGTextElement>('.s-row')) {
            const bounds = row.getBBox();
            if (bounds.width > a.w - 36)
              once(`${run.tag}rw${id}`, `${run.tag}: row text overflows ${id} (${ms}ms)`);
          }
        }
      }
    }
    const probe = Math.round(stage.total * 0.63);
    const s1 = JSON.stringify(stage.stateAt(probe).st);
    stage.stateAt(stage.total);
    stage.stateAt(10);
    if (JSON.stringify(stage.stateAt(probe).st) !== s1)
      issues.push(`${run.tag}: scrubbing is not deterministic`);
  }
  // Contrast in the active theme: main text, muted text, code tokens and badges against their surfaces.
  const rgb = (css: string): [number, number, number] => {
    const c = document.createElement('canvas').getContext('2d');
    required(c).fillStyle = '#000';
    required(c).fillStyle = css;
    required(c).fillRect(0, 0, 1, 1);
    const d = required(c).getImageData(0, 0, 1, 1).data;
    return [required(d[0]), required(d[1]), required(d[2])];
  };
  const lum = ([r, g, b]: [number, number, number]): number => {
    const f = (v: number): number => {
      v /= 255;
      return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    };
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
  };
  const ratio = (x: string, y: string): number => {
    const a = lum(rgb(x));
    const b = lum(rgb(y));
    return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
  };
  const css = getComputedStyle(document.documentElement);
  const v = (n: string): string => css.getPropertyValue(n).trim();
  for (const [fg, bg, min] of [
    ['--text', '--surface', 7],
    ['--muted', '--surface', 4.5],
    ['--faint', '--bg', 3],
    ['--tok-keyword', '--surface', 3],
    ['--tok-string', '--surface', 3],
    ['--tok-number', '--surface', 3],
    ['--tok-function', '--surface', 3],
    ['--amber', '--surface', 3],
    ['--blue', '--surface', 3],
    ['--on-accent', '--blue', 3.5],
  ] as const) {
    const r = ratio(v(fg), v(bg));
    if (r < min)
      issues.push(
        `contrast ${fg} on ${bg} is ${r.toFixed(2)} (< ${min}) in ${(document.documentElement.dataset.theme ?? '') || 'system'} theme`,
      );
  }
  // The code highlight must follow every chapter, and prose with numbers or quotes must be highlighted.
  for (let cv = 0; cv < Math.max(1, variants.length); cv += 1) {
    if (variants[cv] && variants[cv]?.hidden === true) continue;
    variantIndex = cv;
    activeEdge = null;
    paramValues = {};
    if (SPEC.simulation)
      for (const prm of SPEC.simulation.params) paramValues[prm.id] = prm.default;
    if (!curCode()) continue;
    load();
    setSide('code', false);
    for (let i = 0; i < activeStage().scene.beats.length; i += 1) {
      seek(required(activeStage().starts[i]) + 5);
      if (!$('mp-code-body').querySelector('.ln.on')) {
        issues.push(`variant ${cv}: chapter ${i + 1} highlights no code line`);
        break;
      }
      const txt = required(activeStage().scene.beats[i]).text || '';
      if (/\b\d+\b|"/.test(txt) && !$('mp-cap-text').querySelector('[class^="tok-"]')) {
        issues.push(
          `variant ${cv}: chapter ${i + 1} caption has numbers or quotes but no highlighting`,
        );
        break;
      }
    }
  }
  variantIndex = 0;
  // v3 features must be wired: inspector, compare (when 2+ scenarios), theme toggle, edge chips.
  variantIndex = 0;
  activeEdge = null;
  paramValues = {};
  if (SPEC.simulation) for (const prm of SPEC.simulation.params) paramValues[prm.id] = prm.default;
  load();
  setSide('inspector', false);
  seek(Math.round(total() * 0.5));
  // Presentation must not imply that execution continues when playback is paused.
  const styledLink = svg.querySelector('.s-link');
  if (styledLink) {
    styledLink.classList.add('active');
    if (getComputedStyle(styledLink).animationName !== 'none')
      issues.push('a paused connector still animates');
    styledLink.classList.remove('active');
  }
  const edgeLabel = svg.querySelector('.s-link-label');
  if (edgeLabel) {
    const edgeStyle = getComputedStyle(edgeLabel);
    // Chrome serializes stroke-before-fill as "stroke", omitting default fill.
    if (
      !edgeStyle.paintOrder.startsWith('stroke') ||
      !(parseFloat(edgeStyle.strokeWidth) > 0) ||
      edgeStyle.stroke === 'none'
    ) {
      issues.push('connector label has no opaque halo');
    }
  }
  if (ratio(v('--dd-muted'), v('--dd-paper')) < 4.5)
    issues.push('diagram secondary text contrast is below 4.5');
  if ($('mp-panel-inspector').querySelectorAll('.mp-kv').length === 0)
    issues.push('inspector shows no state');
  if (visibleVariants().length >= 2) {
    toggleCompare();
    seek(Math.round(total() * 0.5));
    if ($('mp-wrap-b').hidden !== false || !B)
      issues.push('compare mode did not open a second stage');
    if ($('mp-side').hidden === false) issues.push('compare mode kept the side panel open');
    const wa = $('mp-wrap-a').getBoundingClientRect().width;
    const wb = $('mp-wrap-b').getBoundingClientRect().width;
    const wm = $('mp-work').getBoundingClientRect().width;
    if (wa < wm * 0.4 || wb < wm * 0.4)
      issues.push(
        `compare panes too small: ${Math.round(wa)} and ${Math.round(wb)} px of ${Math.round(wm)}`,
      );
    setMax(true);
    if (getComputedStyle($('mp-main')).position !== 'fixed')
      issues.push('maximize did not fill the window');
    setMax(false);
    toggleCompare();
    if ($('mp-side').hidden !== false) issues.push('side panel was not restored after compare');
  }
  if (
    SPEC.edgeCases.length &&
    document.querySelectorAll<HTMLButtonElement>('.mp-edge').length !== SPEC.edgeCases.length
  )
    issues.push('edge-case chips missing');
  // Every edge preset must change what is shown, and the inputs must display exactly the preset values.
  const sig = (): string => JSON.stringify(activeStage().scene.beats.map((b) => [b.title, b.text]));
  variantIndex = 0;
  compareIndex = -1;
  activeEdge = null;
  paramValues = {};
  if (SPEC.simulation) for (const prm of SPEC.simulation.params) paramValues[prm.id] = prm.default;
  load();
  const baseline = sig();
  beforeEdge = null;
  if (SPEC.edgeCases.length) {
    applyEdge(0);
    applyEdge(0);
    if (activeEdge !== null || sig() !== baseline)
      issues.push('clicking an active edge case again does not deselect it');
  }
  SPEC.edgeCases.forEach((ec, n) => {
    activeEdge = null;
    beforeEdge = null;
    applyEdge(n);
    if ($('mp-badge-a').hidden !== false) issues.push(`edge "${ec.label}": badge not shown`);
    if (sig() === baseline)
      issues.push(
        `edge "${ec.label}": the scene is identical to the default, so the preset changes nothing visible`,
      );
    for (const [k, val] of Object.entries(ec.params || {})) {
      const inp = control(`mp-param-${k}`);
      const shown = inp.value;
      const want = Array.isArray(val)
        ? val.map((x: unknown) => (x === null ? 'null' : String(x))).join(', ')
        : String(val);
      if (shown !== want)
        issues.push(
          `edge "${ec.label}": input ${k} shows ${JSON.stringify(shown)} instead of ${JSON.stringify(want)}`,
        );
      if (JSON.stringify(paramValues[k]) !== JSON.stringify(val))
        issues.push(
          `edge "${ec.label}": input ${k} was clamped to ${JSON.stringify(paramValues[k])}`,
        );
    }
  });
  const report = {
    status: issues.length ? 'failed' : 'ok',
    scenes,
    frames,
    issues: [...new Set(issues)].slice(0, 40),
    qa_ms: Math.round(performance.now() - started),
  };
  const out = document.createElement('script');
  out.id = 'motion-qa-report';
  out.type = 'application/json';
  out.textContent = JSON.stringify(report);
  document.body.appendChild(out);
}

if (params.has('variant')) variantIndex = Number(params.get('variant')) || 0;
buildControls();
if (QA) {
  qa();
} else {
  if (params.has('compare') && visibleVariants().length >= 2)
    compareIndex = (visibleVariants().find(([, i]) => i !== variantIndex) || [null, -1])[1];
  if (params.has('edge')) {
    applyEdge(Number(params.get('edge')));
  } else {
    syncTabs();
    load();
  }
  if (compareIndex >= 0) panelBeforeCompare = setSidePending;
  else setSide(setSidePending, false);
  if (FRAME !== null) seek(FRAME);
  if (params.get('motion-bench') === '1') bench();
}
/* Benchmark (?motion-bench=1): the cost of one playback frame (state + render + side panel), sampled over the timeline. */
function bench(): void {
  setSide('inspector', false);
  const N = 300;
  const d: number[] = [];
  const T = total();
  for (let i = 0; i < N; i += 1) {
    const s0 = performance.now();
    t = (i / N) * T;
    draw();
    d.push(performance.now() - s0);
  }
  d.sort((x, y) => x - y);
  const q = (f: number): number => +required(d[Math.floor(f * (d.length - 1))]).toFixed(3);
  const out = document.createElement('script');
  out.id = 'motion-bench-report';
  out.type = 'application/json';
  out.textContent = JSON.stringify({
    frames: N,
    meanMs: +(d.reduce((x, y) => x + y, 0) / N).toFixed(3),
    p50: q(0.5),
    p95: q(0.95),
    max: q(1),
    nodes: document.getElementsByTagName('*').length,
  });
  document.body.appendChild(out);
}
