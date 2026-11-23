import { execFileSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { loadLimits } from "../lib/config";
import { localRuntimePlan } from "../lib/local-runtime";

const root = join(import.meta.dirname, "..");
const plan = localRuntimePlan({ factoryRoot: root, pstack: loadLimits().sandbox.pstack });

function run(command: string, args: string[], options: { quiet?: boolean } = {}) {
  return execFileSync(command, args, { cwd: root, encoding: "utf8", stdio: options.quiet ? "pipe" : "inherit" });
}

function installSkills() {
  for (const skill of plan.skills) {
    for (const destination of [skill.codex, skill.claude]) {
      mkdirSync(join(destination, ".."), { recursive: true });
      rmSync(destination, { recursive: true, force: true });
      cpSync(skill.source, destination, { recursive: true });
    }
    console.log(`installed ${skill.name} for Codex and Claude Code`);
  }
}

function checkoutPstack() {
  const { checkout, repo, commit } = plan.pstack;
  mkdirSync(checkout, { recursive: true });
  if (!existsSync(join(checkout, ".git"))) run("git", ["-C", checkout, "init", "--quiet"]);
  const remotes = run("git", ["-C", checkout, "remote"], { quiet: true }).trim().split("\n").filter(Boolean);
  const url = `https://github.com/${repo}.git`;
  if (remotes.includes("origin")) run("git", ["-C", checkout, "remote", "set-url", "origin", url], { quiet: true });
  else run("git", ["-C", checkout, "remote", "add", "origin", url], { quiet: true });
  run("git", ["-C", checkout, "fetch", "--quiet", "--depth", "1", "origin", commit]);
  run("git", ["-C", checkout, "checkout", "--quiet", "--detach", "FETCH_HEAD"]);
  const actual = run("git", ["-C", checkout, "rev-parse", "HEAD"], { quiet: true }).trim();
  if (actual !== commit) throw new Error(`PStack checkout is ${actual}, expected ${commit}`);
  return checkout;
}

function hasClaudePstack() {
  try {
    const installed = JSON.parse(run("claude", ["plugin", "list", "--json"], { quiet: true })) as { id?: string; enabled?: boolean }[];
    return installed.some((plugin) => plugin.id === "pstack@pstack-claude" && plugin.enabled !== false);
  } catch {
    return false;
  }
}

function hasCodexPstack() {
  try {
    const parsed = JSON.parse(run("codex", ["plugin", "list", "--json"], { quiet: true })) as { installed?: { pluginId?: string; enabled?: boolean }[] };
    return (parsed.installed ?? []).some((plugin) => plugin.pluginId === "pstack@pstack-claude" && plugin.enabled !== false);
  } catch {
    return false;
  }
}

function addMarketplace(command: "claude" | "codex", checkout: string) {
  try {
    run(command, ["plugin", "marketplace", "add", checkout], { quiet: true });
  } catch (error) {
    const message = `${(error as { stdout?: string; stderr?: string }).stdout ?? ""}${(error as { stderr?: string }).stderr ?? ""}`;
    if (!/already|exists|configured/i.test(message)) throw error;
  }
}

function installPlaywright() {
  const version = loadLimits().sandbox.playwrightMcpVersion;
  let installed = "";
  try {
    installed = run("playwright-mcp", ["--version"], { quiet: true });
  } catch {}
  if (!installed.includes(version)) run("npm", ["install", "--global", `@playwright/mcp@${version}`]);
  const npmRoot = run("npm", ["root", "--global"], { quiet: true }).trim();
  const playwright = join(npmRoot, "@playwright", "mcp", "node_modules", ".bin", "playwright");
  if (existsSync(playwright)) run(playwright, ["install", "chromium"]);
  console.log(`installed Playwright MCP ${version} for local browser verification`);
}

installSkills();
installPlaywright();
const checkout = checkoutPstack();
if (!hasClaudePstack()) {
  addMarketplace("claude", checkout);
  run("claude", ["plugin", "install", "pstack@pstack-claude"]);
}
if (!hasCodexPstack()) {
  addMarketplace("codex", checkout);
  run("codex", ["plugin", "add", "pstack@pstack-claude"]);
}

const manifest = JSON.parse(readFileSync(join(checkout, ".claude-plugin", "marketplace.json"), "utf8")) as { metadata?: { version?: string } };
console.log(`local agent runtime ready: PStack ${manifest.metadata?.version ?? plan.pstack.version} at ${plan.pstack.commit.slice(0, 12)}`);
