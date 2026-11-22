import type { CoforgeReadyMission, CoforgeStore } from "../coforge/source-contract";
import type { SourceAdapter, Job } from "./types";

export type { CoforgeStore } from "../coforge/source-contract";

export function coforgeDescription(mission: CoforgeReadyMission) {
  const criteria = [...mission.acceptanceCriteria, ...mission.plan.tasks.flatMap((task) => task.acceptanceCriteria)];
  return [
    "## Goal",
    "",
    mission.goal,
    "",
    "## Approved plan",
    "",
    ...mission.plan.tasks.flatMap((task) => [
      `${task.ordinal}. ${task.title}`,
      `   ${task.description}`,
      `   Verify: ${task.verification}`,
    ]),
    "",
    "## Acceptance criteria",
    "",
    ...criteria.map((criterion) => `- ${criterion}`),
    "",
    "## Verification plan",
    "",
    ...mission.plan.verification.map((step) => `- ${step}`),
    "",
    "Work through the checklist in order in this single branch and pull request. Do not split the mission into separate jobs.",
  ].join("\n");
}

export function createCoforgeAdapter(load: () => CoforgeStore | Promise<CoforgeStore>): SourceAdapter<"coforge"> {
  let loaded: CoforgeStore | undefined;
  const store = async () => (loaded ??= await load());
  const missionId = (job: Job<"coforge">) => job.writeback.missionId;

  return {
    source: "coforge",

    async ready() {
      return (await (await store()).ready()).map((mission) => ({
        externalId: mission.id,
        key: mission.key,
        title: mission.plan.prTitle,
        url: `/missions/${mission.id}`,
        description: coforgeDescription(mission),
        writeback: { kind: "coforge" as const, missionId: mission.id },
        sourceState: {
          status: mission.status,
          labels: [],
          repository: mission.repository,
          provider: mission.provider,
          model: mission.model,
          execution: "local" as const,
          noteKeys: [],
        },
      }));
    },

    async announceClaim(job) {
      await (await store()).announceClaim(missionId(job), job);
    },

    async writeBack(job, transition) {
      return (await store()).writeBack(missionId(job), job, transition);
    },

    async replies(job) {
      if (await (await store()).cancellation(missionId(job))) return { kind: "close", state: "cancelled" };
      const replies = await (await store()).replies(missionId(job));
      if (replies.length === 0) return { kind: "wait" };
      return {
        kind: "resume",
        question: job.question ?? "The mission has a pending owner answer.",
        replies,
        answer: replies.map((reply) => reply.body).join("\n\n"),
      };
    },

    async acknowledgeReplies(job, replyIds) {
      await (await store()).acknowledgeReplies(missionId(job), replyIds);
    },

    async stopWanted(open) {
      const wanted: { job: Job<"coforge">; reason: string }[] = [];
      for (const job of open) {
        if (await (await store()).cancellation(missionId(job))) {
          wanted.push({ job, reason: "The owner cancelled this Coforge mission." });
        }
      }
      return wanted;
    },

    async confirmStop(externalId) {
      return (await (await store()).cancellation(externalId)) ? { stop: true, reopen: false } : { stop: false };
    },

    async note(job, key, body) {
      await (await store()).note(missionId(job), key, body);
    },

    overrides(state) {
      return {
        harness: state.provider ? [state.provider] : [],
        model: state.model ? [state.model] : [],
        runsOn: ["Local"],
        repository: [state.repository],
      };
    },

    labels: async () => [],

    async reopen(job) {
      await (await store()).reopen(missionId(job));
    },

    async requeue(job) {
      await (await store()).requeue(missionId(job), job.attempt);
    },

    describe: (job) => `Coforge mission ${job.key}`,

    async reply(job, requestId, body) {
      await (await store()).reply(missionId(job), requestId, body);
    },
  };
}

const runtimeStore = async () => (await import("../coforge/store")).coforgeStore;

export const coforge = createCoforgeAdapter(runtimeStore);
