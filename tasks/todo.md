# Coforge P0 tasks

## Phase 0: Audit and contract

- [x] Record upstream revision, source contract, lifecycle, telemetry, UI, license, and baseline checks in `docs/COFORGE_UPSTREAM_AUDIT.md`.
- [ ] Define mission/project schemas, typed contracts, state transitions, and migration.

### Checkpoint: foundation

- [ ] Migration and schema type-check.
- [ ] Pure contract/state tests pass.

## Phase 1: Source and lifecycle

- [ ] Implement the Coforge source adapter with idempotent claim, writeback, question/reply, stop, retry, note, and local execution overrides.
- [ ] Register Coforge without changing the Linear adapter or generic runner behavior.
- [ ] Add adapter and generic lifecycle regression coverage.

### Checkpoint: execution seam

- [ ] Approved mission is offered once and maps to one `coforge` job.
- [ ] Stage, stop, reply, and retry transitions are durable and replay-safe.
- [ ] Existing source regressions remain compatible.

## Phase 2: Planner and authenticated API

- [ ] Implement project and mission services with ownership, validation, plan versioning, stale-approval protection, and request idempotency.
- [ ] Add authenticated Factory project/mission/provider/runner route handlers with consistent errors.
- [ ] Add stop, retry, reply, event, evidence, and usage projections over existing runner records.

### Checkpoint: API

- [ ] Unauthorized, invalid, duplicate, stale, and happy-path contract tests pass.
- [ ] Next.js type-check and lint pass.

## Phase 3: Product UI

- [ ] Add Projects and Missions navigation and a responsive mission table with honest runner/cost/PR states.
- [ ] Add the new-mission composer and editable plan approval flow.
- [ ] Add the three-region mission workspace with task, activity, logs/evidence, PR, usage, question, stop, and retry surfaces.
- [ ] Add loading, empty, error, stale/disconnected, and mobile states.

### Checkpoint: product flow

- [ ] Keyboard flow covers create mission, approve plan, change tabs, and answer question.
- [ ] No fabricated metrics or actions.
- [ ] Layout works at 1440px, 1280px, 768px, and 390px.

## Phase 4: Verification and handoff

- [ ] Add deterministic Playwright coverage for the credential-free mission flow or document the exact environment blocker.
- [ ] Write `docs/COFORGE_LOCAL_SETUP.md` and `docs/COFORGE_DEMO_RUNBOOK.md`.
- [ ] Run focused tests, full available regressions, lint, build/type-check, dependency audit, and secret scan.
- [ ] Review the full diff for correctness, security, accessibility, and unnecessary complexity.

### Checkpoint: complete

- [ ] Every implemented P0 behavior has test evidence.
- [ ] External credential-dependent validation is explicitly distinguished from local verification.
- [ ] Known limitations and the upstream security upgrade are handed off.
