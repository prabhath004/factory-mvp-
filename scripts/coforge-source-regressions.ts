import assert from "node:assert/strict";
import { createCoforgeAdapter, type CoforgeStore } from "../lib/sources/coforge";
import type { Job } from "../lib/sources/types";

const mission = {
  id: "019b0000-0000-7000-8000-000000000001",
  key: "COF-104",
  goal: "Add claim status tracking with a visible history.",
  status: "queued" as const,
  repository: "acme/claims",
  provider: "codex",
  model: "gpt-6.1-sol",
  acceptanceCriteria: ["Status persists after refresh."],
  plan: {
    summary: "Add durable claim statuses and an adjuster workflow.",
    assumptions: ["Claims already have stable identifiers."],
    risks: ["Existing records need a safe default."],
    prTitle: "Add claim status tracking",
    verification: ["Run unit tests and browser verification."],
    tasks: [
      {
        ordinal: 1,
        title: "Add status persistence",
        description: "Add the model and migration.",
        acceptanceCriteria: ["Status survives refresh."],
        verification: "Run model tests.",
        capability: "implementation" as const,
        agentPolicy: "specialist" as const,
        dependsOn: [],
        skills: ["coforge-task"],
      },
      {
        ordinal: 2,
        title: "Add adjuster controls",
        description: "Expose history and updates in the UI.",
        acceptanceCriteria: ["An adjuster can update status."],
        verification: "Run Playwright flow.",
        capability: "verification" as const,
        agentPolicy: "independent_reviewer" as const,
        dependsOn: [1],
        skills: ["coforge-browser-verification"],
      },
    ],
  },
};

const calls: unknown[][] = [];
const pendingReplies = [{ id: "reply-1", body: "Use the existing status enum.", createdAt: "2026-11-22T12:00:00.000Z" }];
let cancellation = false;

const store: CoforgeStore = {
  ready: async () => [mission],
  announceClaim: async (missionId, job) => void calls.push(["announce", missionId, job.attempt]),
  writeBack: async (missionId, job, transition) => (calls.push(["write", missionId, job.attempt, transition.stage, transition.eventId]), true),
  replies: async () => pendingReplies,
  acknowledgeReplies: async (missionId, ids) => void calls.push(["ack", missionId, ids]),
  cancellation: async () => cancellation,
  note: async (missionId, key, body) => void calls.push(["note", missionId, key, body]),
  reopen: async (missionId) => void calls.push(["reopen", missionId]),
  requeue: async (missionId, attempt) => void calls.push(["requeue", missionId, attempt]),
  reply: async (missionId, requestId, body) => void calls.push(["reply", missionId, requestId, body]),
};

const adapter = createCoforgeAdapter(() => store);
const [draft] = await adapter.ready();
assert.equal(draft?.key, "COF-104");
assert.equal(draft?.url, "/missions/019b0000-0000-7000-8000-000000000001");
assert.match(draft?.description ?? "", /## Approved plan/);
assert.match(draft?.description ?? "", /2\. Add adjuster controls/);
assert.deepEqual(adapter.overrides(draft!.sourceState), {
  harness: ["codex"],
  model: ["gpt-6.1-sol"],
  runsOn: ["Local"],
  repository: ["acme/claims"],
  localOnly: true,
});

const job = {
  id: "coforge:019b0000-0000-7000-8000-000000000001",
  source: "coforge",
  external_id: mission.id,
  key: mission.key,
  attempt: 1,
  writeback: { kind: "coforge", missionId: mission.id },
  source_state: draft!.sourceState,
} as unknown as Job<"coforge">;

await adapter.announceClaim(job);
assert.equal(await adapter.writeBack(job, { stage: "verifying", eventId: "stage-1" }), true);
assert.deepEqual(await adapter.replies(job), {
  kind: "resume",
  question: "The mission has a pending owner answer.",
  replies: pendingReplies,
  answer: "Use the existing status enum.",
});
await adapter.acknowledgeReplies(job, ["reply-1"]);
assert.deepEqual(await adapter.stopWanted([job]), []);
cancellation = true;
assert.deepEqual(await adapter.stopWanted([job]), [{ job, reason: "The owner cancelled this Coforge mission." }]);
assert.deepEqual(await adapter.confirmStop(mission.id, "ignored"), { stop: true, reopen: false });
await adapter.note(job, "merge-decision", "Human approval is required.");
await adapter.reopen(job);
await adapter.requeue(job);
await adapter.reply!(job, "019b0000-0000-7000-8000-000000000099", "Proceed.");

assert.deepEqual(calls, [
  ["announce", mission.id, 1],
  ["write", mission.id, 1, "verifying", "stage-1"],
  ["ack", mission.id, ["reply-1"]],
  ["note", mission.id, "merge-decision", "Human approval is required."],
  ["reopen", mission.id],
  ["requeue", mission.id, 1],
  ["reply", mission.id, "019b0000-0000-7000-8000-000000000099", "Proceed."],
]);

console.log("coforge source regressions passed");
