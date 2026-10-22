# Verification strategy

Use synthetic data throughout. Tests and failure artifacts must never depend on a personal catalogue, external account, API key or private project.

## Separate failure classes

- **Algorithm correctness:** compare deterministic simulations with independent reference algorithms across many inputs. Check the resulting state, not only whether a page renders.
- **Spec safety:** reject malformed references, unsupported actions, path traversal, oversized inputs, prototype keys and unknown generators. Script-shaped labels remain text.
- **Release isolation:** build and archive from allowlists. Place synthetic canaries outside them, check that neither public output nor download contains them, and refuse symlinks.
- **Real browser behaviour:** exercise every variant and edge preset in both themes. Sample the timeline every 40ms to check box overlap, connector paths, label width, token motion, store height, contrast and deterministic backward scrubbing. Test search, filters, the tour, keyboard controls, model-free demo and user-triggered download.
- **Desktop layout:** 1024, 1440 and 1920px widths, code and complexity panels, comparison mode, dialog and tour positions. Capture screenshots and inspect actual pixels in addition to assertions.
- **Portable setup:** unpack the actual downloadable ZIP, install locked dependencies and build, create a local explanation and serve the production output. Repeat from a fresh Git checkout.
- **Deployment:** build the Docker image when a daemon is available; run the live HTTP smoke check only after a provider is connected. Local success does not substitute for this last check.

## Commands

See [deployment checks](DEPLOYMENT.md#before-each-release). `npm run check` enforces strict typing, type-aware lint and formatting across runtime, tooling and tests. `npm test` runs the fast Node tests. `npm run test:browser` runs Playwright. The browser suite uses installed Google Chrome on macOS and downloaded Chromium on Linux. Browser traces and screenshots are ignored under `artifacts/`.

For a newly authored local explanation:

```sh
npx tsx scripts/cli.ts validate local/my-explanation.json
npx tsx scripts/cli.ts build local/my-explanation.json
npx tsx scripts/verify.ts local/my-explanation.html
```

Check its reasoning and code too. Geometry checks cannot establish that an arbitrary explanation is true. The event-loop demo supports a small documented JavaScript subset; it never executes arbitrary pasted JavaScript. Sequence and C4 scenes explain selected traces and responsibilities, not full distributed-system implementations.

## Review criteria

A preset must change the explanation. Each comparison must show the code and complexity of the selected method. Unsupported inputs should show a useful error while preserving the last valid visualization. A tour must be dismissible, keep focus inside it and return focus when closed. Text is never silently truncated to fit a misleading diagram.

The public catalogue is deliberately curated. The local assistant can compose other questions from the documented primitives; no claim is made that every model or arbitrary prompt produces a correct visualization on its first attempt.

## Responsive preview and code languages

The landing hero, scripted prompt and compact interactive preview have separate controls and tests. Desktop wheel gestures move between screen-sized sections; longer libraries remain scrollable. Phones use normal scrolling and compact spacing. The embedded explanation keeps input editing, reset, steps, timeline progress, prediction and code languages. Comparison and inspection stay in the full workspace. Desktop previews fit one screen; short phones allow natural scrolling to keep the diagram readable. On narrow screens the ownership table sits inside the ring, with code in a dismissible overlay. Full walkthroughs provide a diagram zoom/pan control.

Browser checks cover 360×640, 390×844 and 844×390, plus the desktop matrix, in both themes. Inspect the screenshots as well: viewport bounds do not catch collisions between labels inside an SVG. Tour tests exercise every step and focus restoration. Prediction tests cover timed playback, stepping and direct chapter selection before the answer is visible. Language selection checks persistence, fallback and mapped chapter highlights. Input tests cover huge pasted numbers, malformed text, decimals, too many keys, empty input, duplicates, wraparound, interval boundaries, reset and changes during playback. Rejected input keeps the previous valid state; it never becomes a diagram label.

CI runs the compiled-language checks through the `npm test` posttest hook. Locally, run `npm run test:languages` with Python 3, Java 17+ and a C++17 compiler to compile and execute the actual translated algorithm snippets. Optional `MOTION_JAVA`, `MOTION_JAVAC` and `CXX` variables select installed compilers. These checks use synthetic cases and no model requests. They complement the simulation tests; explanatory service fragments still require review of their stated assumptions.
