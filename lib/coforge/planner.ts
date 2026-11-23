import { missionPlanSchema, type MissionPlan } from "./contracts";

type PlanInput = { goal: string; acceptanceCriteria: string[]; repository: string };

const sentence = (value: string) => {
  const trimmed = value.trim().replace(/\s+/g, " ");
  return /[.!?]$/.test(trimmed) ? trimmed : `${trimmed}.`;
};

const titleFromGoal = (goal: string) => {
  const first = goal.trim().replace(/\s+/g, " ").split(/[.!?\n]/)[0]!.trim();
  const title = first.length > 72 ? `${first.slice(0, 69).trimEnd()}…` : first;
  return title[0]!.toUpperCase() + title.slice(1);
};

const changesUi = (goal: string) =>
  /\b(ui|ux|screen|page|view|form|button|dashboard|panel|layout|component|frontend|browser|responsive|history)\b/i.test(goal);

/**
 * Produces a bounded execution plan without pretending repository analysis has already happened.
 * The first task explicitly performs that analysis inside the authorized runner worktree.
 */
export function buildMissionPlan(input: PlanInput): MissionPlan {
  const goal = sentence(input.goal);
  const requested = input.acceptanceCriteria.length > 0 ? input.acceptanceCriteria : ["The requested behavior is covered by a deterministic regression test."];
  const browser = changesUi(input.goal);
  return missionPlanSchema.parse({
    summary: goal,
    assumptions: [
      `${input.repository} is registered, trusted, and available to the local runner.`,
      "Existing repository conventions and public interfaces take precedence over guessed implementation details.",
    ],
    risks: [
      "The repository may reveal constraints that require a plan edit and fresh approval.",
      ...(browser ? ["The changed interface must remain keyboard accessible and responsive."] : []),
    ],
    prTitle: titleFromGoal(input.goal),
    verification: [
      "Run the repository's configured checks, including lint, type-check, tests, and build where they apply to the changed area.",
      ...(browser ? ["Run deterministic browser assertions and inspect the changed flow at desktop and mobile widths."] : []),
      "Run final verification on the exact clean commit pushed to the pull request.",
    ],
    tasks: [
      {
        ordinal: 1,
        title: "Inspect the existing implementation",
        description: `Read ${input.repository}'s relevant code, tests, data contracts, and project instructions; refine the implementation boundary without expanding the approved goal.`,
        acceptanceCriteria: ["The implementation follows existing architecture and identifies the smallest safe change."],
        verification: "Record the affected modules and repository-provided verification commands before editing behavior.",
        capability: "discovery",
        agentPolicy: "specialist",
        dependsOn: [],
        skills: ["coforge-brownfield"],
      },
      {
        ordinal: 2,
        title: titleFromGoal(input.goal),
        description: `Implement the approved goal in one branch and keep the change scoped: ${goal}`,
        acceptanceCriteria: requested,
        verification: browser ? "Exercise the behavior through focused automated tests and the real browser flow." : "Exercise the behavior through focused unit or integration tests.",
        capability: "implementation",
        agentPolicy: "specialist",
        dependsOn: [1],
        skills: ["coforge-task", ...(browser ? ["coforge-browser-verification"] : [])],
      },
      {
        ordinal: 3,
        title: "Verify and prepare the pull request",
        description: "Run the relevant full check suite, repair failures without weakening tests, verify the final pushed SHA, and open one reviewable pull request.",
        acceptanceCriteria: [
          "Every reported check includes its real command and outcome.",
          "The pull request describes the goal, changed areas, evidence, limitations, and final commit SHA.",
        ],
        verification: "Confirm the worktree is clean, evidence references HEAD, and GitHub checks are read from the current PR head.",
        capability: "delivery",
        agentPolicy: "independent_reviewer",
        dependsOn: [2],
        skills: ["coforge-delivery"],
      },
    ],
  });
}
