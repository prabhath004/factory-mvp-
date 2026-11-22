---
name: coforge-task
description: Implement the approved Coforge task checklist with bounded changes, tests, and truthful progress reporting.
---

# Coforge Task

Apply this skill while implementing an approved Coforge plan.

1. Complete tasks in their approved order and keep one mission, branch, and delivery PR.
2. Before each phase, report the matching Factory stage: `triage`, `investigating`, `implementing`, or `verifying`.
3. For a defect or behavior change, reproduce it with a failing test before the fix when the repository supports such a test.
4. Make the smallest coherent change satisfying the acceptance criteria. Do not add unrelated cleanup or speculative features.
5. Run the narrow check after each change, then the repository's relevant full checks.
6. After three failed repair rounds on the same cause, report `failed` with the command, exit code, and concise evidence.
7. Never claim a test passed unless that exact command completed successfully in this worktree.
