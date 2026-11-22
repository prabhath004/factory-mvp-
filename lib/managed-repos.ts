import { chmodSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";

const REPO = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/;

export const MANAGED_REPOS_PATH = process.env.MARSHAL_FACTORY_REPOS ?? join(homedir(), ".local", "share", "marshal-factory", "repos");

export function managedRepoPath(repo: string, root = MANAGED_REPOS_PATH) {
  if (!REPO.test(repo)) throw new Error(`repository must be owner/name, received ${repo}`);
  const [owner, name] = repo.split("/") as [string, string];
  if ([owner, name].some((part) => part === "." || part === "..")) throw new Error(`repository must be owner/name, received ${repo}`);
  return join(root, owner, name);
}

/** Adds a checkout to the runner config without changing any secrets or unrelated settings. */
export function addRepoPathToConfig(configPath: string, checkout: string) {
  const parsed = JSON.parse(readFileSync(configPath, "utf8")) as Record<string, unknown>;
  const factory = (parsed.factory && typeof parsed.factory === "object" ? parsed.factory : {}) as Record<string, unknown>;
  const repos = Array.isArray(factory.repos) ? factory.repos.filter((value): value is string => typeof value === "string") : [];
  if (repos.includes(checkout)) return false;
  const next = { ...parsed, factory: { ...factory, repos: [...repos, checkout] } };
  mkdirSync(dirname(configPath), { recursive: true });
  const temporary = `${configPath}.${process.pid}.tmp`;
  writeFileSync(temporary, `${JSON.stringify(next, null, 2)}\n`, { mode: 0o600 });
  renameSync(temporary, configPath);
  chmodSync(configPath, 0o600);
  return true;
}
