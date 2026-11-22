import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { COFORGE_SKILLS, localRuntimePlan } from "../lib/local-runtime";

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

console.log("local runtime regressions passed");
