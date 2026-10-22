import { required } from '../engine/assert.ts';
import { element } from '../engine/dom.ts';

export function startHero(reduced: MediaQueryList): void {
  const $ = (id: string): HTMLElement => element(id, HTMLElement);
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('viewBox', '0 0 400 280');
  svg.setAttribute('role', 'img');
  const add = <K extends keyof SVGElementTagNameMap>(
    tag: K,
    attrs: Record<string, string | number>,
    text?: string,
    parent: SVGElement = svg,
  ): SVGElementTagNameMap[K] => {
    const el = document.createElementNS(ns, tag);
    for (const [key, value] of Object.entries(attrs)) el.setAttribute(key, String(value));
    if (text !== undefined) el.textContent = text;
    parent.appendChild(el);
    return el;
  };
  const point = (slot: number, radius = 85): [number, number] => [
    200 + radius * Math.sin((slot * Math.PI) / 50),
    130 - radius * Math.cos((slot * Math.PI) / 50),
  ];
  const label = (
    x: number,
    y: number,
    text: string,
    color = 'muted',
    size = 12,
    parent: SVGElement = svg,
  ): SVGTextElement =>
    add(
      'text',
      {
        x,
        y,
        'text-anchor': 'middle',
        fill: `var(--${color})`,
        'font-size': size,
        'font-family': 'var(--mono)',
      },
      text,
      parent,
    );
  add('circle', {
    cx: 200,
    cy: 130,
    r: 85,
    fill: 'none',
    stroke: 'var(--border)',
    'stroke-width': 2,
    'stroke-dasharray': '4 5',
  });
  label(200, 18, 'Positions 0–99 · follow clockwise', 'muted', 11);
  const [kx, ky] = point(60, 130);
  const ownerPath = (slot: number, originX = 0, originY = 0): string => {
    const [ox, oy] = point(slot);
    const cx = slot === 64 ? kx : 83;
    const cy = slot === 64 ? ky : 170;
    const distance = Math.hypot(cx - ox, cy - oy);
    const ex = ox + ((cx - ox) / distance) * 28;
    const ey = oy + ((cy - oy) / distance) * 28;
    return `M${kx - originX} ${ky - originY} Q${cx - originX} ${cy - originY} ${ex - originX} ${ey - originY}`;
  };
  const connector = add('path', {
    'data-owner-connector': '',
    d: ownerPath(80),
    fill: 'none',
    stroke: 'var(--blue)',
    'stroke-width': 2,
  });
  const newcomer = add('g', { class: 'hero-newcomer', opacity: 0 });
  for (const [slot, name] of [
    [16, 'A'],
    [48, 'B'],
    [80, 'C'],
    [64, 'D'],
  ] as const) {
    const parent = name === 'D' ? newcomer : svg;
    const [x, y] = point(slot);
    add(
      'circle',
      {
        'data-server': name,
        cx: x,
        cy: y,
        r: 24,
        fill: 'var(--surface)',
        stroke: name === 'D' ? 'var(--blue)' : 'var(--context)',
        'stroke-width': 2,
      },
      undefined,
      parent,
    );
    label(x, y - 2, name, name === 'D' ? 'blue' : 'text', 14, parent);
    label(x, y + 13, String(slot), 'muted', 10, parent);
  }
  add('circle', { cx: kx, cy: ky, r: 4, fill: 'var(--blue)' });
  label(kx, ky + 21, 'key 60', 'blue', 11);
  const heading = label(200, 120, 'KEY 60 OWNER', 'muted', 10);
  const owner = label(200, 148, 'C', 'text', 23);
  const packetAnchor = add('g', { 'data-hero-packet': '', 'aria-hidden': 'true', opacity: 0 });
  const packet = add('g', {}, undefined, packetAnchor);
  add('circle', { r: 5, fill: 'var(--blue)' }, undefined, packet);
  const packetLabel = add(
    'text',
    { x: -14, y: -10, 'text-anchor': 'end', fill: 'var(--blue)', 'font-size': 11 },
    '',
    packet,
  );
  $('hero-ring').replaceChildren(svg);

  const durations = [3600, 2600, 2800, 4000];
  const explanations = [
    'Start at key 60 and walk clockwise. C at 80 is the first server you reach, so C stores the record.',
    'Server D joins at 64, before C. It becomes the first server clockwise from key 60. The record is still on C until it is copied.',
    'C sends the record for key 60 to D. A and B keep their records; nothing moves between them.',
    'D now stores key 60. Only keys after B at 48 through D at 64 move. Every other key keeps its owner.',
  ];
  let phase = 0;
  let running = !reduced.matches;
  let visible = true;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let remaining = required(durations[0]);
  let deadline = 0;
  function playback(): void {
    clearTimeout(timer);
    timer = undefined;
    const active = running && visible && !document.hidden;
    $('hero-play').textContent = running ? 'Pause' : 'Resume';
    $('hero-play').setAttribute('aria-label', running ? 'Pause animation' : 'Resume animation');
    $('hero-play').setAttribute('aria-pressed', String(running));
    if (!active) {
      svg.pauseAnimations();
      if (deadline > 0) remaining = Math.max(0, deadline - performance.now());
      deadline = 0;
      return;
    }
    svg.unpauseAnimations();
    deadline = performance.now() + remaining;
    timer = setTimeout(() => {
      phase = (phase + 1) % durations.length;
      remaining = required(durations[phase]);
      deadline = 0;
      render();
    }, remaining);
  }
  function render(): void {
    svg.setAttribute('aria-label', required(explanations[phase]));
    newcomer.setAttribute('opacity', phase > 0 ? '1' : '0');
    const oldPath = required(connector.getAttribute('d'));
    const path = ownerPath(phase > 0 ? 64 : 80);
    connector.replaceChildren();
    connector.setAttribute('d', path);
    if (!reduced.matches && running && oldPath !== path) {
      const morph = add(
        'animate',
        {
          attributeName: 'd',
          from: oldPath,
          to: path,
          dur: '0.65s',
          fill: 'freeze',
          calcMode: 'spline',
          keyTimes: '0;1',
          keySplines: '0.4 0 0.2 1',
        },
        undefined,
        connector,
      );
      morph.beginElement();
    }
    heading.textContent =
      phase === 2 ? 'MOVING RECORD' : phase === 1 ? 'RECORD STILL ON' : 'KEY 60 OWNER';
    owner.textContent = phase === 2 ? 'C → D' : phase === 3 ? 'D' : 'C';
    packet.querySelector('animateMotion')?.remove();
    packetAnchor.setAttribute(
      'opacity',
      !reduced.matches && (phase === 0 || phase === 2) ? '1' : '0',
    );
    if (!reduced.matches && (phase === 0 || phase === 2)) {
      const [sx, sy] = point(80, 117);
      const [tx, ty] = point(64, 117);
      // The outer group always has a valid position, even before SMIL starts or while paused.
      packetAnchor.setAttribute(
        'transform',
        `translate(${phase === 2 ? sx : kx} ${phase === 2 ? sy : ky})`,
      );
      packetLabel.textContent = phase === 2 ? 'key 60' : 'lookup';
      const motion = add(
        'animateMotion',
        {
          path:
            phase === 2
              ? `M0 0 Q${40 - sx} ${170 - sy} ${tx - sx} ${ty - sy}`
              : ownerPath(80, kx, ky),
          dur: '2.4s',
          fill: 'freeze',
          calcMode: 'spline',
          keyTimes: '0;1',
          keySplines: '0.42 0 0.2 1',
        },
        undefined,
        packet,
      );
      motion.beginElement();
    }
    $('hero-ring').dataset.phase = String(phase);
    $('hero-step').textContent = `${phase + 1} / ${durations.length}`;
    $('hero-result').textContent = required(explanations[phase]);
    playback();
  }
  $('hero-toggle').addEventListener('click', () => {
    running = false;
    phase = (phase + 1) % durations.length;
    deadline = 0;
    remaining = required(durations[phase]);
    render();
  });
  $('hero-restart').addEventListener('click', () => {
    phase = 0;
    deadline = 0;
    remaining = required(durations[0]);
    render();
  });
  $('hero-play').addEventListener('click', () => {
    running = !running;
    playback();
  });
  new IntersectionObserver(
    (entries) => {
      visible = entries.some((entry) => entry.isIntersecting);
      playback();
    },
    { threshold: 0.2 },
  ).observe($('hero-ring'));
  document.addEventListener('visibilitychange', playback);
  reduced.addEventListener('change', () => {
    if (reduced.matches) {
      running = false;
      render();
    }
  });
  render();
}
