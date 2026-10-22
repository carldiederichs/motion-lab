# Release review

The application is live at [motion-lab-alpha-three.vercel.app](https://motion-lab-alpha-three.vercel.app/). Vercel builds the connected GitHub repository's `main` branch. The initial production release included commit `4546bb9`.

## Delivered

- Fifteen interactive examples across algorithms, data structures, architecture, requests, storage and concurrency.
- Twelve authoring templates: LRU caching, circuit breakers, grid paths, subsets, heap insertion, prefix ranges, interval sweeps, tries, bit flags, transactional outbox delivery, replica reads and next-greater stacks.
- Search and category filters, a guided tour, light/dark themes and a labelled scripted generation demo.
- An explicitly triggered toolkit download and a portable skill for the visitor's own coding assistant.
- Static Vercel configuration and a Railway-compatible, non-root Docker server.

## Verified for this release

| Check                  | Result                                                                                                      |
| ---------------------- | ----------------------------------------------------------------------------------------------------------- |
| Node tests             | 92 passed                                                                                                   |
| Browser tests          | 155 passed, including arrival timing, reverse scrubbing, code contrast, exact clipboard text and navigation |
| Transfer timing        | Payload labels, receiving state and reverse scrubbing covered by browser and semantic checks                |
| Desktop layouts        | 1024, 1440 and 1920px; light and dark                                                                       |
| Visual review          | Inspected rendered screenshots of all 15 public examples; interacted with the landing page and tour         |
| Toolkit ZIP            | Unpacked, installed locked dependencies, built, created and revised three engineering explanations          |
| Fresh Git checkout     | Strict checks, build, revised authoring, local serving, production routes and isolation passed              |
| Privacy audit          | No findings in the current release files and static output                                                  |
| Docker                 | Built and served all lessons, assets and toolkit; protected routes returned 404                             |
| Container restrictions | Non-root user, read-only filesystem and all Linux capabilities dropped                                      |
| Public deployment      | Unauthenticated smoke check passed for all 15 lessons, assets, download and private-route isolation         |
| Deployed code          | Public runtime and toolkit files compared with the released source                                          |
| Live Chrome review     | BFS transport and code panel, setup commands, both themes and representative authored cases                 |

The browser suite checks every example and template in both themes, timeline geometry, scenario changes, controls, inputs, search, tour positioning and explicit downloads. Algorithm tests use independent reference implementations where applicable. See [the testing strategy](TESTING.md) for the checks and their limits.

The transport and complexity review is recorded in [the catalogue audit](TRANSPORT-AUDIT.md). Code follows both themes, including highlighted lines. BFS uses a head-index queue, local setup supports the visitor's own question, and chapter selection shows the selected result.

Review fixes included incorrect comparison code, invalid-input recovery, long code lines, overlapping graph edges, lingering sequence packets, off-screen tour targets and chapter buttons showing an earlier state than their captions described.

## Remaining owner steps

1. Review the [live site](https://motion-lab-alpha-three.vercel.app/) before using its link.
   GitHub Actions is enabled in `.github/workflows/verify.yml`. The first full hosted verification passed; each pull request now runs type checks, lint, formatting, unit tests, browser tests, clean-install checks and Docker smoke tests.

The examples use synthetic inputs. Generated local work is excluded from the public build and download. The demo makes no model request. New explanations depend on the visitor's chosen assistant and still require semantic and visual review. Phone authoring and arbitrary JavaScript execution are outside the supported scope.

## Strict source contracts

All runtime source, scripts and tests use strict TypeScript with checked indexed access and exact optional properties. Type-aware lint rejects unsafe types, non-null assertions, ignored promises and suppression comments. [Code standards](CODE-QUALITY.md) explain the boundaries.
