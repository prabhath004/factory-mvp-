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

- [ ] Keyboard flow covers create mission, approve plan, change tabs, and answer question.
- [x] No fabricated metrics or actions.
- [ ] Layout works at 1440px, 1280px, 768px, and 390px.

## Phase 4: Verification and handoff

- [x] Add deterministic Playwright coverage for the credential-free mission flow or document the exact environment blocker.
- [x] Write `docs/COFORGE_LOCAL_SETUP.md` and `docs/COFORGE_DEMO_RUNBOOK.md`.
- [ ] Run focused tests, full available regressions, lint, build/type-check, dependency audit, and secret scan.
- [ ] Review the full diff for correctness, security, accessibility, and unnecessary complexity.

### Checkpoint: complete

- [ ] Every implemented P0 behavior has test evidence.
- [ ] External credential-dependent validation is explicitly distinguished from local verification.
- [ ] Known limitations and the upstream security upgrade are handed off.
