# Motion and complexity review

The public gallery and all authoring templates use the same player. Payload labels stay visible during transport; arrival precedes the receiving update. QA samples intermediate frames and reconstructs earlier states for reverse scrubbing.

| Example or template                 | What moves, or why no packet is needed                                                                                                                    |
| ----------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Two Sum                             | Complement lookup, missing/index reply and value-to-index insertion. Repeated scan moves only its labelled index pointer.                                 |
| Sliding Window                      | Entering/leaving values reach the running sum. Brute-force operands travel on each addition too.                                                          |
| Binary Search                       | Labelled bounds and midpoint move; the array stays in place. No values are copied between nodes.                                                          |
| Number of Islands                   | A coordinate travels from the DFS frontier to its grid cell before the visit is applied.                                                                  |
| Balanced Tree                       | Recursive calls and returned heights travel along tree edges.                                                                                             |
| Consistent Hashing                  | Each affected key travels from C to D before the ownership table changes. Boundary/wrap cases preserve unaffected ownership.                              |
| Key-value Store                     | The key/value operation enters the store; the concrete return value travels back.                                                                         |
| Event Loop                          | Stable callback IDs move through queues and into the call stack; rows identify their source line or timer deadline.                                       |
| Lost Update                         | Reads, local values, writes and compare-and-set outcomes travel between workers and the store.                                                            |
| Request Sequence / Idempotent Retry | Requests, replies and lost responses carry their message labels; retries preserve their identity.                                                         |
| C4 Architecture                     | A concrete interaction carries request/data/status labels across boundaries. Static boundaries represent ownership. Failed queries produce no data reply. |
| Reverse Linked List                 | Arrows change direction and named references change targets. Nodes stay in place; there is no data copy to animate.                                       |
| Coin Change                         | A previous DP value travels into the candidate calculation; the chosen minimum returns to the table.                                                      |
| BFS                                 | A candidate distance traverses each outgoing edge. Already seen nodes reject rediscovery.                                                                 |
| LRU Cache                           | The key operation enters the cache; the evicted key travels out. Recency is an ordering change within the store.                                          |
| Circuit Breaker                     | Threshold, timer and probe-result events move the active state. State nodes are not separate servers.                                                     |
| Grid Paths                          | Counts from above/left arrive before a cell is filled. Blocked cells do not accept paths.                                                                 |
| Subsets                             | A copy of the chosen values travels to results; undo changes only the working path.                                                                       |
| Heap Insertion                      | Child and parent values travel in opposite directions before their labels swap.                                                                           |
| Prefix Range                        | The previous total and next input value arrive before a prefix entry changes. Query bounds select existing totals.                                        |
| Interval Sweep                      | A labelled time pointer advances over events; active/peak counters change locally. No object is transported between systems.                              |
| Trie Prefix                         | Each query character follows its matching child edge before the node becomes active.                                                                      |
| Bitmask Flags                       | Per-bit comparison and intersection happen in place; a mask is not a moving message.                                                                      |
| Transactional Outbox                | Order/event write, committed event, delivery, acknowledgement and duplicate retry.                                                                        |
| Replica Read                        | Write, commit acknowledgement, replication record, read and versioned response.                                                                           |
| Next Greater                        | An index/value enters the stack; its resolved greater value travels to the result.                                                                        |

## Complexity boundaries

Complexity panels describe the displayed algorithm, excluding the supplied input and the player’s retained animation snapshots. Map access is an expected constant-time assumption. BFS uses adjacency lists and a head index: O(V + E) time, O(V) auxiliary space; V counts vertices and E edges. Sliding Window primes its sum without copying an array: O(n) time and O(1) extra space.

Binary Search assumes sorted input; sorting is separate. The ring uses a linear lookup over v positions; initial sorting/rebuilding costs O(v log v). Map sorting also includes copying n entries and assumes bounded comparison cost. Repeated tree heights retain an explicitly loose O(n²) upper bound: the balanced case is O(n log n), and an unbalanced tree can stop earlier. It is not a claim that every input takes quadratic time.

The other displayed bounds cover one-pass hash lookup, pointer reversal, grid visitation, amount-by-denomination DP, prefix construction/query, interval sorting, trie lookup and fixed-width masks. Next Greater pushes and pops each index at most once. Protocol/architecture traces have no algorithmic complexity badge unless a specific algorithm and cost model are supplied.

## Evidence boundaries

Semantic tests compare algorithms with independent references, assert hash ownership boundaries, BFS cycle handling, outbox rollback/deduplication and replica routing. Browser tests check actual packet labels and arrival state, reverse scrubbing, both themes, code contrast and three desktop widths. Fresh ZIP and checkout checks create, revise, build, verify and locally serve the three additional engineering cases, then confirm that production cannot serve them.

No model API is called by these tests. They verify the builder and the supplied authoring workflow, not every assistant or arbitrary generated explanation. New topics still require semantic and visual review.
