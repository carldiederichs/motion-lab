import type { Actor, Tone, Value } from './model.ts';
export interface Point {
  x: number;
  y: number;
}
export interface Box extends Point {
  w: number;
  h: number;
}
export interface ActorState {
  tone: Tone;
  value: Value;
  label: string | null;
  sub: string | null;
  text: string | null;
  rows: Value[];
  newRows: Value[];
  values: Value[];
  cellTones: Tone[];
  pointers: Record<string, number>;
  _rowAppear: { row: Value; k: number } | null;
}
export interface TokenState {
  visible: boolean;
  actor: string | null;
  link: string | null;
  pos: number;
  reverse: boolean;
  opacity: number;
  label: string;
  tone: Tone;
  dropped: boolean;
  moving: boolean;
}
export interface State {
  actors: Record<string, ActorState>;
  tokens: Record<string, TokenState>;
  links: Record<string, { active: boolean; tone: Tone }>;
  notes: { actor: string; text: string; tone: Tone; k: number }[];
  pulses: { actor: string; k: number }[];
}
export interface PointerView {
  g: SVGGElement;
  tri: SVGPathElement;
  text: SVGTextElement;
  side: 'above' | 'below';
  fixedLevel: number | undefined;
  x: number;
  level: number;
}
export interface ActorView {
  g: SVGGElement;
  text?: SVGTextElement;
  cells?: { r: SVGRectElement; tv: SVGTextElement }[];
  ptrs?: Record<string, PointerView>;
  shape?: SVGRectElement | SVGCircleElement;
  label?: SVGTextElement;
  value?: SVGTextElement;
  sub?: SVGTextElement;
  rows?: SVGGElement;
  _sig?: string;
}
export interface TokenView {
  g: SVGGElement;
  rect: SVGRectElement;
  lbl: SVGTextElement;
  x: SVGGElement;
  trail: SVGCircleElement[];
  _pt: Point | null;
  _w: number;
}
export interface SceneViews {
  actors: Record<string, ActorView>;
  links: Record<string, { path: SVGPathElement; len: number | null }>;
  tokens: Record<string, TokenView>;
  pulses: SVGGElement;
  notes: SVGGElement;
}
export interface Frame {
  st: State;
  i: number;
  p: number;
}
export type ActorIndex = Record<string, Actor>;

export interface InspectorRow {
  k: string;
  key: string;
  v?: string;
  rows?: Value[];
}
