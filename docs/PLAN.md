# Delivery checklist

Target: a public responsive showcase and a downloadable local toolkit. Live on [Vercel](https://motion-lab-dev.vercel.app/).

- [x] Inspect the existing renderer and catalogue to identify reusable visual families.
- [x] Establish a new repository with no inherited Git history or personal catalogue data.
- [x] Extract and audit the reusable renderer and selected general-purpose simulations.
- [x] Add a static showcase, searchable category filters and a theme switch.
- [x] Add a dismissible guided tour and labelled scripted prompt-to-visualization demo.
- [x] Add explicit toolkit download and local setup instructions, with desktop authoring instructions.
- [x] Package a model-independent skill, templates, validator and local builder.
- [x] Seed algorithm, sequence, architecture, ring, grid, tree, storage and concurrency examples.
- [x] Verify diverse new prompts against templates; repair coverage gaps.
- [x] Add correctness, malicious-input, archive, privacy and server tests.
- [x] Run browser interaction and layout tests in light/dark and desktop widths.
- [x] Inspect actual rendered examples, transitions, open controls and tour visually.
- [x] Review the implementation and repair findings.
- [x] Return applicable renderer and authoring improvements to local Motion Lab.
- [x] Commit milestones, push and merge scoped pull requests after verification.
- [x] Verify a fresh checkout and the downloaded toolkit.
- [x] Prepare Vercel/Railway configuration and exact manual deployment steps.

## Release gates

The site must work without an API key or model request. Unknown lessons and files return 404. The download contains only an explicit allowlist. No generated local work enters a build or archive. Diagrams have manual playback, reversible scrubbing, scenarios, readable labels and relevant code/complexity. The scripted generation example is visibly labelled. Local AI generation remains subject to the user's chosen assistant and source permissions.

## Commit boundaries

1. Standalone renderer, public showcase and local skill.
2. Expanded authoring templates, correctness and desktop interaction checks.
3. Hosting configuration, production smoke checks and deployment handoff.

No fabricated history or backdated commits.

Authoring and deployment work landed through [PR 1](https://github.com/carldiederichs/motion-lab/pull/1) and [PR 2](https://github.com/carldiederichs/motion-lab/pull/2). See [the release review](RELEASE-REVIEW.md) for observed results and remaining setup.

## Account-dependent steps

- [x] Connect the GitHub repository to Vercel with the owner's approval and deploy `main`.
- [x] Run the live smoke check on the public URL and inspect the deployed site in Chrome.
- [ ] Owner reviews the live site before using its link.
- [x] Enable the GitHub Actions workflow and verify its first hosted run.

No application form is part of this workflow.

## Gallery visual follow-up

- [x] Check current hosting options against this static application.
- [x] Stop the hero connector outside server labels in both ownership states.
- [x] Give each gallery preview a distinct, relevant representation of its topic.
- [x] Verify geometry, both themes and desktop widths; inspect the rendered changes.
- [x] Commit, publish and merge the verified update through [PR 3](https://github.com/carldiederichs/motion-lab/pull/3).

## Strict source and authoring follow-up

- [x] Apply strict TypeScript, type-aware lint and formatting to runtime, tools and tests.
- [x] Validate external scene data and reject unsupported generator inputs without truncation.
- [x] Add prefix-range, interval, trie and bitmask templates and correctness checks.
- [x] Document visual families and distinguish editable simulations from composed traces.
- [x] Verify installation from the toolkit and a fresh checkout, plus read-only container serving.
- [x] Enable hosted verification and check its first full run.

## Learning workflow and transport follow-up

- [x] Carry labelled requests, values, results and control events between actors, with receiving state updated after arrival.
- [x] Review every public example and authoring template for movement semantics.
- [x] Make code panels follow the active theme and verify text contrast.
- [x] Explain complexity variables and align the displayed BFS and window algorithms with their bounds.
- [x] Clarify local skill invocation and preserve the exact visible command when copying.
- [x] Add transactional outbox, replica-read and monotonic-stack authoring cases.
- [x] Fix chapter selection, End navigation and theme switching from explicit theme links.
- [x] Verify intermediate frames, reverse scrubbing, desktop layouts and fresh authoring.

See [the transport audit](TRANSPORT-AUDIT.md) for per-family behavior and verification limits.

## Responsive preview and language follow-up

- [x] Animate the hero and type the prompt with a blinking cursor; respect manual pause and reduced motion.
- [x] Fit desktop sections to the viewport and keep long content reachable.
- [x] Adapt the landing page, gallery, walkthroughs, setup and guided tour to phones.
- [x] Keep editable inputs, reset, steps, timeline progress, prediction and code access in the compact landing preview.
- [x] Reject extreme or malformed input without distorting the diagram; cover empty inputs, repeated positions, boundaries and edits during playback.
- [x] Hide the unjoined server and keep ring lines clear of slot labels.
- [x] Offer five code languages with correct scenario code and chapter highlights.
- [x] Preserve strict TypeScript and verify language examples by compiling and running them.
- [x] Run the full browser suite and test a clean downloaded toolkit.

Release details and verification boundaries are in [the release review](RELEASE-REVIEW.md).

## First-visit and problem context follow-up

- [x] Explain the product before introducing the animated server example.
- [x] Replace promotional fragments with concrete descriptions.
- [x] Make GitHub, cloning and the MIT license visible; retain an optional ZIP.
- [x] Add sourced problem statements, examples and constraints to all algorithm pages.
- [x] Distinguish related LeetCode exercises from exact problem walkthroughs.
- [x] Center hero controls and keep the step count beside them.
- [x] Configure the shorter production address and update public references.
- [x] Cover safe problem rendering, setup links, themes, mobile and toolbar alignment with regression checks.
