# Delivery checklist

Target: a public-ready desktop showcase and a downloadable local toolkit. Hosting account connection is deferred to the owner.

- [x] Inspect the existing renderer and catalogue to identify reusable visual families.
- [x] Establish a new repository with no inherited Git history or personal catalogue data.
- [x] Extract and audit the reusable renderer and selected general-purpose simulations.
- [x] Add a static showcase, searchable category filters and a theme switch.
- [x] Add a dismissible guided tour and labelled scripted prompt-to-visualization demo.
- [x] Add explicit toolkit download and local setup instructions, with a desktop-only notice.
- [x] Package a model-independent skill, templates, validator and local builder.
- [x] Seed algorithm, sequence, architecture, ring, grid, tree, storage and concurrency examples.
- [x] Verify diverse new prompts against templates; repair coverage gaps.
- [x] Add correctness, malicious-input, archive, privacy and server tests.
- [x] Run browser interaction and layout tests in light/dark and desktop widths.
- [x] Inspect actual rendered examples, transitions, open controls and tour visually.
- [x] Review the implementation and repair findings.
- [x] Return applicable renderer and authoring improvements to local Motion Lab.
- [ ] Commit milestones, push and merge scoped pull requests after verification.
- [x] Verify a fresh checkout and the downloaded toolkit.
- [x] Prepare Vercel/Railway configuration and exact manual deployment steps.

## Release gates

The site must work without an API key or model request. Unknown lessons and files return 404. The download contains only an explicit allowlist. No generated local work enters a build or archive. Diagrams have manual playback, reversible scrubbing, scenarios, readable labels and relevant code/complexity. The scripted generation example is visibly labelled. Local AI generation remains subject to the user's chosen assistant and source permissions.

## Commit boundaries

1. Standalone renderer, public showcase and local skill.
2. Expanded authoring templates, correctness and desktop interaction checks.
3. Hosting configuration, production smoke checks and deployment handoff.

No fabricated history or backdated commits.

## Account-dependent steps

- [ ] Owner connects the GitHub repository to Vercel or Railway.
- [ ] Run the live smoke check on the resulting public URL.
- [ ] Owner reviews the live site before using its link.
- [ ] Optional: enable the prepared GitHub Actions workflow and verify its first run. The current OAuth login cannot upload workflow files; hosting does not depend on this step.

No application form is part of this workflow.
