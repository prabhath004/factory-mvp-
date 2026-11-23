import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { COFORGE_SKILLS, localRuntimePlan } from "../lib/local-runtime";
import { localScreenshotDir, withHooks, withServer } from "../lib/target-wiring";

const root = join(import.meta.dirname, "..");

assert.deepEqual(COFORGE_SKILLS, [
  "coforge-brownfield",
  "coforge-task",
  "coforge-browser-verification",
  "coforge-delivery",
]);

for (const skill of COFORGE_SKILLS) {
  const path = join(root, "skills", skill, "SKILL.md");
  assert.equal(existsSync(path), true, `${skill} must ship as a real SKILL.md`);
  const text = readFileSync(path, "utf8");
  assert.match(text, new RegExp(`name:\\s*${skill}`));
  assert.match(text, /Coforge|Factory/);
}

const plan = localRuntimePlan({
  home: "/Users/demo",
  factoryRoot: "/work/marshal-factory",
  pstack: { repo: "owner/pstack", commit: "a".repeat(40), version: "1.2.3" },
});

assert.equal(plan.pstack.checkout, "/Users/demo/.config/marshal-factory/pstack");
assert.equal(plan.pstack.commit, "a".repeat(40));
assert.deepEqual(
  plan.skills.map((skill) => skill.codex),
  COFORGE_SKILLS.map((skill) => `/Users/demo/.codex/skills/${skill}`),
);
assert.deepEqual(
  plan.skills.map((skill) => skill.claude),
  COFORGE_SKILLS.map((skill) => `/Users/demo/.claude/skills/${skill}`),
);

const screenshotDir = localScreenshotDir("/work/marshal-factory");
const wired = withServer({}, "/work/marshal-factory", screenshotDir, true, {
  command: "/Users/demo/.bun/bin/playwright-mcp",
  executablePath: "/Users/demo/Library/Caches/ms-playwright/chromium/chrome",
}) as { mcpServers: Record<string, { command: string; args?: string[]; env?: Record<string, string> }> };
assert.equal(wired.mcpServers.playwright?.command, "/Users/demo/.bun/bin/playwright-mcp");
assert.ok(wired.mcpServers.playwright?.args?.includes(screenshotDir));
assert.ok(wired.mcpServers.playwright?.args?.includes("/Users/demo/Library/Caches/ms-playwright/chromium/chrome"));
assert.ok(!wired.mcpServers.playwright?.args?.includes("chromium"), "Playwright MCP accepts chrome plus an explicit Chromium executable, not chromium as a browser name");
assert.equal(wired.mcpServers["factory-report"]?.env?.FACTORY_SCREENSHOT_DIR, screenshotDir);
assert.match(JSON.stringify(withHooks({}, "/work/marshal-factory")), /FACTORY_SCREENSHOT_DIR/);

console.log("local runtime regressions passed");
