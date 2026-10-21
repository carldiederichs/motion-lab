# Authoring an explanation

Use `examples/catalogue.json` to choose a working starting point. Ask what the user needs to see, then choose the picture that exposes it.

| Question | Representation | Starting point |
| --- | --- | --- |
| What does each iteration keep or discard? | Array, indices, pointers | binary-search, sliding-window |
| What value has already been seen? | Array and map | two-sum |
| What returns from a recursive call? | Tree and call stack | balanced-tree |
| Which cells or vertices have been visited? | Matrix or graph frontier | number-of-islands |
| Which request precedes another? | Sequence with request/reply paths | request-sequence |
| Who owns this code or data? | C4 system/container boundaries | c4-architecture |
| Where does a key go? | Hash ring and ownership table | consistent-hashing |
| What is stored after an operation? | Store with explicit rows | key-value-store |
| How can two correct-looking operations interfere? | Interleaving | lost-update |
| Where is work queued? | Queue, stack and moving token | event-loop |

Further patterns compose the same primitives: linked lists use circles and directed links; dynamic programming uses rows of cells with a highlighted dependency; intervals use aligned cells or boxes on a shared axis; heaps and tries use trees; backtracking uses a choice tree plus a stack; bit operations use a row of bit cells; state machines use boxes and labelled links. A generic renderer does not prove correctness for every possible prompt. Validate the mechanism, not just the JSON.

## Spec

Every spec declares `kind: "motion"`, `version: 3`, a kebab-case `slug`, `title`, `subtitle`, `component`, `date`, `aliases`, `family` and `stage: {width, height}`. Stage sizes normally use 960 × 480. Optional `camera: false` keeps the diagram fixed. `defaultPanel: "none"` begins with the visual only.

Use either `scene`, `variants: [{label, scene}]`, or `simulation: {generator, params}`. Simulation variants contain fixed `params` instead of scenes. Every spec has at least two `edgeCases`, each with a `label`, `why` and either `params` or a variant index.

Scenes contain `actors`, `links`, `tokens`, and `beats`. Actor kinds are `box`, `store`, `circle`, `cells`, `text`, `lane` and `ring`. Boxes use center coordinates, width and height. Lanes use top-left coordinates and describe a boundary. Rings use a center and radius. Cells use the first cell's center, a `cell` size, `values` and optional named `pointers`.

A link has `id`, `from`, `to`, optional `bend` and `label`. A token has `id` and `label`. A beat has `title`, causal `text`, `dur` (400–8000 ms), optional one-based code `lines`, and `actions`. A small `predict: {q,a}` can pause at a decisive moment when the viewer enables prediction mode.

Actions include `move`/`drop` (token + link), `tone` (actor/link/token), `set` (actor + value), `text` (actor + field + value), `row`/`rows` (store + value), `cells` (actor + inclusive range + tone), `cellValue` (actor + index + value), `pointer` (actor + pointer + index), `note` and `pulse`. Optional `at: [start,end]` uses fractions of the beat. Each timestamp reconstructs state from the beginning, so reverse scrubbing is deterministic.

Use the existing palette: blue for the current operation, green for completed/valid, red for failure, amber for a risk and purple for repeated work. Always include a text or shape signal. Keep boxes short, explanations in chapter captions, routes clear of unrelated nodes and enough room for moving packet labels. Never solve overflow by hiding important text or truncating code.

Code is `{language:"ts", lines:[...]}`. Complexity is `{time,space,example,derivation:[...]}` and may differ by variant. Claims about a simulation must match the implementation and its supported input bounds. For example, the ring demo illustrates ownership with a linear search; production binary-search complexity is a separate comparison.

## Safety and verification

Only trusted code in `engine/` is executed. A spec is data. The builder escapes HTML script delimiters and rejects unknown top-level fields, invalid references and oversized structures. Keep malicious-input regression tests when editing these boundaries.

Each generator must have bounded inputs and a deterministic result. The event-loop example is a restricted interpreter, not JavaScript evaluation. Never add `eval`, arbitrary imports or network requests to generate a scene.

Build locally, run the verifier, then inspect the rendered states. A schema pass does not establish geometry or explanation accuracy. A geometry pass does not establish correctness. Keep all three checks distinct.

## More starting points

`node scripts/cli.mjs new my-explanation --template <name>` accepts both gallery examples and the reusable scenes in `templates/`.

| Question to explain | Starting point | Make visible |
| --- | --- | --- |
| Which keys move when a server joins? | consistent-hashing | Clockwise ownership and the changed interval |
| Why does a retry create a duplicate? | idempotent-retry | Commit, lost response and deduplication |
| Why did this cache evict a useful item? | lru-cache | Recency order and capacity |
| When do we retry a failed dependency? | circuit-breaker | Closed, open and half-open states |
| How do grid subproblems depend on each other? | grid-paths | Above/left dependencies and blocked cells |
| Why must this recursive branch undo its state? | subsets-backtracking | Current path, completed results and restoration |
| How does a queue maintain priority? | heap-insertion | Parent/child order and the array representation |
| Which service owns this responsibility? | c4-architecture | Person, system and container boundaries |
| Which request waits on which service? | request-sequence | Messages, replies and failure paths |
| Why is a stock update lost? | lost-update | Two local copies and one shared store |
| Why does a callback run first? | event-loop | Stack, microtask queue and timer queue |
| Which nodes are reachable? | graph-bfs | Frontier order, visits, cycles and distance |
| How does a list reverse without losing its tail? | reverse-linked-list | Saved next pointer and reversed prefix |
| Why does dynamic programming avoid repeated work? | coin-change | Smaller solved amounts and unreachable states |

For an interval sweep, compose a `cells` timeline, an event `store`, and a counter `box`. For a new API or storage protocol, write fresh participants and message traces. Keep these authored traces explicitly illustrative. If the user needs arbitrary editable inputs, add and test a bounded deterministic generator instead of presenting a fixed trace as a simulator.

Inputs are deliberately small enough to inspect. The public numeric controls accept finite values between -999 and 999, with at most six displayed characters. Each lesson sets its own item limit. Coin values must be positive integers; grid rows use 0 and 1. Invalid edits preserve the last valid scene.
