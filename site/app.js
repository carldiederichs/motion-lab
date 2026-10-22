const $ = (id) => document.getElementById(id);
const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
let category = "",
  examples = [],
  typing,
  tourIndex = 0,
  lastFocus;
const prompt =
  "Show me consistent hashing. Add a server and show which keys move.";
const themeModes = ["system", "light", "dark"];
let theme = "system";
try {
  theme = localStorage.getItem("motionlab.theme") || "system";
} catch {}
function setTheme(value) {
  theme = themeModes.includes(value) ? value : "system";
  if (theme === "system") delete document.documentElement.dataset.theme;
  else document.documentElement.dataset.theme = theme;
  try {
    localStorage.setItem("motionlab.theme", theme);
  } catch {}
  $("theme").textContent = { system: "◐", light: "☀", dark: "☾" }[theme];
  $("theme").setAttribute("aria-label", `Theme: ${theme}. Change theme`);
  const frame = $("demo-frame");
  if (frame.src)
    frame.src = `/lessons/consistent-hashing.html?embed=1&panel=none&theme=${theme}`;
}
$("theme").addEventListener("click", () =>
  setTheme(themeModes[(themeModes.indexOf(theme) + 1) % 3]),
);
setTheme(theme);
function showExample() {
  clearInterval(typing);
  $("typed-prompt").textContent = prompt;
  $("demo-status").textContent =
    "Example ready. In your local workflow, your assistant writes and checks this visualization.";
  $("demo-result").hidden = false;
  $("demo-run").textContent = "Example ready ✓";
  if (!$("demo-frame").getAttribute("src"))
    $("demo-frame").src =
      `/lessons/consistent-hashing.html?embed=1&panel=none&theme=${theme}`;
}
$("demo-run").addEventListener("click", () => {
  showExample();
  $("demo-result").scrollIntoView({
    block: "start",
    behavior: reduced.matches ? "instant" : "smooth",
  });
});
$("demo-replay").addEventListener("click", () => {
  clearInterval(typing);
  $("demo-result").hidden = true;
  $("demo-run").textContent = "Show the example ↓";
  $("demo-status").textContent =
    "Scripted preview of a question you could ask locally.";
  if (reduced.matches) {
    $("typed-prompt").textContent = prompt;
    return;
  }
  let n = 0;
  $("typed-prompt").textContent = "";
  typing = setInterval(() => {
    $("typed-prompt").textContent = prompt.slice(0, (n += 2));
    if (n >= prompt.length) {
      clearInterval(typing);
      showExample();
    }
  }, 28);
});
function art(slug) {
  const ns = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(ns, "svg");
  svg.setAttribute("viewBox", "0 0 280 100");
  svg.setAttribute("aria-hidden", "true");
  const add = (tag, attrs, text) => {
    const e = document.createElementNS(ns, tag);
    for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
    if (text !== undefined) e.textContent = text;
    svg.appendChild(e);
    return e;
  };
  const label = (x, y, text, tone = "muted", size = 11) =>
    add("text", { x, y, "text-anchor": "middle", fill: `var(--${tone})`,
      "font-size": size, "font-family": "var(--mono)" }, text);
  const path = (d, tone = "context", dashed = false) =>
    add("path", { d, stroke: `var(--${tone})`, fill: "none",
      "stroke-width": 1.5, "stroke-linecap": "round",
      ...(dashed ? { "stroke-dasharray": "3 4" } : {}) });
  const arrow = (x, y, a, b, tone = "blue") => {
    const angle = Math.atan2(b - y, a - x),
      dx = 5 * Math.cos(angle), dy = 5 * Math.sin(angle);
    path(`M${x} ${y}L${a} ${b}M${a-dx+dy*.6} ${b-dy-dx*.6}L${a} ${b}L${a-dx-dy*.6} ${b-dy+dx*.6}`, tone);
  };
  const box = (x, y, w, h, tone = "border", dashed = false) =>
    add("rect", { x, y, width: w, height: h, rx: 4,
      fill: dashed ? "none" : "var(--surface-2)", stroke: `var(--${tone})`,
      ...(dashed ? { "stroke-dasharray": "4 4" } : {}) });
  const node = (x, y, text, tone = "border", w = 48) => {
    box(x-w/2, y-14, w, 28, tone);
    label(x, y+4, text, tone === "border" ? "muted" : tone);
  };
  const circle = (x, y, text, tone = "context") => {
    add("circle", { cx: x, cy: y, r: 12, fill: "var(--surface)", stroke: `var(--${tone})` });
    label(x, y+4, text, tone === "context" ? "text" : tone);
  };
  if (slug === "two-sum") {
    label(58, 15, "seen"); label(146, 15, "current"); label(234, 15, "target");
    node(58, 38, "2", "blue"); label(102, 42, "+");
    node(146, 38, "7", "blue"); label(190, 42, "="); node(234, 38, "9", "green");
    box(56, 65, 168, 25); label(140, 82, "map: 2 → index 0");
  } else if (slug === "sliding-window") {
    box(72, 20, 104, 42, "blue", true);
    [2, 1, 5, 1, 3, 2].forEach((v, i) => node(56+i*34, 41, v, i>=1 && i<=3 ? "blue" : "border", 28));
    arrow(56, 64, 56, 83, "amber"); arrow(158, 85, 158, 66);
    label(226, 79, "sum 7", "blue"); label(104, 96, "−2  +1");
  } else if (slug === "binary-search") {
    [1, 3, 5, 7, 9, 11, 13].forEach((v, i) => node(38+i*34, 40, v, i===3 ? "blue" : "border", 28));
    path("M20 65v8h102v-8", "context");
    path("M158 65v8h102v-8", "context");
    arrow(140, 82, 140, 59); label(140, 96, "mid = target", "blue");
    label(71, 89, "discard"); label(209, 89, "discard");
  } else if (slug === "number-of-islands") {
    const grid = [[1,1,0,0,1],[0,1,0,1,1],[0,0,0,0,0]];
    grid.forEach((row,r) => row.forEach((v,c) => {
      const tone = v ? c<2 ? "blue" : "green" : "border";
      box(36+c*29, 6+r*29, 24, 24, tone);
      label(48+c*29, 23+r*29, v, v ? tone : "muted");
    }));
    label(230, 43, "2", "text", 22); label(230, 65, "islands");
  } else if (slug === "balanced-tree") {
    path("M140 20L80 57M140 20L200 57M200 57L169 87M200 57L239 87");
    circle(140, 17, "3", "blue"); circle(80, 52, "9"); circle(200, 52, "20");
    circle(169, 86, "15"); circle(239, 86, "7");
    label(62, 85, "h = 1"); label(233, 28, "h = 2");
  } else if (slug === "consistent-hashing") {
    add("circle", { cx:140, cy:50, r:36, fill:"none", stroke:"var(--border)", "stroke-dasharray":"3 4" });
    circle(140, 14, "A"); circle(171, 68, "B", "blue"); circle(109, 68, "C");
    add("circle", {cx:175,cy:38,r:4,fill:"var(--blue)"});
    arrow(184, 41, 184, 61); label(225, 45, "key"); label(225, 63, "→ B", "blue");
  } else if (slug === "key-value-store") {
    label(57, 32, "PUT"); node(57, 57, "x: 9", "blue", 64);
    arrow(96, 57, 129, 57);
    box(139, 13, 105, 76); path("M139 38h105M139 63h105M191 13v76");
    label(165, 30, "key"); label(217, 30, "value");
    label(165, 55, "x"); label(217, 55, "9", "blue");
    label(165, 80, "y"); label(217, 80, "4");
  } else if (slug === "lost-update") {
    label(30, 30, "A"); label(30, 70, "B");
    node(88, 26, "10", "border", 42); node(88, 66, "10", "border", 42);
    arrow(116, 26, 177, 42); arrow(116, 66, 177, 50);
    node(215, 46, "11", "red", 50); label(150, 94, "2 writes · 1 increment", "red");
  } else if (slug === "event-loop") {
    label(50, 17, "stack"); label(140, 17, "microtask"); label(230, 17, "timer");
    node(50, 44, "main", "blue", 62); node(140, 44, "then", "border", 62); node(230, 44, "task", "border", 62);
    arrow(50, 67, 50, 84); path("M50 84h180"); arrow(140, 84, 140, 67); arrow(230, 84, 230, 67);
    label(96, 77, "1"); label(185, 77, "2");
  } else if (slug === "request-sequence") {
    [55,140,225].forEach(x => path(`M${x} 23v71`, "context", true));
    label(55, 14, "Web"); label(140, 14, "API"); label(225, 14, "DB");
    arrow(55, 34, 140, 34); arrow(140, 57, 225, 57); arrow(225, 84, 55, 84, "green");
    label(98, 29, "GET"); label(184, 51, "read"); label(140, 78, "response");
  } else if (slug === "c4-architecture") {
    box(93, 6, 180, 88, "context", true); label(182, 23, "system boundary");
    arrow(62, 60, 105, 60); arrow(167, 60, 208, 60);
    node(35, 60, "User"); node(136, 60, "API", "blue"); node(239, 60, "DB");
  } else if (slug === "reverse-linked-list") {
    arrow(111, 48, 73, 48); arrow(201, 48, 163, 48);
    node(47, 48, "1"); node(137, 48, "2", "blue"); node(227, 48, "3");
    label(47, 86, "prev"); label(137, 86, "current"); label(227, 86, "next");
  } else if (slug === "coin-change") {
    label(39, 15, "amount"); label(39, 43, "dp");
    [0,1,2,3,4].forEach((v,i) => { label(92+i*35,15,v); node(92+i*35,39,[0,1,2,1,2][i],i===4?"blue":"border",29); });
    path("M127 58v16h105v-16", "blue");
    label(168, 94, "dp[4] = dp[1] + 1", "blue");
  } else if (slug === "graph-bfs") {
    path("M42 35L108 16L174 35L108 67L42 35");
    circle(42,35,"0","blue"); circle(108,16,"1","blue"); circle(174,35,"3"); circle(108,67,"2");
    box(208,16,55,66); label(235,32,"queue"); label(235,52,"1", "blue"); label(235,71,"2");
    label(98,96,"visit by distance");
  } else if (slug === "idempotent-retry") {
    node(46,26,"key 42","border",72); node(46,70,"key 42","border",72);
    arrow(89,26,153,43); arrow(89,70,153,53);
    node(207,48,"1 order","green",90); label(146,95,"same key → same result", "green");
  } else {
    throw Error(`Missing gallery preview: ${slug}`);
  }
  return svg;
}
function renderCards() {
  const query = $("search").value.trim().toLowerCase();
  let count = 0;
  $("cards").replaceChildren();
  for (const item of examples) {
    if (category && item.category !== category) continue;
    if (
      query &&
      !`${item.title} ${item.description} ${item.family} ${item.category}`
        .toLowerCase()
        .includes(query)
    )
      continue;
    count++;
    const a = document.createElement("a");
    a.className = "card";
    a.href = `/lessons/${item.slug}.html`;
    const visual = document.createElement("div");
    visual.className = "card-art";
    visual.appendChild(art(item.slug));
    a.appendChild(visual);
    const copy = document.createElement("div");
    copy.className = "card-copy";
    const meta = document.createElement("div");
    meta.className = "card-meta";
    for (const value of [item.category, item.family]) {
      const t = document.createElement("span");
      t.textContent = value;
      meta.appendChild(t);
    }
    copy.appendChild(meta);
    const h = document.createElement("h3");
    h.textContent = item.title;
    copy.appendChild(h);
    const p = document.createElement("p");
    p.textContent = item.description;
    copy.appendChild(p);
    const open = document.createElement("span");
    open.className = "open";
    open.textContent = "Explore →";
    copy.appendChild(open);
    a.appendChild(copy);
    $("cards").appendChild(a);
  }
  $("count").textContent = `${count} ${count === 1 ? "example" : "examples"}`;
  $("empty").hidden = count !== 0;
}
$("search").addEventListener("input", renderCards);
for (const b of document.querySelectorAll("[data-category]"))
  b.addEventListener("click", () => {
    category = b.dataset.category;
    for (const x of document.querySelectorAll("[data-category]"))
      x.setAttribute("aria-pressed", String(x === b));
    renderCards();
  });
fetch("/catalogue.json")
  .then((r) => {
    if (!r.ok) throw Error();
    return r.json();
  })
  .then((data) => {
    examples = data;
    renderCards();
  })
  .catch(() => {
    $("empty").hidden = false;
    $("empty").textContent =
      "The examples could not load. Refresh the page to try again.";
  });
const setup = $("setup");
for (const b of document.querySelectorAll("[data-setup]"))
  b.addEventListener("click", () => setup.showModal());
$("setup-close").addEventListener("click", () => setup.close());
setup.addEventListener("click", (e) => {
  if (e.target === setup) {
    const r = setup.getBoundingClientRect();
    if (
      e.clientX < r.left ||
      e.clientX > r.right ||
      e.clientY < r.top ||
      e.clientY > r.bottom
    )
      setup.close();
  }
});
for (const b of document.querySelectorAll("[data-copy]"))
  b.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(b.dataset.copy);
      $("copy-status").textContent =
        "Copied. Paste it into your terminal or assistant.";
      b.textContent = "Copied ✓";
    } catch {
      $("copy-status").textContent =
        "Clipboard access is unavailable. Select and copy the command above.";
    }
  });
const steps = [
  {
    target: "prompt-panel",
    title: "Start with your question",
    text: "Ask about a mechanism or the code you are working on. This preview is scripted; real creation happens in your local assistant.",
  },
  {
    target: "demo-result",
    title: "Control the explanation",
    text: "Play, pause or move one chapter at a time. Change an input or choose an edge case to see a different result.",
  },
  {
    target: "filters",
    title: "Choose a useful starting point",
    text: "Filter by the question you have. The library includes algorithms, architecture, data structures and concurrency.",
  },
  {
    target: "local-toolkit",
    title: "Make the next one locally",
    text: "Download the toolkit when you are ready. It includes the same player and a skill your assistant can read. Nothing is downloaded automatically.",
  },
];
function tourTargetRect() {
  if (tourIndex === 1) {
    const frame = $("demo-frame");
    const control = frame.contentDocument?.querySelector(".mp-transport");
    if (control) {
      const fr = frame.getBoundingClientRect(),
        cr = control.getBoundingClientRect();
      return {
        left: fr.left + cr.left,
        right: fr.left + cr.right,
        top: fr.top + cr.top,
        bottom: fr.top + cr.bottom,
        width: cr.width,
        height: cr.height,
      };
    }
  }
  return $(steps[tourIndex].target).getBoundingClientRect();
}
function positionTour() {
  if ($("tour-layer").hidden) return;
  const r = tourTargetRect(),
    card = $("tour-card"),
    shade = $("tour-shade");
  const top = Math.max(16, r.top),
    height = Math.min(r.height, innerHeight - 300);
  shade.style.left = `${Math.max(16, r.left - 5)}px`;
  shade.style.top = `${top - 5}px`;
  shade.style.width = `${Math.min(r.width + 10, innerWidth - 32)}px`;
  shade.style.height = `${height + 10}px`;
  card.style.left = `${Math.max(16, Math.min(innerWidth - 356, r.right - 340))}px`;
  const above = top + height + 18 + card.offsetHeight > innerHeight - 16;
  card.classList.toggle("above", above);
  card.style.top = `${Math.max(16, Math.min(innerHeight - card.offsetHeight - 16, above ? top - card.offsetHeight - 18 : top + height + 18))}px`;
}
function ensureTourVisible() {
  if ($("tour-layer").hidden) return;
  const r = tourTargetRect();
  if (r.top < 24 || r.bottom > innerHeight - 280)
    window.scrollBy({ top: r.top - 40, behavior: "instant" });
  positionTour();
}
function showTour(index) {
  tourIndex = index;
  if (index === 1) showExample();
  const step = steps[index];
  $(step.target).scrollIntoView({ block: "start", behavior: "instant" });
  if (index === 1)
    $("demo-frame").addEventListener("load", ensureTourVisible, { once: true });
  $("tour-layer").hidden = false;
  for (const el of document.querySelectorAll(
    "body > header, body > main, body > footer",
  ))
    el.inert = true;
  $("tour-title").textContent = step.title;
  $("tour-text").textContent = step.text;
  $("tour-count").textContent = `${index + 1} of ${steps.length}`;
  $("tour-back").disabled = index === 0;
  $("tour-next").textContent =
    index === steps.length - 1 ? "Finish tour ✓" : "Next →";
  ensureTourVisible();
  $("tour-card").focus({ preventScroll: true });
}
function closeTour() {
  $("tour-layer").hidden = true;
  for (const el of document.querySelectorAll(
    "body > header, body > main, body > footer",
  ))
    el.inert = false;
  lastFocus?.focus();
}
$("tour-start").addEventListener("click", () => {
  lastFocus = document.activeElement;
  showTour(0);
});
$("tour-next").addEventListener("click", () =>
  tourIndex === steps.length - 1 ? closeTour() : showTour(tourIndex + 1),
);
$("tour-back").addEventListener("click", () =>
  showTour(Math.max(0, tourIndex - 1)),
);
$("tour-close").addEventListener("click", closeTour);
window.addEventListener("resize", positionTour);
window.addEventListener("scroll", positionTour);
document.addEventListener("keydown", (e) => {
  if ($("tour-layer").hidden) return;
  if (e.key === "Escape") {
    closeTour();
    e.preventDefault();
  }
  if (e.key === "Tab") {
    const buttons = [...$("tour-card").querySelectorAll("button")].filter(
      (b) => !b.disabled,
    );
    const i = buttons.indexOf(document.activeElement);
    e.preventDefault();
    buttons[
      (i + (e.shiftKey ? -1 : 1) + buttons.length) % buttons.length
    ].focus();
  }
});

// A small interactive preview uses the same clockwise ownership rule as the full lesson.
let heroAdded = false;
function renderHero() {
  const ns = "http://www.w3.org/2000/svg",
    svg = document.createElementNS(ns, "svg");
  svg.setAttribute("viewBox", "0 0 400 250");
  svg.setAttribute("role", "img");
  svg.setAttribute(
    "aria-label",
    heroAdded
      ? "Server D joins. Key 60 moves from C to D."
      : "Servers A, B and C. Key 60 belongs to C.",
  );
  const add = (tag, attrs, text) => {
    const e = document.createElementNS(ns, tag);
    for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
    if (text) e.textContent = text;
    svg.appendChild(e);
  };
  const point = (slot, radius = 91) => [
    200 + radius * Math.sin((slot / 100) * Math.PI * 2),
    125 - radius * Math.cos((slot / 100) * Math.PI * 2),
  ];
  add("circle", {
    cx: 200,
    cy: 125,
    r: 91,
    fill: "none",
    stroke: "var(--border)",
    "stroke-width": 2,
    "stroke-dasharray": "4 5",
  });
  for (const [slot, label] of [
    [16, "A"],
    [48, "B"],
    [80, "C"],
    ...(heroAdded ? [[64, "D"]] : []),
  ]) {
    const [x, y] = point(slot);
    add("circle", {
      "data-server": label,
      cx: x,
      cy: y,
      r: 19,
      fill: "var(--surface)",
      stroke: label === "D" ? "var(--blue)" : "var(--context)",
      "stroke-width": 2,
    });
    add(
      "text",
      {
        x,
        y: y + 5,
        "text-anchor": "middle",
        fill: label === "D" ? "var(--blue)" : "var(--text)",
        "font-size": 14,
        "font-family": "var(--mono)",
      },
      label,
    );
  }
  const [kx, ky] = point(60, 130),
    [ox, oy] = point(heroAdded ? 64 : 80);
  // Keep a visible gap at the server border, including the nearby D state.
  const cx = heroAdded ? kx : 200,
    cy = heroAdded ? ky : 125,
    distance = Math.hypot(cx - ox, cy - oy),
    ex = ox + ((cx - ox) / distance) * 24,
    ey = oy + ((cy - oy) / distance) * 24;
  add("path", {
    "data-owner-connector": "",
    d: `M${kx} ${ky} Q${cx} ${cy} ${ex} ${ey}`,
    fill: "none",
    stroke: "var(--blue)",
    "stroke-width": 2,
  });
  add("circle", { cx: kx, cy: ky, r: 5, fill: "var(--blue)" });
  add(
    "text",
    {
      x: 200,
      y: 115,
      "text-anchor": "middle",
      fill: "var(--muted)",
      "font-size": 12,
    },
    "KEY 60",
  );
  add(
    "text",
    {
      x: 200,
      y: 145,
      "text-anchor": "middle",
      fill: "var(--text)",
      "font-size": 24,
      "font-family": "var(--mono)",
    },
    heroAdded ? "C → D" : "→ C",
  );
  $("hero-ring").replaceChildren(svg);
  $("hero-toggle").textContent = heroAdded
    ? "Remove server D −"
    : "Add server D +";
  $("hero-toggle").setAttribute("aria-pressed", String(heroAdded));
  $("hero-result").textContent = heroAdded
    ? "Only keys in (48, 64] move."
    : "Key 60 belongs to C.";
}
$("hero-toggle").addEventListener("click", () => {
  heroAdded = !heroAdded;
  renderHero();
});
renderHero();
