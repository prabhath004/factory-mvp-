import { chmodSync, existsSync, mkdirSync, mkdtempSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, join } from "node:path";
import { CONFIG_PATH } from "../lib/config";
import { installationTokens, type RepoName } from "../lib/github/app";
import { localHost } from "../lib/host";
import { addRepoPathToConfig, managedRepoPath } from "../lib/managed-repos";
import { config } from "./config";

const ASKPASS = `#!/bin/sh
case "$1" in
  *Username*) printf '%s\\n' x-access-token ;;
  *) printf '%s\\n' "$FACTORY_GITHUB_TOKEN" ;;
esac
`;

export const managedRepoRuntime = {
  token: (repo: RepoName) => installationTokens.get(repo),
  run: localHost.run.bind(localHost),
  t3: () => localHost.t3,
};

async function configuredCheckout(repo: string) {
  for (const path of config.factory.repos) {
    if (!existsSync(join(path, ".git"))) continue;
    try {
      const origin = (await managedRepoRuntime.run("git", ["-C", path, "remote", "get-url", "origin"], { timeoutMs: 30_000 })).stdout.trim();
      if (origin.replace(/\.git$/, "").endsWith(`github.com/${repo}`)) return path;
    } catch {}
  }
  return null;
}

async function cloneManaged(repo: RepoName, target: string) {
  const staging = mkdtempSync(join(tmpdir(), "marshal-factory-clone-"));
  const checkout = join(staging, "checkout");
  const askpass = join(staging, "askpass.sh");
  writeFileSync(askpass, ASKPASS, { mode: 0o700 });
  chmodSync(askpass, 0o700);
  try {
    const token = await managedRepoRuntime.token(repo);
    await managedRepoRuntime.run(
      "git",
      ["clone", "--quiet", "--branch", "main", "--single-branch", `https://github.com/${repo}.git`, checkout],
      {
        timeoutMs: 300_000,
        env: { GIT_ASKPASS: askpass, GIT_TERMINAL_PROMPT: "0", FACTORY_GITHUB_TOKEN: token },
      },
    );
    mkdirSync(dirname(target), { recursive: true });
    renameSync(checkout, target);
  } finally {
    rmSync(staging, { recursive: true, force: true });
  }
}

async function ensureT3Project(target: string) {
  try {
    await managedRepoRuntime.run(managedRepoRuntime.t3(), ["thread", "list", "--project", target, "--json"], { timeoutMs: 30_000 });
    return;
  } catch {}
  await managedRepoRuntime.run(managedRepoRuntime.t3(), ["project", "add", target, "--title", basename(target)], { timeoutMs: 30_000 });
}

/** Ensures a GitHub App-authorized repository is a runner checkout and a T3 project. */
export async function ensureManagedRepo(repo: string) {
  const target = (await configuredCheckout(repo)) ?? managedRepoPath(repo);
  if (!existsSync(target)) await cloneManaged(repo as RepoName, target);
  if (!existsSync(join(target, ".git"))) throw new Error(`managed checkout ${target} is not a git repository`);
  const origin = (await managedRepoRuntime.run("git", ["-C", target, "remote", "get-url", "origin"], { timeoutMs: 30_000 })).stdout.trim();
  if (!origin.replace(/\.git$/, "").endsWith(`github.com/${repo}`)) throw new Error(`${target} belongs to ${origin}, not ${repo}`);
  if (addRepoPathToConfig(CONFIG_PATH, target)) config.factory.repos.push(target);
  else if (!config.factory.repos.includes(target)) config.factory.repos.push(target);
  await ensureT3Project(target);
  return { repo, path: target };
}
