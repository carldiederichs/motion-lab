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
function art(family) {
  const ns = "http://www.w3.org/2000/svg",
    svg = document.createElementNS(ns, "svg");
  svg.setAttribute("viewBox", "0 0 280 100");
  svg.setAttribute("aria-hidden", "true");
  const add = (tag, attrs, text) => {
    const e = document.createElementNS(ns, tag);
    for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
    if (text) e.textContent = text;
    svg.appendChild(e);
    return e;
  };
  const line = (x, y, a, b) =>
    add("path", {
      d: `M${x} ${y} L${a} ${b}`,
      stroke: "var(--context)",
      fill: "none",
      "stroke-width": 1.5,
    });
  const node = (x, y, label, active = false) => {
    add("rect", {
      x: x - 24,
      y: y - 15,
      width: 48,
      height: 30,
      rx: 5,
      fill: "var(--surface-2)",
      stroke: active ? "var(--blue)" : "var(--border)",
    });
    add(
      "text",
      {
        x,
        y: y + 4,
        "text-anchor": "middle",
        fill: active ? "var(--blue)" : "var(--muted)",
        "font-size": 11,
        "font-family": "var(--mono)",
      },
      label,
    );
  };
  if (family.includes("ring")) {
    add("circle", {
      cx: 140,
      cy: 50,
      r: 38,
      fill: "none",
      stroke: "var(--border)",
      "stroke-dasharray": "3 4",
    });
    for (const [a, t] of [
      [0, "A"],
      [2.1, "B"],
      [4.2, "C"],
    ]) {
      const x = 140 + 38 * Math.sin(a),
        y = 50 - 38 * Math.cos(a);
      add("circle", {
        cx: x,
        cy: y,
        r: 12,
        fill: "var(--surface)",
        stroke: t === "B" ? "var(--blue)" : "var(--context)",
      });
      add(
        "text",
        {
          x,
          y: y + 4,
          "text-anchor": "middle",
          fill: "var(--text)",
          "font-size": 11,
        },
        t,
      );
    }
  } else if (family.includes("Tree")) {
    for (const [x, y, a, b] of [
      [140, 20, 80, 75],
      [140, 20, 200, 75],
    ])
      line(x, y, a, b);
    node(140, 20, "3", true);
    node(80, 75, "9");
    node(200, 75, "20");
  } else if (family.includes("Graph")) {
    for (const [x, y, a, b] of [
      [45, 50, 125, 20],
      [45, 50, 125, 80],
      [125, 20, 225, 50],
      [125, 80, 225, 50],
    ])
      line(x, y, a, b);
    node(45, 50, "0", true);
    node(125, 20, "1");
    node(125, 80, "2");
    node(225, 50, "3");
  } else if (family.includes("Linked")) {
    line(50, 50, 230, 50);
    node(50, 50, "1");
    node(140, 50, "2", true);
    node(230, 50, "3");
    add("path", {
      d: "M120 72l-16 0m0 0l6 -5m-6 5l6 5",
      stroke: "var(--blue)",
      fill: "none",
    });
  } else if (family.includes("Matrix") || family.includes("DP")) {
    for (let r = 0; r < 3; r++)
      for (let c = 0; c < 5; c++) {
        const active = (r + c) % 3 === 0;
        add("rect", {
          x: 65 + c * 31,
          y: 5 + r * 31,
          width: 26,
          height: 26,
          rx: 4,
          fill: active ? "var(--blue)" : "var(--surface-2)",
          stroke: "var(--border)",
        });
      }
  } else if (family.includes("Sequence")) {
    for (const x of [60, 140, 220]) line(x, 10, x, 90);
    line(60, 30, 140, 30);
    line(140, 55, 220, 55);
    line(220, 80, 60, 80);
    add("circle", { cx: 165, cy: 55, r: 5, fill: "var(--blue)" });
  } else if (family.includes("C4")) {
    add("rect", {
      x: 95,
      y: 8,
      width: 178,
      height: 82,
      rx: 6,
      stroke: "var(--border)",
      fill: "none",
      "stroke-dasharray": "4 4",
    });
    line(35, 50, 130, 50);
    line(145, 50, 230, 50);
    node(35, 50, "User");
    node(130, 50, "API", true);
    node(230, 50, "DB");
  } else if (
    family.includes("Store") ||
    family.includes("Queues") ||
    family.includes("Interleaving")
  ) {
    node(45, 28, "A");
    node(45, 75, "B");
    line(70, 28, 160, 50);
    line(70, 75, 160, 50);
    node(190, 50, "state", true);
  } else {
    for (let i = 0; i < 5; i++)
      node(32 + i * 54, 45, String([2, 7, 11, 15, 9][i]), i === 1 || i === 2);
    add("path", { d: "M66 78h66", stroke: "var(--blue)", "stroke-width": 2 });
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
    visual.appendChild(art(item.family));
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
    target: "examples",
    title: "Choose a useful starting point",
    text: "Filter by the question you have. The library includes algorithms, architecture, data structures and concurrency.",
  },
  {
    target: "make-your-own",
    title: "Make the next one locally",
    text: "Download the toolkit when you are ready. It includes the same player and a skill your assistant can read. Nothing is downloaded automatically.",
  },
];
function positionTour() {
  if ($("tour-layer").hidden) return;
  let r = $(steps[tourIndex].target).getBoundingClientRect();
  if (tourIndex === 1) {
    const frame = $("demo-frame"),
      control = frame.contentDocument?.querySelector(".mp-transport");
    if (control) {
      const fr = frame.getBoundingClientRect(),
        cr = control.getBoundingClientRect();
      r = {
        left: fr.left + cr.left,
        right: fr.left + cr.right,
        top: fr.top + cr.top,
        width: cr.width,
        height: cr.height,
      };
    }
  }
  const card = $("tour-card"),
    shade = $("tour-shade");
  const top = Math.max(16, r.top),
    height = Math.min(r.height, innerHeight - 300);
  shade.style.left = `${Math.max(16, r.left - 5)}px`;
  shade.style.top = `${top - 5}px`;
  shade.style.width = `${Math.min(r.width + 10, innerWidth - 32)}px`;
  shade.style.height = `${height + 10}px`;
  card.style.left = `${Math.max(16, Math.min(innerWidth - 356, r.right - 340))}px`;
  card.style.top = `${Math.max(16, Math.min(innerHeight - card.offsetHeight - 16, top + height + 18))}px`;
}
function showTour(index) {
  tourIndex = index;
  if (index === 1) showExample();
  const step = steps[index];
  $(step.target).scrollIntoView({ block: "start", behavior: "instant" });
  if (index === 1)
    $("demo-frame").addEventListener("load", positionTour, { once: true });
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
  positionTour();
  $("tour-card").focus();
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
  const point = (slot) => [
    200 + 91 * Math.sin((slot / 100) * Math.PI * 2),
    125 - 91 * Math.cos((slot / 100) * Math.PI * 2),
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
  const [kx, ky] = point(60),
    [ox, oy] = point(heroAdded ? 64 : 80);
  add("path", {
    d: `M${kx} ${ky} Q200 125 ${ox} ${oy}`,
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
