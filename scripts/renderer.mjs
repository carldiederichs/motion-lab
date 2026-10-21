import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { Script } from "node:vm";

export const ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
export const slugPattern = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/;
const idPattern = /^[A-Za-z][A-Za-z0-9_-]{0,79}$/;
const kinds = new Set([
  "box",
  "circle",
  "store",
  "cells",
  "text",
  "lane",
  "ring",
]);
const actions = new Set([
  "move",
  "drop",
  "show",
  "hide",
  "label",
  "tone",
  "set",
  "text",
  "row",
  "rows",
  "cells",
  "cellValue",
  "pointer",
  "note",
  "pulse",
]);
const tones = new Set([
  null,
  "mechanism",
  "success",
  "failure",
  "warning",
  "repeated",
  "context",
  "muted",
]);
const topKeys = new Set([
  "kind",
  "version",
  "slug",
  "title",
  "subtitle",
  "component",
  "date",
  "aliases",
  "stage",
  "scene",
  "variants",
  "simulation",
  "edgeCases",
  "code",
  "complexity",
  "reference",
  "camera",
  "defaultPanel",
  "family",
]);
const need = (ok, message) => {
  if (!ok) throw new Error(message);
};
const finite = (n) => typeof n === "number" && Number.isFinite(n);
function inspect(value, depth = 0) {
  need(depth < 40, "Spec nesting exceeds 40 levels");
  if (typeof value === "number") need(finite(value), "Numbers must be finite");
  if (typeof value === "string")
    need(value.length <= 12000, "Text field exceeds 12000 characters");
  if (value && typeof value === "object") {
    need(
      !Array.isArray(value) || value.length <= 500,
      "Array exceeds 500 items",
    );
    for (const [k, v] of Object.entries(value)) {
      need(
        !["__proto__", "constructor", "prototype"].includes(k),
        `Forbidden key: ${k}`,
      );
      inspect(v, depth + 1);
    }
  }
}
export function validateScene(scene, label = "Scene") {
  need(
    scene &&
      Array.isArray(scene.actors) &&
      scene.actors.length > 0 &&
      scene.actors.length <= 100,
    `${label}: needs 1–100 actors`,
  );
  const unique = (items, name) => {
    const ids = new Set();
    for (const item of items) {
      need(
        item && idPattern.test(item.id) && !ids.has(item.id),
        `${label}: invalid/duplicate ${name} id`,
      );
      ids.add(item.id);
    }
    return ids;
  };
  const ids = unique(scene.actors, "actor");
  const links = unique(scene.links || [], "link");
  const tokens = unique(scene.tokens || [], "token");
  for (const a of scene.actors) {
    need(
      kinds.has(a.kind) && finite(a.x) && finite(a.y),
      `${label}: invalid actor ${a.id}`,
    );
    if (["box", "store", "lane"].includes(a.kind))
      need(
        finite(a.w) && finite(a.h) && a.w > 0 && a.h > 0,
        `${a.id}: positive dimensions required`,
      );
    if (["circle", "ring"].includes(a.kind))
      need(finite(a.r) && a.r > 0, `${a.id}: positive radius required`);
    if (a.kind === "cells")
      need(
        Array.isArray(a.values) &&
          a.values.length <= 20 &&
          finite(a.cell) &&
          a.cell > 0,
        `${a.id}: invalid cells`,
      );
  }
  for (const l of scene.links || [])
    need(ids.has(l.from) && ids.has(l.to), `${label}: missing link endpoint`);
  need(
    Array.isArray(scene.beats) &&
      scene.beats.length >= 2 &&
      scene.beats.length <= 80,
    `${label}: needs 2–80 chapters`,
  );
  for (const b of scene.beats) {
    need(
      typeof b.title === "string" && b.title.length > 0 && b.title.length <= 80,
      `${label}: chapter title required (max 80)`,
    );
    need(
      typeof b.text === "string" && b.text.length <= 420,
      `${label}: chapter explanation required (max 420)`,
    );
    need(
      finite(b.dur) && b.dur >= 400 && b.dur <= 8000,
      `${label}: duration must be 400–8000ms`,
    );
    for (const a of b.actions || []) {
      need(a && typeof a === "object", "Action must be an object");
      need(actions.has(a.do), `${label}: unknown action ${a.do}`);
      for (const [key, set] of [
        ["actor", ids],
        ["link", links],
        ["token", tokens],
      ])
        if (key in a)
          need(set.has(a[key]), `${label}: missing ${key} ${a[key]}`);
      if (["move", "drop"].includes(a.do))
        need(
          tokens.has(a.token) && links.has(a.link),
          `${label}: motion needs token and link`,
        );
      if (!["move", "drop"].includes(a.do))
        need(
          ids.has(a.actor) || links.has(a.link) || tokens.has(a.token),
          `${label}: action needs an existing target`,
        );
      if (
        [
          "set",
          "rows",
          "row",
          "cells",
          "cellValue",
          "pointer",
          "note",
          "pulse",
          "text",
        ].includes(a.do)
      )
        need(ids.has(a.actor), `${label}: action needs an actor`);
      if ("tone" in a) need(tones.has(a.tone), `${label}: invalid tone`);
      if (a.at)
        need(
          a.at.length === 2 &&
            a.at.every(finite) &&
            0 <= a.at[0] &&
            a.at[0] <= a.at[1] &&
            a.at[1] <= 1,
          `${label}: invalid action timing`,
        );
    }
  }
}
export function validate(spec) {
  inspect(spec);
  need(
    spec && spec.kind === "motion" && spec.version === 3,
    "Expected a motion v3 spec",
  );
  for (const k of Object.keys(spec))
    need(topKeys.has(k), `Unknown top-level field: ${k}`);
  need(slugPattern.test(spec.slug) && spec.slug.length <= 80, "Invalid slug");
  need(
    typeof spec.title === "string" &&
      spec.title.length > 0 &&
      spec.title.length <= 160,
    "Title required (max 160)",
  );
  need(typeof spec.component === "string", "Category required");
  need(
    spec.stage &&
      [spec.stage.width, spec.stage.height].every(finite) &&
      spec.stage.width >= 600 &&
      spec.stage.width <= 1600 &&
      spec.stage.height >= 250 &&
      spec.stage.height <= 1000,
    "Stage must be 600–1600 by 250–1000",
  );
  need(
    Array.isArray(spec.aliases) &&
      spec.aliases.every((x) => typeof x === "string"),
    "Search aliases must be strings",
  );
  need(
    Array.isArray(spec.edgeCases) && spec.edgeCases.length >= 2,
    "Provide at least two edge-case presets",
  );
  const variants = spec.variants || [];
  need(
    Array.isArray(variants) && variants.length <= 16,
    "At most 16 scenarios",
  );
  if (spec.simulation) {
    need(
      [
        "two-sum",
        "sliding-window",
        "binary-tree-balance",
        "lost-update",
        "event-loop",
        "memory-db",
        "sequence",
        "consistent-hash",
        "binary-search",
        "islands",
        "linked-list",
        "coin-change",
        "graph-bfs",
      ].includes(spec.simulation.generator),
      "Unknown generator; compose a scene or register a tested generator",
    );
    for (const p of spec.simulation.params || []) {
      need(
        slugPattern.test(p.id) &&
          [
            "numbers",
            "tree",
            "list",
            "int",
            "range",
            "select",
            "code",
          ].includes(p.type) &&
          "default" in p,
        "Invalid input parameter",
      );
      if (p.pattern)
        need(
          typeof p.pattern === "string" &&
            p.pattern.length <= 80 &&
            /^\^\[01\]\{1,[1-9]\}\$/.test(p.pattern),
          "Only bounded binary-row patterns are supported",
        );
      if (p.type === "select")
        need(
          Array.isArray(p.options) && p.options.length > 0,
          "Select needs options",
        );
    }
  } else if (variants.length)
    variants.forEach((v) => validateScene(v.scene, v.label));
  else validateScene(spec.scene);
  for (const e of spec.edgeCases) {
    need(
      typeof e.label === "string" && typeof e.why === "string",
      "Edge case needs a label and explanation",
    );
    need(
      "params" in e ||
        ("variant" in e &&
          Number.isInteger(e.variant) &&
          e.variant >= 0 &&
          e.variant < variants.length),
      "Edge case must select inputs or a scenario",
    );
  }
  for (const item of [spec, ...variants]) {
    if (item.code)
      need(
        Array.isArray(item.code.lines) &&
          item.code.lines.length <= 100 &&
          item.code.lines.every((s) => typeof s === "string" && s.length <= 58),
        "Code lines must fit 58 columns",
      );
    if (item.complexity)
      need(
        item.complexity.time && item.complexity.space,
        "Complexity needs time and space",
      );
  }
  return spec;
}
export async function render(spec) {
  validate(spec);
  const [template, css, core, extra] = await Promise.all(
    [
      "player.html",
      "diagram-design.css",
      "generators.js",
      "extended-generators.js",
    ].map((f) => readFile(path.join(ROOT, "engine", f), "utf8")),
  );
  const generators = core + "\n" + extra;
  new Script(generators); // Parse trusted generator code before emitting a page.
  const payload = JSON.stringify(spec)
    .replaceAll("<", "\\u003c")
    .replaceAll(">", "\\u003e")
    .replaceAll("&", "\\u0026");
  const title = spec.title
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
  return template
    .replace("/*__DIAGRAM_DESIGN__*/", () => css)
    .replace("/*__GENERATORS__*/", () => generators)
    .replace("__MOTION_TITLE__", () => title)
    .replace("__MOTION_SPEC__", () => payload)
    .replace('href="/motion-lab-icon.svg"', 'href="/icon.svg"');
}
