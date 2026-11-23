# Coforge P0 tasks

## Phase 0: Audit and contract

- [x] Record upstream revision, source contract, lifecycle, telemetry, UI, license, and baseline checks in `docs/COFORGE_UPSTREAM_AUDIT.md`.
- [x] Define mission/project schemas, typed contracts, state transitions, and migration.

### Checkpoint: foundation

- [x] Migration and schema type-check.
- [x] Pure contract/state tests pass.

## Phase 1: Source and lifecycle

- [x] Implement the Coforge source adapter with idempotent claim, writeback, question/reply, stop, retry, note, and local execution overrides.
- [x] Register Coforge without changing the Linear adapter or generic runner behavior.
- [x] Add adapter regression coverage; the credentialed generic lifecycle suite remains an environment-gated final check.

### Checkpoint: execution seam

- [x] Approved mission is offered once and maps to one `coforge` job by database uniqueness.
- [x] Stage, stop, reply, and retry transitions are durable and replay-safe.
- [ ] Existing source regressions remain compatible. (Credentialed Neon harness unavailable locally.)

## Phase 2: Planner and authenticated API

- [x] Implement project and mission services with ownership, validation, plan versioning, stale-approval protection, and request idempotency.
- [x] Add authenticated Factory project/mission/provider/runner route handlers with consistent errors.
- [x] Add stop, retry, reply, event, evidence, and usage projections over existing runner records.

### Checkpoint: API

- [ ] Unauthorized, invalid, duplicate, stale, and happy-path database contract tests pass. (Credentialed Neon harness unavailable locally.)
- [x] Next.js type-check and lint pass.

## Phase 3: Product UI

- [x] Add Projects and Missions navigation and a responsive mission table with honest runner/cost/PR states.
- [x] Add the new-mission composer and editable plan approval flow.
- [x] Add the three-region mission workspace with task, activity, logs/evidence, PR, usage, question, stop, and retry surfaces.
- [x] Add loading, empty, error, stale/disconnected, and mobile states.

### Checkpoint: product flow

- [ ] Keyboard flow covers create mission, approve plan, change tabs, and answer question. (Real-browser DevTools MCP and authenticated local environment unavailable.)
- [x] No fabricated metrics or actions.
- [ ] Layout works at 1440px, 1280px, 768px, and 390px. (Responsive CSS implemented; screenshot review requires the authenticated local environment.)

## Phase 4: Verification and handoff

- [x] Add deterministic Playwright coverage for the credential-free mission flow or document the exact environment blocker.
- [x] Write `docs/COFORGE_LOCAL_SETUP.md` and `docs/COFORGE_DEMO_RUNBOOK.md`.
- [x] Run focused tests, full available regressions, lint, build/type-check, dependency audit, and secret scan. (Credentialed regressions are blocked; dependency audit findings remain for the security upgrade.)
- [x] Review the full diff for correctness, security, accessibility, and unnecessary complexity.

## Phase 5: Local product runtime

- [x] Install pinned PStack for both Codex and Claude Code from the runner installer.
- [x] Install the four Coforge execution skills for both local harnesses.
- [x] Clone GitHub App-authorized repositories into the managed repository directory automatically.
- [x] Register managed checkouts with both the runner and T3.
- [x] Complete repository onboarding locally without requiring Modal or Linear.
- [x] Install the pinned Playwright MCP runtime and route browser evidence to the factory reporter.
- [x] Verify the live owner, repository, project, provider, and runner API paths.

### Checkpoint: complete

- [ ] Complete one user-directed mission through a verified pull request; infrastructure and live API paths are verified.
- [x] External credential-dependent validation is explicitly distinguished from local verification.
- [x] Known limitations and the upstream security upgrade are handed off.
