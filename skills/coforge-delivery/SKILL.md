---
name: coforge-delivery
description: Deliver a Coforge mission as one verified GitHub pull request with exact-SHA evidence and honest readiness status.
---

# Coforge Delivery

Use this skill after implementation and verification are complete.

1. Confirm the worktree is clean and all intended changes are committed on the Factory branch.
2. Run the Factory verification command named by `report_stage` against the exact final commit.
3. Push the branch and open or update exactly one pull request for the mission.
4. Include the goal, approved tasks, changed behavior, assumptions, commands and results, screenshots, limitations, and final SHA.
5. Read CI and review state from the current PR head. Never report stale checks as current.
6. Recommend merge only when the implementation matches the approved mission and the evidence supports it; otherwise recommend handoff and explain why.
7. Report the `pr` stage with the PR URL, assessment, and evidence. Never merge the PR yourself.
