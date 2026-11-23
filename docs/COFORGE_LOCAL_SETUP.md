# Coforge Factory P0 local setup

This guide adds the Coforge prompt-first workflow to the existing Marshall installation. Coforge
missions do not require Linear. They do require Neon, Neon Auth, the local Bun runner, T3 Code, an
enabled local coding harness, and a GitHub App. The runner now creates and manages target
checkouts automatically when a repository is selected in the panel.

## P0 boundaries

- Brownfield repositories only. Register an existing GitHub `owner/name` repository.
- Local execution only. Coforge never falls back to Modal; a mission stays queued when T3 or the
  local checkout is unavailable.
- One approved mission creates one job and one attempt branch. A retry creates the next attempt
  branch. Each attempt may open at most one delivery pull request.
- Merge remains human-controlled. The repository autonomy default is `off`.
- Cost and token values appear only when the provider reports telemetry.

## 1. Install prerequisites

Install Bun 1.4.4, PostgreSQL-compatible Neon CLI tooling, T3 Code with its `t3` command, `git`,
`jq`, and `openssl`. Configure at least one T3 harness such as Codex or Claude Code. Clone this
repository into a stable path and install dependencies:

```sh
bun install --frozen-lockfile
```

Follow the upstream [README](../README.md) to create the Neon project, enable Neon Auth and
Realtime, and create the GitHub App. The panel environment must include:

```text
DATABASE_URL
DATABASE_URL_UNPOOLED
NEON_AUTH_BASE_URL
NEON_AUTH_COOKIE_SECRET
NEON_REALTIME_URL
NEXT_PUBLIC_NEON_REALTIME_URL
NEON_REALTIME_SECRET
NEON_FUNCTION_INGEST_BASE_URL
FACTORY_INGEST_SECRET
FACTORY_OWNER_EMAILS
GITHUB_APP_ID
GITHUB_APP_PRIVATE_KEY
GITHUB_APP_WEBHOOK_SECRET
```

`LINEAR_API_KEY`, `LINEAR_WEBHOOK_SECRET`, `FACTORY_TEAM_KEY`, and `FACTORY_LABEL` are optional for
a Coforge-only installation. Existing Linear intake remains available when they are configured.

Apply the Coforge schema, including migration `0040_coforge_missions.sql`:

```sh
bun run db:migrate
```

## 2. Install the local runner and agent runtime

Run the installer once from the factory checkout:

```sh
bun scripts/install-runner.ts
```

The installer does all local runtime setup that used to be manual:

- creates `~/.config/marshal-factory/config.json` from `.env.local` when it is absent;
- installs the persistent macOS runner;
- checks out the pinned PStack release and enables it for both Codex and Claude Code;
- installs the five Coforge skills (`coforge-orchestrator`, `coforge-brownfield`, `coforge-task`,
  `coforge-browser-verification`, and `coforge-delivery`) for both harnesses; and
- installs the pinned Playwright MCP browser runtime.

The generated config uses `FACTORY_INGEST_SECRET` and `NEON_FUNCTION_INGEST_BASE_URL`. You may edit
the non-secret runner defaults afterward. A minimal Coforge-only configuration looks like:

```json
{
  "ingestUrl": "https://your-neon-function.example/ingest",
  "secret": "replace-with-factory-ingest-secret",
  "factory": {
    "maxInFlight": 1,
    "tickSeconds": 30,
    "repos": [],
    "provider": "codex",
    "model": "your-enabled-model"
  }
}
```

`maxInFlight: 1` is the recommended P0 setting. Do not add Modal credentials for Coforge. Even if
upstream Modal support is configured for Linear jobs, a Coforge source override carries a hard
`localOnly` constraint.

The installer protects the file with mode `0600`. If you create it yourself, run:

```sh
chmod 600 ~/.config/marshal-factory/config.json
```

## 3. Add a target repository

Install the factory's GitHub App on the repository, then use **Repository setup → Add repository**
in the panel. That selection is the product input. Do not clone the repository yourself and do not
put a filesystem path into the panel.

The runner receives the repository onboarding intent, authenticates as the GitHub App, clones the
`main` branch to `~/.local/share/marshal-factory/repos/<owner>/<repo>`, records that checkout in its
private config, and registers it as a T3 project. If the config already names a checkout whose
`origin` matches the repository, the runner safely reuses it instead.

Repositories already wired with `bun scripts/install-target.ts` continue to work, but that command
is a compatibility/advanced operation rather than the normal add-repository flow.

## 4. Start the panel and runner

For local panel development:

```sh
bun run dev
```

The runner was installed in step 2. Its log is available with:

```sh
tail -f ~/Library/Logs/marshal-factory/runner.log
```

For a one-shot diagnostic pass, stop the LaunchAgent first and run:

```sh
bun scripts/install-runner.ts --uninstall
bun runner/index.ts --once
```

The **Machines** page must show the runner online, T3 available, the target repository, and at least
one enabled harness/model before a mission is approved.

## 5. Create the owner and project

Sign in with a verified address in `FACTORY_OWNER_EMAILS`. Under **Repository setup**, confirm the
target is enabled and keep merge autonomy off. Then open **Projects**, add a project, and select the
registered repository. The API accepts only enabled repository identifiers; it never accepts a
filesystem path.

Open **Missions → New mission**, enter the goal and acceptance criteria, choose a reported provider
and model or use runner defaults, generate the plan, review or edit it, then choose **Approve & run**.
Approval is the claim boundary. Editing the plan creates a new version and invalidates an earlier
approval.

## Troubleshooting

- **Repository stays Analyzing:** inspect the runner log for `managed-repo` or `onboarding` errors.
  Verify the GitHub App is installed on the repository and its default branch is `main`.
- **Queued with no claim:** verify the runner is online, T3 is up, and the repository is Ready.
  Coforge waits instead of using Modal.
- **No provider choices:** wait for a fresh machine inventory or restart the runner. Provider/model
  input is validated against the inventory actually reported by T3.
- **No stages or evidence:** confirm the runner config `secret` matches
  `FACTORY_INGEST_SECRET`; for a legacy wired repository, also confirm its generated hook files are
  on `origin/main`.
- **No cost:** this is expected when a provider/model does not expose priced telemetry. The panel
  reports “Not reported” and does not estimate.
- **Build fails before page collection:** set `NEON_AUTH_COOKIE_SECRET`; a valid database/auth
  environment is required for a full production build and browser test.
