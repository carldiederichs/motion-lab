# Code quality

Runtime source, build tools and tests are TypeScript. The compiler checks every file; tests use the same rules as production code.

## Required checks

Run `npm run check` before a commit. It checks types, type-aware lint rules and formatting. Run `npm test` for contract, correctness and security checks, then build and run the browser suite for changes that affect rendering or interactions.

- Strict null checking, indexed-access checks and exact optional properties are enabled.
- Functions declare return types. Imports that exist only for types use `import type`.
- `any`, non-null assertions, unsafe calls and assignments, ignored promises and TypeScript suppression comments are rejected.
- Discriminated-union switches must handle every case. Unknown input is narrowed at a boundary before use.
- Runtime errors must explain unsupported input; do not silently trim data to make a scene render.

`engine/model.ts` defines the scene contracts with Zod and derives the TypeScript types from them. `engine/inputs.ts` defines bounded generator inputs. `scripts/renderer.ts` checks references between actors, links, tokens and actions before producing HTML. A valid shape still needs correctness tests and visual review.

## Source layout

| Path                                                    | Responsibility                                                                 |
| ------------------------------------------------------- | ------------------------------------------------------------------------------ |
| `engine/model.ts`, `engine/inputs.ts`                   | Data contracts and input limits                                                |
| `engine/generators.ts`, `engine/extended-generators.ts` | Deterministic scene construction                                               |
| `engine/event-loop.ts`                                  | Restricted event-loop interpreter                                              |
| `engine/player.ts`, `engine/player-types.ts`            | Playback, SVG rendering and controls                                           |
| `site/`                                                 | Public gallery, guided tour and local setup                                    |
| `scripts/`                                              | Validation, static builds, archive, serving and release checks                 |
| `tests/`                                                | Independent correctness checks, malformed-input cases and browser verification |

Keep changes focused. Use a concrete type when a shape is known and `unknown` at an untrusted boundary. A runtime guard should check a real invariant, not disguise an unchecked assertion. Add abstractions only when they make ownership, state or a repeated operation easier to understand.

Production serves static files. The container includes a bundled server and the static output; it does not need a package installer, model credentials or a writable filesystem to run. The downloaded toolkit includes source and the lockfile, so its dependencies can be installed reproducibly with `npm ci --ignore-scripts`.
