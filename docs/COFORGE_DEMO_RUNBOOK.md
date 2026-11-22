# Coforge Factory P0 demo runbook

This runbook demonstrates the real brownfield flow. It deliberately uses a small, reversible change
in a disposable repository. Do not use a production repository for the first run.

## Preflight

1. Complete [COFORGE_LOCAL_SETUP.md](COFORGE_LOCAL_SETUP.md).
2. Confirm the target checkout is clean and `git rev-parse origin/main` succeeds.
3. Confirm the GitHub App can read contents, write branches and pull requests, and read checks.
4. Confirm **Machines** shows the local runner online, T3 available, the checkout, and an enabled
   provider/model.
5. Keep repository merge autonomy off. Confirm no unrelated job is in flight.
6. Open the runner log in a separate terminal:

   ```sh
   tail -f ~/Library/Logs/marshal-factory/runner.log
   ```

## Golden-path mission

1. Open **Projects** and add the enabled demo repository.
2. Open **Missions → New mission**.
3. Enter a bounded goal, for example:

   ```text
   Add a visible health status to the demo page. Show “Operational” when the existing health
   endpoint succeeds and an accessible error state when it fails.
   ```

4. Add observable acceptance criteria, one per line:

   ```text
   The status remains correct after a page refresh.
   The failure state is announced to assistive technology.
   Existing lint, type-check, tests, and build pass.
   The changed page is verified in a real browser.
   ```

5. Choose an available local provider/model and select **Generate plan**.
6. On the plan screen, verify there are two to five ordered tasks, concrete verification steps,
   risks, assumptions, and one pull-request title. Edit one task and save it; confirm the plan
   version increments and approval is still required.
7. Select **Approve & run** once.

Expected result: the mission moves from `awaiting_approval` to `queued`, the runner claims exactly
one `coforge` job, creates a `factory/COF-<number>` worktree branch, and records attempt 1. No Linear
issue is created and no Modal sandbox id is recorded.

## Supervision checks

While the run is active:

- **Task plan** shows persisted task state; it does not infer completion from prose.
- **Activity** shows durable mission and runner events.
- **Logs** shows the actual runner event payloads.
- **Tests** remains empty until commit-bound evidence arrives, then shows command, exit code,
  duration, clean-tree status, producer, and commit SHA.
- **PR** says “Not opened yet” until GitHub reports a URL. It later shows the real merge decision,
  head SHA, changed-file count, and review state.
- **Cost** says “Not reported” until provider telemetry exists.
- **Run inspector** shows the actual branch, provider/model, attempt, commit, and runner freshness.

## Human-in-the-loop check

For a separate demo mission, make one acceptance criterion intentionally ambiguous. The agent should
report `waiting` with a concrete question. In the mission workspace, submit an answer. Verify the
same attempt resumes and the reply is acknowledged once. Do not create another mission or branch.

## Stop and retry check

Use a disposable mission for this test:

1. Select **Stop**, confirm the dialog, and observe the durable stop event.
2. Wait for the runner to settle the stop. The mission becomes `cancelled` rather than claiming a
   second job.
3. Select **Retry**. Verify attempt 2 uses `factory/COF-<number>-a2`; attempt 1 history remains
   visible and no state is overwritten.

## Delivery checks

At delivery, require all of the following before considering the demo successful:

- A single PR exists for the current attempt and its branch matches the mission key.
- The PR head equals the SHA in the latest clean verification evidence.
- Every required check passed; browser-facing work has real browser evidence.
- CI/review state shown in Coforge agrees with GitHub.
- The mission is not silently merged. A person makes the final merge decision.
- After a human merge, the runner observes GitHub and the mission moves to `merged`.

## Evidence to retain

Record the mission key and URL, PR URL, final SHA, test commands and durations, provider/model,
reported usage or “Not reported”, and screenshots for changed UI. Also retain the relevant runner
log interval. Never paste authentication secrets, cookies, private keys, or full environment files
into the evidence.

## Current environment gate

The repository's pure Coforge regressions, TypeScript check, and lint can run without credentials.
The complete browser and delivery demo requires a real Neon branch, verified owner session, local
T3 provider, target checkout, and GitHub App installation. When any is absent, report the step as
unverified; do not replace it with fixtures or claim an end-to-end pass.

