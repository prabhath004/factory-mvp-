# Implementation Plan: Coforge Autonomous Software Factory P0

## Overview

Extend Marshall with an owner-scoped, prompt-first Coforge mission source while preserving the
existing Linear workflow and runner. Approved brownfield missions become one source job, one local
T3 execution, one attempt branch/worktree, and at most one PR. The panel gains mission creation,
plan approval, supervision, evidence, and action surfaces backed only by durable data.

## Architecture decisions

- Keep Marshall's `SourceAdapter` and runner as the only execution orchestrator.
- Store project, mission, task, run, event, and request-idempotency state in PostgreSQL; reuse jobs,
  runs, evidence, screenshots, and merge decisions for execution telemetry.
- Generate deterministic 2–5 task plans locally from bounded user input for P0. This makes planning
  available without introducing an LLM gateway; the plan is editable and versioned. A future
  planner provider can implement the same typed contract.
- Coforge missions always request the existing `local` execution override. The API stores only a
  registered `owner/name` repository, never a local path.
- Keep existing `/`, `/inbox`, and Linear job filing intact. Add `/missions`, `/missions/new`,
  `/missions/[id]`, and `/projects` to the current authenticated shell.
- Use owner email as the MVP owner id, matching the existing owner-only auth model.
- Treat the user's request to implement this approved PRD as approval of this execution plan.

## Dependency graph

```text
schema + migration
  -> mission contracts/service
     -> Coforge source adapter
        -> runner lifecycle
     -> authenticated Factory API
        -> mission UI + actions
           -> browser and acceptance verification
```

## Task list

Tasks and checkpoints are tracked in `tasks/todo.md`.

## Risks and mitigations

| Risk | Impact | Mitigation |
| --- | --- | --- |
| No Neon/T3/GitHub credentials in this checkout | Live delivery cannot be exercised here | Add deterministic unit/regression coverage, keep real integration seams, and document exact live verification. |
| Upstream has no published license | Redistribution uncertainty | Preserve history/attribution and flag before release. |
| New source races with runner polling | Duplicate attempts | Approval and claim use row locks/unique constraints; adapter operations are idempotent. |
| User-controlled repo/path reaches execution | Local machine compromise | Accept only registered GitHub `owner/name`; never accept or execute local paths through HTTP. |
| UI scope becomes a replacement dashboard | Regression risk | Extend the existing shell and reuse source-neutral jobs/evidence views. |
| Framework has an upstream security advisory | Security risk | Record it now; run the isolated Next.js security upgrade after Coforge changes are stable. |

## Explicit P0 boundary

Greenfield repository creation, Composio, CLI entry skills, remote previews, cloud execution,
distributed jobs, and automatic merge are not part of this implementation phase.
