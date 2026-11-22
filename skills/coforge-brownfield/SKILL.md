---
name: coforge-brownfield
description: Execute an approved Coforge mission safely in an existing repository and preserve its architecture, conventions, and scope.
---

# Coforge Brownfield

Use this skill for every Coforge mission targeting an existing repository.

1. Read the approved goal, plan, acceptance criteria, repository instructions, and the Factory playbook named in the launch message.
2. Inspect the relevant code, tests, scripts, CI workflows, and recent nearby changes before editing.
3. Treat the approved plan as the scope boundary. Preserve existing public contracts unless the mission explicitly changes them.
4. Work only on the Factory-created branch and worktree. Never push to or merge `main`.
5. Use the repository's lockfile and documented commands. Never invent credentials or weaken checks.
6. If a missing decision changes product behavior materially, report `waiting` through Factory with concrete options and stop.

Continue with `coforge-task`, then `coforge-browser-verification` when UI changes, and finish with `coforge-delivery`.
