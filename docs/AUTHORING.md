# Authoring an explanation

Use `examples/catalogue.json` to choose a working starting point. Ask what the user needs to see, then choose the picture that exposes it. See [visual recipes](VISUAL-RECIPES.md) for the full family map and the distinction between editable simulations and composed traces.

| Question                                          | Representation                    | Starting point                |
| ------------------------------------------------- | --------------------------------- | ----------------------------- |
| What does each iteration keep or discard?         | Array, indices, pointers          | binary-search, sliding-window |
| What value has already been seen?                 | Array and map                     | two-sum                       |
| What returns from a recursive call?               | Tree and call stack               | balanced-tree                 |
| Which cells or vertices have been visited?        | Matrix or graph frontier          | number-of-islands             |
| Which request precedes another?                   | Sequence with request/reply paths | request-sequence              |
| Who owns this code or data?                       | C4 system/container boundaries    | c4-architecture               |
| Where does a key go?                              | Hash ring and ownership table     | consistent-hashing            |
| What is stored after an operation?                | Store with explicit rows          | key-value-store               |
| How can two correct-looking operations interfere? | Interleaving                      | lost-update                   |
| Where is work queued?                             | Queue, stack and moving token     | event-loop                    |

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

`npx tsx scripts/cli.ts new my-explanation --template <name>` accepts both gallery examples and the reusable scenes in `templates/`.

| Question to explain                               | Starting point       | Make visible                                      |
| ------------------------------------------------- | -------------------- | ------------------------------------------------- |
| Which keys move when a server joins?              | consistent-hashing   | Clockwise ownership and the changed interval      |
| Why does a retry create a duplicate?              | idempotent-retry     | Commit, lost response and deduplication           |
| Why did this cache evict a useful item?           | lru-cache            | Recency order and capacity                        |
| When do we retry a failed dependency?             | circuit-breaker      | Closed, open and half-open states                 |
| How do grid subproblems depend on each other?     | grid-paths           | Above/left dependencies and blocked cells         |
| Why must this recursive branch undo its state?    | subsets-backtracking | Current path, completed results and restoration   |
| How does a queue maintain priority?               | heap-insertion       | Parent/child order and the array representation   |
| Which service owns this responsibility?           | c4-architecture      | Person, system and container boundaries           |
| Which request waits on which service?             | request-sequence     | Messages, replies and failure paths               |
| Why is a stock update lost?                       | lost-update          | Two local copies and one shared store             |
| Why does a callback run first?                    | event-loop           | Stack, microtask queue and timer queue            |
| Which nodes are reachable?                        | graph-bfs            | Frontier order, visits, cycles and distance       |
| How does a list reverse without losing its tail?  | reverse-linked-list  | Saved next pointer and reversed prefix            |
| Why does dynamic programming avoid repeated work? | coin-change          | Smaller solved amounts and unreachable states     |
| How can a range total avoid rescanning?           | prefix-range         | Leading zero, two boundaries and subtraction      |
| How many tasks overlap at once?                   | interval-sweep       | Half-open intervals and end-before-start ordering |
| Why is a prefix not always a complete word?       | trie-prefix          | Shared path, missing child and terminal marker    |
| Are all required feature flags present?           | bitmask-flags        | Per-bit intersection and the whole required mask  |

The interval sweep template composes a `cells` timeline, interval boxes and active/peak counters. For a new API or storage protocol, write fresh participants and message traces. Keep these authored traces explicitly illustrative. If the user needs arbitrary editable inputs, add and test a bounded deterministic generator instead of presenting a fixed trace as a simulator.

Inputs are deliberately small enough to inspect. The public numeric controls accept finite values between -999 and 999, with at most six displayed characters. Each lesson sets its own item limit. Coin values must be positive integers; grid rows use 0 and 1. Invalid edits preserve the last valid scene.

## Show what travels

A connection shows where information _can_ go; a labelled token shows what is moving _now_. Name the actual request, key, value, coordinate, return value or control event. Use `label`, then `move`, then update the receiver after the movement ends and `hide` the consumed token. Use `drop` for a lost message and show the consequence, not a fabricated reply.

For example, send `key 60` from C to D before changing its owner in the table. Send `d=2` along a BFS edge before adding the newly discovered node to the frontier. In a trie, the marker carries the query character; in a heap swap, the two values travel in opposite directions. Explain when a token represents control state rather than a network message.

For a cell-level dependency, place an empty `text` actor at that cell's centre with `inspect: false`, then connect these anchors with a hidden link. The token remains visible during the transfer without adding permanent visual clutter. Check that its full label fits along the path. Do not animate static C4 ownership lines as if services themselves moved. Pointer reassignment changes references; it does not copy list nodes.

Verify before, during and after arrival, then scrub backwards and replay. The receiver must not display the result before the payload arrives. Keep related values in the inspector and captions so the meaning remains available when paused.

Additional tested starting points:

| Question                             | Template             | Contrasts                                           |
| ------------------------------------ | -------------------- | --------------------------------------------------- |
| Can a database write lose its event? | transactional-outbox | Commit, rollback, repeated delivery                 |
| Why did a read miss my write?        | replica-read         | Lagging replica, primary routing, caught-up replica |
| Why does a stack avoid rescanning?   | next-greater         | Mixed, decreasing and equal values                  |

These are authored explanations with reviewed synthetic traces. The outbox example assumes one transactional database and atomic consumer deduplication with its database effect; it does not promise exactly-once external side effects.

## Code language choices

A `code` block can include up to four `alternatives`. Each alternative contains `language` (`js`, `ts`, `python`, `java`, or `cpp`), `lines` and `sourceLines`. `sourceLines[i]` lists the original one-based lines explained by translated line `i + 1`; use an empty array for imports or type declarations. Keep every line within 58 characters. The schema rejects duplicate languages, missing mappings and references beyond the original code.

The player remembers a visitor's language choice and maps chapter highlights to that language. If a lesson has no matching alternative, it shows its original source and says so. Changing language never changes the timeline or simulation. These are teaching excerpts: imports, surrounding application types and service implementations may be omitted. Match the selected scenario and state the assumptions. Do not translate language-specific scheduling rules as if other runtimes behaved identically.

The public algorithm and portable-system code panels offer TypeScript, JavaScript, Python, Java and C++. JavaScript event-loop source stays in its original runtime. Sequence and C4 lessons teach requests and boundaries without inventing a code implementation. `npm run test:languages` compiles and executes the published Python, Java and C++ algorithm implementations against boundary and counterexample cases; it requires Python 3, a JDK and a C++17 compiler.

## Problem context

Algorithm lessons can include `problem: {statement, example, constraints, source}`. The `example` has `input`, `output` and `explanation` strings. The `source` has the LeetCode `number`, `title`, `slug`, a `relationship` of `exact` or `related`, and a `note` explaining any difference. Keep the task visible before the controls, and place the worked example and original constraints in the expandable section. Use an accurate restatement and link to the original prompt; avoid copying long source passages.

The renderer constructs LeetCode links from validated slugs and inserts every supplied string as text. It never accepts arbitrary source URLs or HTML. Original problem constraints may be much larger than the bounded interactive inputs; keep that distinction visible. A related technique must not be presented as a complete solution to a different problem.
