# Coforge upstream audit

Audited on 2026-11-22 against `ski043/marshal-factory` commit
`999ad209598517a4c826073b5a0edc2a4097a4fa` (`main`).

## License and provenance

The checkout has no `LICENSE`, `COPYING`, or `NOTICE` file. GitHub is the only configured
remote (`https://github.com/ski043/marshal-factory.git`). Until the upstream author publishes
license terms, this checkout must be treated as source-available for evaluation rather than as a
redistributable open-source dependency. Coforge changes should retain upstream history and
attribution.

## Stack and baseline

- Next.js 16.4.2, React 19.3.0, TypeScript 5.9.3, Tailwind CSS 4.3.3.
- Bun is pinned to 1.4.4 in `package.json`; the audit machine did not initially have Bun, so the
  official versioned installer was used.
- Drizzle ORM 0.45.4 with PostgreSQL/Neon. Schema is in `db/schema.ts`; migrations are ordered SQL
  files under `drizzle/`.
- Neon Auth implements an allowlisted, email-verified owner account. Panel data loaders and live
  query renewal call `assertOwner()`.
- The repository contains no standalone unit-test runner. Regression scripts execute against a
  disposable Neon branch created by `scripts/test-branch.ts`.

Baseline commands:

| Command | Result |
| --- | --- |
| `bun install --frozen-lockfile` | Passed; 842 packages installed. Six dependency postinstalls remain blocked by the checked-in Bun policy. |
| `bun run lint` | Passed. |
| `bun run test:regressions` | Environment-blocked before tests: no `NEON_PROJECT_ID` or `.neon` context. |
| `bun run build` | Compilation and TypeScript passed; route data collection failed because `NEON_AUTH_COOKIE_SECRET` is absent. Next.js also reported 16.4.2 as security-affected and recommended a security upgrade. |

No live Linear, GitHub, Neon, T3, or Modal credentials were present, so no upstream job was
launched during the audit.

## Source contract and persistence

`JobSource` is derived from the keys of `SHIPPED` in `lib/sources/shapes.ts`. At the audited
revision the only shipped discriminant is `linear`.

- Linear writeback: `{ kind: "linear", issueId: string }`.
- Linear source state: `{ state: string | null, labels: string[], labelGroups,
  factoryCommentIds: string[] }`.
- `jobs.source` is already text, not a PostgreSQL enum. Migration `0030_job_source_text.sql`
  deliberately enables additional sources.
- A job id is `${source}:${externalId}` and the database enforces that relationship.
- `lib/sources/index.ts` is the sole registry. Runner claim, launch, stop, reply, writeback, merge,
  and retry paths use `SourceAdapter`; `scripts/fake-source-regressions.ts` proves a non-Linear
  adapter can traverse the lifecycle without runner-specific branching.

The full adapter contract is `ready`, `announceClaim`, `writeBack`, `replies`,
`acknowledgeReplies`, `stopWanted`, `confirmStop`, `note`, `overrides`, `labels`, `reopen`,
`requeue`, and `describe`, plus optional webhook, filing, reply, label-sync, upload, and image
localization capabilities.

## Linear coupling

- Intake: `panelSource()` is hardcoded to `linear`; the new-job action files a Linear issue and the
  image route uploads to Linear storage.
- UI: new-job copy and success actions explicitly say “Linear”. Existing jobs remain otherwise
  source-neutral through stored URLs and source labels.
- Webhooks: the ingest function dispatches registered source webhooks generically, but the install
  script only installs Linear and GitHub webhooks.
- Configuration: `linearApiKey`, team key, and factory label are required by upstream setup and the
  Linear adapter, not by the generic runner.
- Replies, notes, lifecycle writeback, and failed-job relabeling are implemented in
  `lib/sources/linear.ts`; runner and inbox code call the adapter interface.
- Job titles, descriptions, branches, run links, PR monitoring, evidence, merge decisions, and
  cleanup are source-neutral after claim.

## Runner lifecycle

- `claim()` polls every registered source and atomically inserts or reclaims jobs under a shared
  PostgreSQL advisory lock. A row insert is the claim; retry increments `attempt` only when
  `canReclaimSql` allows it.
- Capacity is bounded by `factory.maxInFlight` (default 4). Coforge will additionally document a
  recommended value of 1 for the MVP demo.
- Local launches fetch the repo and ask T3 to create a worktree from `origin/main`; branch names are
  `factory/<job-key>` with an attempt suffix after the first try.
- The runner serializes intents/ticks, applies hard step timeouts, and performs a comprehensive
  startup reconciliation. A 90-second default tick handles claims, PR checks, watchdog, usage,
  and writeback; cleanup runs hourly.
- Waiting jobs resume the same T3 thread when available. If the thread is gone, persisted
  question/answer context is supplied to a replacement thread.
- Stop is a durable, idempotent intent with source re-confirmation and bounded interrupt/termination
  handling. Failed retries preserve the previous failure and use a new attempt branch.
- The watchdog nudges tracked Claude sessions and fails missing threads. Quiet Codex sessions are
  not failed solely for missing activity because their live activity is not reported.

## T3, worktrees, providers, and usage

- T3 is an external CLI, discovered from `T3CODE_CLI_PATH`, `~/.t3/bin/t3`, or `PATH` depending on
  the call site. The runner inventory reads T3 runtime state, provider instances, enabled flags,
  current models, and server version from the local T3 state directory.
- The audited operations guide pins sandbox tooling to T3
  `0.1.3-nightly.20261023.3566`, Claude Code `2.1.310`, Codex `0.164.0`, Playwright MCP `0.0.83`,
  and PStack `0.9.69` at commit `614d2f9791dd…`. No local T3 installation was available to verify
  those pins on this machine.
- Provider/model choices are detected from T3 `settings.json` and `model-manifest.json`; launch
  records provider, model, execution, machine, thread, branch, and session.
- Usage is stored on runs and agents as input/output/cache token counters. Claude reports through
  hooks; Codex rollouts are reconciled from `$CODEX_HOME/sessions`. Cost is an API-equivalent
  estimate from the versioned table in `lib/pricing.ts`; unknown telemetry stays unknown.

## Verification, CI, merge, and rollback

- `factory-verify` records commands, exit codes, output, producer, source, cleanliness, and exact
  commit SHA as evidence. Evidence is rejected as merge proof when the worktree is dirty or the SHA
  differs from the PR head.
- Runner-side verification can independently check a Modal PR head. For local runs, the agent's
  exact-head evidence plus GitHub checks drive the merge decision.
- The factory playbook requires Playwright MCP inspection and screenshot evidence for UI changes.
  Deterministic project checks come from `.factory/setup.json` or detected package scripts.
- GitHub checks, conflicts, review findings, protected paths, change size, evidence, and assessment
  feed `merge_decision`. Repository autonomy defaults to `off`; a human merge request is audited.
- Post-merge monitoring can revert a merge that breaks the default branch. Cleanup preserves dirty
  or unpushed work and only removes safe worktrees/branches.

## UI and routes

- The panel uses an authenticated `(panel)` layout with a compact responsive sidebar, Neon realtime
  feeds, board/list jobs, Inbox, activity, machines, repositories, and settings.
- The visual system already matches much of the Coforge brief: Geist fonts, neutral light/dark
  palettes, one blue accent, semantic status colors, compact controls, Base UI primitives, and
  keyboard-accessible navigation.
- Coforge should extend this shell with Projects, Missions, a plan review, and a mission workspace
  instead of replacing existing pages. Existing Linear jobs must remain available as the legacy
  Jobs view.

## Authentication, security, and execution boundaries

- Owner authorization is email allowlist plus verified email. New Coforge handlers must call the
  same owner check and authorize every project/mission by `owner_id`.
- The Next.js process must not run repository commands. It may persist projects/missions and expose
  approved work; only the runner/T3 path touches repositories.
- Repository names must resolve through the existing registry. The API must never accept an
  arbitrary local path as an execution target.
- Worktrees are process separation, not security isolation. Only trusted repositories and
  non-production credentials are supported in local mode.
- The pinned Next.js security warning is pre-existing and should be remediated in a separate,
  focused upgrade after Coforge behavior is stable.

## Modal and Composio

Modal is deeply implemented but optional in upstream. Coforge missions will always request the
existing `local` execution override; existing Modal code remains intact for legacy jobs but is not
needed by the Coforge MVP.

No Composio package or integration exists. It is P1 and is intentionally excluded from the P0
implementation so it cannot block the local brownfield path.
