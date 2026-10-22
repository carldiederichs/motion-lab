# Choosing a visual recipe

Choose the representation from the state the reader needs to understand. A new topic usually needs new actors, captions and transitions, not a new renderer.

The examples below provide tested starting points. **Compose** means the renderer supplies the shapes and playback, while the new algorithm or protocol still needs an authored trace and its own correctness check. **Editable** means the named example already recomputes the scene for bounded input changes.

| Family                   | Show                                               | Starting point                                              | Mode               |
| ------------------------ | -------------------------------------------------- | ----------------------------------------------------------- | ------------------ |
| Hashing and frequency    | Seen values, counts and lookups                    | two-sum, key-value-store                                    | Editable           |
| Two pointers             | Two named indices and the region between them      | sliding-window; adapt the pointer actions                   | Compose            |
| Sliding window           | Entering/leaving values and the retained total     | sliding-window                                              | Editable           |
| Prefix sums              | Leading zero and two range boundaries              | prefix-range                                                | Compose            |
| Binary search            | Shrinking interval and midpoint decisions          | binary-search                                               | Editable           |
| Stack                    | Push, top, pop and unresolved items                | event-loop; reuse its store representation                  | Compose            |
| Linked lists             | Saved next pointer and changed links               | reverse-linked-list                                         | Editable           |
| Trees                    | Child visits, return values and call stack         | balanced-tree                                               | Editable           |
| Tries                    | Shared prefix and terminal marker                  | trie-prefix                                                 | Compose            |
| Priority queues          | Parent/child order and array positions             | heap-insertion                                              | Compose            |
| Backtracking             | Current choices, completed results and undo        | subsets-backtracking                                        | Compose            |
| Graph traversal          | Frontier, visited nodes and distance               | graph-bfs                                                   | Editable           |
| Dynamic programming      | Dependencies and previously solved states          | coin-change, grid-paths                                     | Editable / compose |
| Greedy choices           | Ordered candidates, accepted set and the invariant | interval-sweep; author selection steps and a counterexample | Compose            |
| Intervals                | Shared axis, boundaries and overlap                | interval-sweep                                              | Compose            |
| Line sweep               | Ordered events and changing active count           | interval-sweep                                              | Compose            |
| Matrices                 | Coordinates, neighbours and visited cells          | number-of-islands                                           | Editable           |
| Bit operations           | Per-bit state and required mask                    | bitmask-flags                                               | Compose            |
| Numeric invariants       | Operands, transformation and preserved quantity    | cells and value boxes from prefix-range                     | Compose            |
| Index placement          | Value, destination index and swaps                 | cellValue actions and named pointers                        | Compose            |
| Stateful data structures | Operation, stored state and returned value         | key-value-store, lru-cache                                  | Editable / compose |
| Design choices           | Alternatives, responsibilities and decision path   | c4-architecture, circuit-breaker                            | Compose            |
| Request protocols        | Participants, messages and failure/retry paths     | request-sequence, idempotent-retry                          | Compose            |
| Ownership on a ring      | Key position, owner and changed interval           | consistent-hashing                                          | Editable           |
| Concurrency              | Shared state and competing operations              | lost-update                                                 | Editable           |

For example, “Why did this worker retry a completed job?” needs a request trace and a durable completion record. Start with `idempotent-retry`, rename the participants and write the actual commit/retry sequence. “Why does my cache evict this key?” needs recency state, so start with `lru-cache`. “Why does this parser revisit a token?” may need both an indexed input and a stack; compose them in one scene and highlight the transition that moves each pointer.

Every new explanation must state its assumptions, include meaningful contrasting cases, and pass the schema, semantic and visual checks in [the authoring guide](AUTHORING.md). A recipe is not proof that an arbitrary generated explanation is correct. For continuous coordinates, large graphs or unrestricted programs, reduce the question to a small, inspectable model or implement a separately tested renderer extension.
