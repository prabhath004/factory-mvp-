import assert from "node:assert/strict";
import {
  missionPlanSchema,
  missionStatusSchema,
  nextMissionStatus,
  projectInputSchema,
} from "../lib/coforge/contracts";
import { effectiveMissionStatus } from "../lib/coforge/status";
import { developmentOwner, developmentOwnerUser } from "../lib/auth/development-owner";
import { configuredLiveUpdates } from "../lib/live-mode";

const plan = missionPlanSchema.parse({
  summary: "Add claim status tracking.",
  assumptions: ["The existing repository remains the source of truth."],
  risks: ["A schema migration may be required."],
  prTitle: "Add claim status tracking",
  verification: ["Run the repository checks."],
  tasks: [
    {
      ordinal: 1,
      title: "Inspect the claim model",
      description: "Find the current model and migration conventions.",
      acceptanceCriteria: ["The persistence boundary is identified."],
      verification: "Review the current schema and tests.",
    },
    {
      ordinal: 2,
      title: "Implement status tracking",
      description: "Persist and expose claim status history.",
      acceptanceCriteria: ["Status persists after refresh."],
      verification: "Run focused model and API tests.",
    },
  ],
});

assert.equal(plan.tasks.length, 2);
assert.equal(plan.tasks[0]!.capability, "implementation", "old stored plans receive safe orchestration defaults");
assert.deepEqual(plan.tasks[0]!.dependsOn, []);
assert.throws(
  () => missionPlanSchema.parse({ ...plan, tasks: [plan.tasks[0]] }),
  /Too small|at least 2|array/i,
  "a mission plan must have at least two executable tasks",
);
assert.throws(
  () => missionPlanSchema.parse({ ...plan, tasks: [{ ...plan.tasks[0], dependsOn: [2] }, plan.tasks[1]] }),
  /dependencies must reference an earlier task/i,
  "plans cannot contain forward or cyclic dependencies",
);
assert.equal(missionStatusSchema.parse("awaiting_approval"), "awaiting_approval");
assert.throws(() => missionStatusSchema.parse("pretending_to_work"));

assert.equal(nextMissionStatus("draft", "plan_started"), "planning");
assert.equal(nextMissionStatus("planning", "plan_ready"), "awaiting_approval");
assert.equal(nextMissionStatus("awaiting_approval", "approved"), "queued");
assert.equal(nextMissionStatus("running", "question_asked"), "waiting_for_user");
assert.equal(nextMissionStatus("merge_ready", "delivered"), "completed");
assert.throws(
  () => nextMissionStatus("draft", "approved"),
  /draft -> approved/,
  "invalid transitions are rejected instead of inventing progress",
);

assert.equal(effectiveMissionStatus("pr_open", { stage: "pr", merge_decision: { outcome: "pending" } }), "reviewing");
assert.equal(effectiveMissionStatus("pr_open", { stage: "pr", merge_decision: { outcome: "merge" } }), "merge_ready");
assert.equal(effectiveMissionStatus("pr_open", { stage: "pr", merge_decision: { outcome: "handover" } }), "completed");
assert.equal(effectiveMissionStatus("pr_open", { stage: "merged", merge_decision: null }), "merged");

assert.equal(developmentOwner({ nodeEnv: "development", email: "dev@example.com" }), "dev@example.com");
assert.equal(developmentOwner({ nodeEnv: "production", email: "dev@example.com" }), null, "production can never bypass Neon Auth");
assert.equal(developmentOwner({ nodeEnv: "development", email: "not-an-email" }), null);
assert.deepEqual(developmentOwnerUser({ nodeEnv: "development", email: " DEV@example.com " }), {
  email: "dev@example.com",
  emailVerified: true,
});
assert.equal(developmentOwnerUser({ nodeEnv: "production", email: "dev@example.com" }), null);
assert.equal(configuredLiveUpdates({ explicit: "off", vercelEnv: undefined }), "off");
assert.equal(configuredLiveUpdates({ explicit: undefined, vercelEnv: "preview" }), "off");
assert.equal(configuredLiveUpdates({ explicit: undefined, vercelEnv: undefined }), "on");

assert.deepEqual(
  projectInputSchema.parse({ name: "Claims", mode: "brownfield", repo: "acme/claims" }),
  { name: "Claims", mode: "brownfield", repo: "acme/claims", defaultBranch: "main" },
);
assert.throws(
  () => projectInputSchema.parse({ name: "Unsafe", mode: "brownfield", repo: "/tmp/repo" }),
  /owner\/name/i,
  "the web boundary never accepts a local repository path",
);

console.log("coforge contract regressions passed");
