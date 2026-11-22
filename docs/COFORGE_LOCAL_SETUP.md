# Coforge Factory P0 local setup

This guide adds the Coforge prompt-first workflow to the existing Marshall installation. Coforge
missions do not require Linear. They do require Neon, Neon Auth, the local Bun runner, T3 Code, an
enabled local coding harness, a GitHub App, and a local checkout of every target repository.

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

## 2. Configure a local-only runner

Create `~/.config/marshal-factory/config.json`. `secret` must equal `FACTORY_INGEST_SECRET`, and
`ingestUrl` is `NEON_FUNCTION_INGEST_BASE_URL` with `/ingest` appended. A minimal Coforge-only
configuration is:

```json
{
  "ingestUrl": "https://your-neon-function.example/ingest",
  "secret": "replace-with-factory-ingest-secret",
  "factory": {
    "maxInFlight": 1,
    "tickSeconds": 30,
    "repos": ["acme/claims"],
    "provider": "codex",
    "model": "your-enabled-model"
  }
}
```

`maxInFlight: 1` is the recommended P0 setting. Do not add Modal credentials for Coforge. Even if
upstream Modal support is configured for Linear jobs, a Coforge source override carries a hard
`localOnly` constraint.

Protect the file:

```sh
chmod 600 ~/.config/marshal-factory/config.json
```

## 3. Wire each target repository

The GitHub App must be installed on the repository. The repository must have an `origin` remote and
an `origin/main` branch. Run from this factory checkout:

```sh
bun scripts/install-target.ts /absolute/path/to/claims
```

Commit and push the generated reporter hooks, MCP configuration, and factory playbook to the target
repository's `main`. The installer also adds the repository to `factory.repos`. Restarting the
runner registers the local checkout in the panel.

## 4. Start the panel and runner

For local panel development:

```sh
bun run dev
```

Install the persistent macOS runner:

```sh
bun scripts/install-runner.ts
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

- **Queued with no claim:** verify the runner is online, T3 is up, the repository appears in
  `factory.repos`, and the exact repo has a local checkout. Coforge waits instead of using Modal.
- **No provider choices:** wait for a fresh machine inventory or restart the runner. Provider/model
  input is validated against the inventory actually reported by T3.
- **No stages or evidence:** confirm the target repo's generated hook files are on `origin/main`,
  and the runner config `secret` matches `FACTORY_INGEST_SECRET`.
- **No cost:** this is expected when a provider/model does not expose priced telemetry. The panel
  reports “Not reported” and does not estimate.
- **Build fails before page collection:** set `NEON_AUTH_COOKIE_SECRET`; a valid database/auth
  environment is required for a full production build and browser test.
