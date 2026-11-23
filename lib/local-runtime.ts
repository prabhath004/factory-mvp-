import { homedir } from "node:os";
import { join } from "node:path";
import type { SandboxLimits } from "./config";

export const COFORGE_SKILLS = [
  "coforge-orchestrator",
  "coforge-brownfield",
  "coforge-task",
  "coforge-browser-verification",
  "coforge-delivery",
] as const;

export type CoforgeSkill = (typeof COFORGE_SKILLS)[number];

export function localRuntimePlan({
  home = homedir(),
  factoryRoot,
  pstack,
}: {
  home?: string;
  factoryRoot: string;
  pstack: SandboxLimits["pstack"];
}) {
  return {
    pstack: {
      checkout: join(home, ".config", "marshal-factory", "pstack"),
      repo: pstack.repo,
      commit: pstack.commit,
      version: pstack.version,
    },
    skills: COFORGE_SKILLS.map((name) => ({
      name,
      source: join(factoryRoot, "skills", name),
      codex: join(home, ".codex", "skills", name),
      claude: join(home, ".claude", "skills", name),
    })),
  };
}
