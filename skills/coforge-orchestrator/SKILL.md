---
name: coforge-orchestrator
description: Execute a Coforge mission as a bounded autonomous team while preserving one integrated branch and one delivery pull request.
---

# Coforge Orchestrator

Use this skill at the start of every approved Coforge mission. The mission plan is an executable capability graph: each task names its dependencies, agent policy, and required skills.

## Control loop

1. Read the approved goal, acceptance criteria, task graph, repository instructions, and Factory playbook.
2. Keep the primary thread responsible for scope, integration, user questions, final verification, and delivery.
3. Spawn a specialist only when its bounded task can be reviewed independently. Use at most three active specialists and one nesting level.
4. Give every specialist one task, its dependencies, exact allowed scope, required skills, expected evidence, and a prohibition on opening or merging a PR.
5. Parallelize read-only discovery and non-overlapping implementation. Never allow two agents to edit the same files concurrently.
6. Review every specialist result and diff in the primary thread. Reject prose-only completion claims without repository evidence.
7. Run verification independently of the implementation claim. A verifier may diagnose and report; repairs return to the primary thread or a bounded repair specialist.
8. Integrate on the Factory branch, run the exact-SHA delivery gate, and open at most one PR.

## Routing

- `discovery`: prefer a cheap specialist; read-only unless the plan explicitly requests an artifact.
- `implementation`: use `coforge-task` and the smallest capable model; isolate work when edits do not overlap.
- `verification`: use `coforge-browser-verification` for UI and repository checks for all changes. The verifier must not weaken tests.
- `delivery`: use `coforge-delivery` in the primary thread after all dependencies pass.

If the harness cannot spawn a specialist, execute that unit in the primary thread and report the fallback. Missing optional integrations do not block coding work. Ask the user only for a material product decision, credential grant, or irreversible external action.
