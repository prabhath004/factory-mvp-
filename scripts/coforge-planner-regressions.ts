import assert from "node:assert/strict";
import { buildMissionPlan } from "../lib/coforge/planner";

const plan = buildMissionPlan({
  goal: "Add claim status tracking with an adjuster view and visible status history.",
  acceptanceCriteria: ["Status persists after refresh", "Claim history is visible"],
  repository: "acme/claims",
});

assert.equal(plan.tasks.length, 3);
assert.deepEqual(plan.tasks.map((task) => task.ordinal), [1, 2, 3]);
assert.match(plan.summary, /claim status tracking/i);
assert.match(plan.tasks[0]!.description, /acme\/claims/);
assert.ok(plan.tasks.some((task) => task.acceptanceCriteria.includes("Status persists after refresh")));
assert.ok(plan.verification.some((step) => /browser/i.test(step)), "a UI goal includes browser verification");
assert.match(plan.prTitle, /^Add claim status tracking/i);

const backend = buildMissionPlan({
  goal: "Add an idempotent webhook endpoint for payment status updates.",
  acceptanceCriteria: [],
  repository: "acme/payments",
});
assert.equal(backend.tasks.length, 3);
assert.ok(!backend.verification.some((step) => /Playwright/i.test(step)), "a backend-only goal does not promise browser verification");
assert.ok(backend.verification.some((step) => /repository's configured checks/i.test(step)));

console.log("coforge planner regressions passed");
