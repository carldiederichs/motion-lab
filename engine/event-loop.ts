import { required } from './assert.ts';

type LexToken =
  { t: 'str' | 'id' | 'p'; v: string; line: number } | { t: 'num'; v: number; line: number };
export type Statement =
  | { kind: 'log'; text: string; line: number }
  | { kind: 'timeout'; body: Statement[]; delay: number; line: number }
  | { kind: 'micro'; body: Statement[]; line: number }
  | { kind: 'promise'; chain: { body: Statement[]; line: number }[]; line: number };
export interface Task {
  id: string;
  seq: number;
  kind: string;
  label: string;
  sub: string;
  body: Statement[];
  line: number;
  due: number;
  waitsOn: string | null;
}
export const regions = ['stack', 'webapis', 'pending', 'micro', 'macro'] as const;
export type Region = (typeof regions)[number];
export type Model = Record<Region, Task[]> & {
  console: string[];
  line: number | null;
  clock: number;
};
export interface EventOptions {
  title?: string;
  predict?: string;
  done?: boolean;
}
export type Snapshot = Model & { caption: string; opts: EventOptions };

function tokenize(src: string): LexToken[] {
  const toks: LexToken[] = [];
  let i = 0;
  let line = 1;
  while (i < src.length) {
    const c = required(src[i]);
    if (c === '\n') {
      line++;
      i++;
      continue;
    }
    if (/\s/.test(c)) {
      i++;
      continue;
    }
    if (c === '/' && src[i + 1] === '/') {
      while (i < src.length && src[i] !== '\n') i++;
      continue;
    }
    if (c === '"' || c === "'" || c === '`') {
      let j = i + 1;
      while (j < src.length && src[j] !== c) {
        if (src[j] === '\n') throw new Error(`Line ${line}: string is not closed`);
        j++;
      }
      if (j >= src.length) throw new Error(`Line ${line}: string is not closed`);
      toks.push({ t: 'str', v: src.slice(i + 1, j), line });
      i = j + 1;
      continue;
    }
    if (/[0-9]/.test(c)) {
      let j = i;
      while (j < src.length && /[0-9]/.test(required(src[j]))) j++;
      toks.push({ t: 'num', v: Number(src.slice(i, j)), line });
      i = j;
      continue;
    }
    if (/[A-Za-z_$]/.test(c)) {
      let j = i;
      while (j < src.length && /[A-Za-z0-9_$]/.test(required(src[j]))) j++;
      toks.push({ t: 'id', v: src.slice(i, j), line });
      i = j;
      continue;
    }
    if (src.startsWith('=>', i)) {
      toks.push({ t: 'p', v: '=>', line });
      i += 2;
      continue;
    }
    if ('(){};,.'.includes(c)) {
      toks.push({ t: 'p', v: c, line });
      i++;
      continue;
    }
    throw new Error(`Line ${line}: unexpected "${c}"`);
  }
  return toks;
}

const SUPPORTED =
  'Supported: console.log("x"), setTimeout(() => ..., ms), queueMicrotask(() => ...), Promise.resolve().then(() => ...).then(...)';

export function parse(src: string): Statement[] {
  const toks = tokenize(src);
  let pos = 0;
  const peek = (): LexToken | undefined => toks[pos];
  const lineOf = (): number => toks[pos]?.line ?? toks.at(-1)?.line ?? 1;
  const next = (): LexToken | undefined => toks[pos++];
  const expect = (v: string): LexToken => {
    const tk = next();
    if (!tk || tk.v !== v)
      throw new Error(
        `Line ${tk ? tk.line : lineOf()}: expected "${v}"${tk ? ` but found "${tk.v}"` : ''}`,
      );
    return tk;
  };
  const accept = (v: string): boolean => {
    if (peek()?.v === v) {
      pos++;
      return true;
    }
    return false;
  };

  function statements(end: string | null): Statement[] {
    const list = [];
    while (pos < toks.length && !(end !== null && peek()?.v === end)) {
      if (accept(';')) continue;
      list.push(statement());
    }
    return list;
  }

  function fn(): Statement[] {
    if (accept('function')) {
      expect('(');
      expect(')');
      expect('{');
      const body = statements('}');
      expect('}');
      return body;
    }
    expect('(');
    expect(')');
    expect('=>');
    if (accept('{')) {
      const body = statements('}');
      expect('}');
      return body;
    }
    return [statement()];
  }

  function logCall(line: number): Statement {
    expect('(');
    const tk = next();
    if (!tk || tk.t !== 'str')
      throw new Error(`Line ${line}: console.log needs a string literal, e.g. console.log("A")`);
    expect(')');
    return { kind: 'log', text: tk.v, line };
  }

  function statement(): Statement {
    const tk = next();
    if (!tk || tk.t !== 'id')
      throw new Error(`Line ${tk ? tk.line : lineOf()}: expected a statement. ${SUPPORTED}`);
    const line = tk.line;
    if (tk.v === 'console') {
      expect('.');
      const m = next();
      if (!m || m.v !== 'log') throw new Error(`Line ${line}: only console.log is supported`);
      return logCall(line);
    }
    if (tk.v === 'log') return logCall(line);
    if (tk.v === 'setTimeout') {
      expect('(');
      const body = fn();
      let delay = 0;
      if (accept(',')) {
        const d = next();
        if (!d || d.t !== 'num') throw new Error(`Line ${line}: setTimeout delay must be a number`);
        delay = d.v;
      }
      expect(')');
      return { kind: 'timeout', body, delay, line };
    }
    if (tk.v === 'queueMicrotask') {
      expect('(');
      const body = fn();
      expect(')');
      return { kind: 'micro', body, line };
    }
    if (tk.v === 'Promise') {
      expect('.');
      expect('resolve');
      expect('(');
      expect(')');
      const chain = [];
      while (peek()?.v === '.') {
        next();
        const thenTok = expect('then');
        expect('(');
        chain.push({ body: fn(), line: thenTok.line });
        expect(')');
      }
      if (!chain.length) throw new Error(`Line ${line}: add at least one .then(() => ...)`);
      return { kind: 'promise', chain, line };
    }
    throw new Error(`Line ${line}: "${tk.v}" is not supported here. ${SUPPORTED}`);
  }

  const body = statements(null);
  if (!body.length) throw new Error('Write at least one statement.');
  return body;
}

function summarize(body: Statement[]): string {
  const parts = body.map((s) => {
    if (s.kind === 'log') return `log ${s.text}`;
    if (s.kind === 'timeout') return 'setTimeout';
    if (s.kind === 'micro') return 'queueMicrotask';
    return '.then';
  });
  const text = parts.join(', ');
  return text.length > 20 ? text.slice(0, 19) + '…' : text;
}

/**
 * Runs the program against the event-loop rules. `emit(caption, opts)` is called after
 * every observable change with the live model; tests pass a no-op and read model.console.
 */
export function simulate(
  program: Statement[],
  emit: (caption: string, opts: EventOptions, model: Model) => void = () => {},
): Model {
  const m: Model = {
    stack: [],
    webapis: [],
    pending: [],
    micro: [],
    macro: [],
    console: [],
    line: null,
    clock: 0,
  };
  let seq = 0;
  const mk = (
    kind: string,
    label: string,
    body: Statement[],
    extra: { due?: number; line?: number } = {},
  ): Task => ({
    due: 0,
    line: 1,
    waitsOn: null,
    id: `${kind}-${++seq}`,
    seq,
    kind,
    label,
    sub: summarize(body),
    body,
    ...extra,
  });
  let predict: string | null = null;
  const say = (caption: string, opts: EventOptions = {}): void => {
    if (predict !== null) {
      opts = { ...opts, predict };
      predict = null;
    }
    emit(caption, opts, m);
  };
  let steps = 0;
  const guard = (): void => {
    if (++steps > 400)
      throw new Error('This program runs too long to animate. Keep it under ~60 callbacks.');
  };

  function exec(stmt: Statement): void {
    guard();
    m.line = stmt.line;
    if (stmt.kind === 'log') {
      m.console.push(stmt.text);
      say(
        `console.log("${stmt.text}") is plain synchronous code, so it runs right now and prints ${stmt.text}.`,
        { title: `console.log("${stmt.text}") prints ${stmt.text}` },
      );
    } else if (stmt.kind === 'timeout') {
      const delay = Math.max(1, stmt.delay);
      const t = mk('timer', 'timer callback', stmt.body, { due: m.clock + delay, line: stmt.line });
      m.webapis.push(t);
      const clamp = stmt.delay < 1 ? ' (a delay of 0 is treated as about 1 ms)' : '';
      say(
        `setTimeout does not run the callback. It hands it to the timer system, which will release it after ${delay} ms${clamp}. The current code keeps going.`,
        { title: `setTimeout: callback waits in the timers (${delay} ms)` },
      );
    } else if (stmt.kind === 'micro') {
      const t = mk('micro', 'microtask', stmt.body, { line: stmt.line });
      m.micro.push(t);
      say(
        'queueMicrotask puts the callback straight onto the microtask queue. It will run as soon as the call stack is empty, before any timer.',
        { title: 'queueMicrotask: straight onto the microtask queue' },
      );
    } else {
      const tasks = stmt.chain.map((c, i) =>
        mk('then', i === 0 ? '.then callback' : `.then #${i + 1}`, c.body, { line: c.line }),
      );
      for (let i = 1; i < tasks.length; i++) required(tasks[i]).waitsOn = required(tasks[i - 1]).id;
      m.micro.push(required(tasks[0]));
      m.pending.push(...tasks.slice(1));
      const more =
        tasks.length > 1
          ? ` The later .then calls wait: each one only queues after the previous callback finishes.`
          : '';
      say(
        `Promise.resolve() is already settled, so its first .then callback goes onto the microtask queue immediately.${more}`,
        { title: 'Promise.resolve().then: first callback is a microtask' },
      );
    }
  }

  function run(task: Task, how: string): void {
    m.stack.push(task);
    m.line = task.line ?? null;
    say(how, {
      title: task.kind === 'script' ? 'The script runs top to bottom' : `Run the ${task.label}`,
    });
    for (const stmt of task.body) exec(stmt);
    m.stack.pop();
    m.line = null;
    const next = m.pending.find((p) => p.waitsOn === task.id);
    if (next) {
      m.pending = m.pending.filter((p) => p !== next);
      m.micro.push(next);
      say(
        `The ${task.label} returned, which resolves the promise that .then created. That releases the next .then callback onto the microtask queue (at the back).`,
        { title: `${next.label} released to the microtask queue` },
      );
    } else {
      say(
        task.kind === 'script'
          ? 'The script has finished and the call stack is empty. Only now does the event loop look at the queues.'
          : `The ${task.label} finished and was popped off the call stack.`,
        {
          title: task.kind === 'script' ? 'Script done: the stack is empty' : `${task.label} done`,
        },
      );
    }
  }

  function drainMicrotasks(): void {
    if (!m.micro.length) return;
    let first = true;
    while (m.micro.length) {
      const t = required(m.micro.shift());
      run(
        t,
        first
          ? 'Rule 1: when the stack is empty, drain the whole microtask queue first. The oldest microtask moves onto the call stack.'
          : 'Still draining: microtasks keep running until the microtask queue is completely empty, even ones added just now.',
      );
      first = false;
    }
  }

  const script: Task = {
    seq: 0,
    due: 0,
    waitsOn: null,
    id: 'script',
    kind: 'script',
    label: 'main script',
    sub: 'your code',
    body: program,
    line: required(program[0]).line,
  };
  m.macro.push(script);
  say('Your whole file is one task. It sits in the task queue until the call stack is free.', {
    title: 'Your file is one task',
  });
  m.macro.shift();
  run(script, 'The script task moves onto the call stack and runs top to bottom.');

  for (;;) {
    if (m.micro.length && (m.macro.length || m.webapis.length)) {
      predict = `The stack is empty. There are ${m.micro.length} microtask(s) and ${m.webapis.length + m.macro.length} timer callback(s) waiting. Which runs next?`;
    }
    drainMicrotasks();
    if (!m.macro.length) {
      if (!m.webapis.length) break;
      const due = Math.min(...m.webapis.map((t) => t.due));
      m.clock = due;
      const ready = m.webapis
        .filter((t) => t.due <= due)
        .sort((a, b) => a.due - b.due || a.seq - b.seq);
      m.webapis = m.webapis.filter((t) => !ready.includes(t));
      m.macro.push(...ready);
      say(
        `Time passes until t = ${due} ms. ${ready.length === 1 ? 'A timer expires and its callback moves' : `${ready.length} timers expire and their callbacks move`} into the task queue.`,
        { title: `t = ${due} ms: timer${ready.length === 1 ? '' : 's'} fire` },
      );
    }
    const task = required(m.macro.shift());
    run(
      task,
      'Rule 2: the microtask queue is empty, so the event loop takes ONE task from the task queue and runs it.',
    );
  }
  m.line = null;
  say(
    `Every queue is empty, so the program is done. Output: ${m.console.join(' ') || '(nothing)'}`,
    { title: `Done: ${m.console.join(' ') || '(no output)'}`, done: true },
  );
  return m;
}
