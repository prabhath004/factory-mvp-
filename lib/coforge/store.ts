import { randomUUID } from "node:crypto";
import { and, asc, eq, inArray, isNotNull, isNull } from "drizzle-orm";
import { db } from "@/db/client";
import {
  coforgeMissionEvents,
  coforgeMissionReplies,
  coforgeMissionRuns,
  coforgeMissions,
  coforgeProjects,
} from "@/db/schema";
import { missionPlanSchema, type MissionStatus } from "@/lib/coforge/contracts";
import { attemptBranch } from "@/lib/factory";
import type { CoforgeStore } from "@/lib/coforge/source-contract";
import type { Stage } from "@/lib/events";

const runId = (missionId: string, attempt: number) => `${missionId}:${attempt}`;

function statusFor(stage: Stage, eventId: string): MissionStatus {
  if (stage === "failed" && eventId.startsWith("stop:")) return "cancelled";
  switch (stage) {
    case "queued":
      return "queued";
    case "triage":
    case "investigating":
    case "implementing":
      return "running";
    case "verifying":
      return "verifying";
    case "pr":
      return "pr_open";
    case "waiting":
      return "waiting_for_user";
    case "merged":
      return "merged";
    case "failed":
      return "failed";
  }
}

const prNumber = (url: string | null) => {
  const match = url?.match(/\/pull\/(\d+)(?:$|[/?#])/);
  return match ? Number(match[1]) : null;
};

export const coforgeStore: CoforgeStore = {
  async ready() {
    const rows = await db
      .select({ mission: coforgeMissions, repository: coforgeProjects.repo_url })
      .from(coforgeMissions)
      .innerJoin(coforgeProjects, eq(coforgeProjects.id, coforgeMissions.project_id))
      .where(
        and(
          eq(coforgeMissions.status, "queued"),
          isNotNull(coforgeMissions.plan_json),
          isNotNull(coforgeMissions.approved_at),
          isNull(coforgeMissions.cancel_requested_at),
        ),
      )
      .orderBy(asc(coforgeMissions.approved_at), asc(coforgeMissions.key));
    return rows.flatMap(({ mission, repository }) => {
      const plan = missionPlanSchema.safeParse(mission.plan_json);
      if (!plan.success || mission.approved_plan_version !== mission.plan_version) return [];
      return [
        {
          id: mission.id,
          key: mission.key,
          goal: mission.goal,
          status: mission.status,
          repository,
          provider: mission.selected_provider,
          model: mission.selected_model,
          acceptanceCriteria: mission.acceptance_criteria_json,
          plan: plan.data,
        },
      ];
    });
  },

  async announceClaim(missionId, job) {
    const now = new Date();
    await db.transaction(async (tx) => {
      await tx
        .insert(coforgeMissionRuns)
        .values({
          id: runId(missionId, job.attempt),
          mission_id: missionId,
          upstream_job_id: job.id,
          attempt: job.attempt,
          branch_name: attemptBranch(job.key, job.attempt),
          provider: job.provider,
          model: job.model,
          status: "running",
          started_at: now,
        })
        .onConflictDoNothing();
      await tx
        .update(coforgeMissions)
        .set({ status: "running", updated_at: now })
        .where(and(eq(coforgeMissions.id, missionId), eq(coforgeMissions.status, "queued")));
      await tx
        .insert(coforgeMissionEvents)
        .values({
          id: randomUUID(),
          mission_id: missionId,
          run_id: runId(missionId, job.attempt),
          event_key: `claim:${missionId}:${job.attempt}`,
          kind: "claimed",
          stage: "running",
          payload_json: { attempt: job.attempt, branch: attemptBranch(job.key, job.attempt) },
          created_at: now,
        })
        .onConflictDoNothing();
    });
  },

  async writeBack(missionId, job, transition) {
    const now = new Date();
    const status = statusFor(transition.stage, transition.eventId);
    return db.transaction(async (tx) => {
      const inserted = await tx
        .insert(coforgeMissionEvents)
        .values({
          id: randomUUID(),
          mission_id: missionId,
          run_id: runId(missionId, job.attempt),
          event_key: `stage:${missionId}:${transition.eventId}`,
          kind: "stage",
          stage: transition.stage,
          payload_json: { summary: job.stage_summary, question: job.question, prUrl: job.pr_url },
          created_at: now,
        })
        .onConflictDoNothing()
        .returning({ id: coforgeMissionEvents.id });
      if (inserted.length === 0) return true;
      await tx
        .update(coforgeMissions)
        .set({ status, updated_at: now })
        .where(eq(coforgeMissions.id, missionId));
      await tx
        .update(coforgeMissionRuns)
        .set({
          status,
          provider: job.provider,
          model: job.model,
          final_commit_sha: job.evidence?.sha ?? job.merge_decision?.headSha,
          pr_url: job.pr_url,
          pr_number: prNumber(job.pr_url),
          ...(status === "failed" || status === "cancelled" || status === "merged" ? { ended_at: now } : {}),
          ...(status === "failed" ? { failure_reason: job.stage_summary } : {}),
        })
        .where(eq(coforgeMissionRuns.id, runId(missionId, job.attempt)));
      return true;
    });
  },

  async replies(missionId) {
    const rows = await db
      .select()
      .from(coforgeMissionReplies)
      .where(and(eq(coforgeMissionReplies.mission_id, missionId), isNull(coforgeMissionReplies.acknowledged_at)))
      .orderBy(asc(coforgeMissionReplies.created_at), asc(coforgeMissionReplies.id));
    return rows.map((reply) => ({ id: reply.id, body: reply.body, createdAt: reply.created_at.toISOString() }));
  },

  async acknowledgeReplies(missionId, replyIds) {
    if (replyIds.length === 0) return;
    await db
      .update(coforgeMissionReplies)
      .set({ acknowledged_at: new Date() })
      .where(and(eq(coforgeMissionReplies.mission_id, missionId), inArray(coforgeMissionReplies.id, [...replyIds])));
  },

  async cancellation(missionId) {
    const [mission] = await db
      .select({ requested: coforgeMissions.cancel_requested_at })
      .from(coforgeMissions)
      .where(eq(coforgeMissions.id, missionId));
    return Boolean(mission?.requested);
  },

  async note(missionId, key, body) {
    await db
      .insert(coforgeMissionEvents)
      .values({
        id: randomUUID(),
        mission_id: missionId,
        event_key: `note:${missionId}:${key}`,
        kind: "note",
        payload_json: { body },
        created_at: new Date(),
      })
      .onConflictDoNothing();
  },

  async reopen(missionId) {
    await db
      .update(coforgeMissions)
      .set({ status: "queued", cancel_requested_at: null, updated_at: new Date() })
      .where(eq(coforgeMissions.id, missionId));
  },

  async requeue(missionId, attempt) {
    const now = new Date();
    await db.transaction(async (tx) => {
      await tx
        .update(coforgeMissions)
        .set({ status: "queued", cancel_requested_at: null, updated_at: now })
        .where(and(eq(coforgeMissions.id, missionId), inArray(coforgeMissions.status, ["failed", "cancelled", "needs_changes"])));
      await tx
        .insert(coforgeMissionEvents)
        .values({
          id: randomUUID(),
          mission_id: missionId,
          event_key: `retry:${missionId}:${attempt + 1}`,
          kind: "retry_requested",
          payload_json: { previousAttempt: attempt },
          created_at: now,
        })
        .onConflictDoNothing();
    });
  },

  async reply(missionId, requestId, body) {
    const now = new Date();
    await db.transaction(async (tx) => {
      const inserted = await tx
        .insert(coforgeMissionReplies)
        .values({ id: requestId, mission_id: missionId, request_id: requestId, body, created_at: now })
        .onConflictDoNothing()
        .returning({ id: coforgeMissionReplies.id });
      if (inserted.length === 0) return;
      await tx.insert(coforgeMissionEvents).values({
        id: randomUUID(),
        mission_id: missionId,
        event_key: `reply:${missionId}:${requestId}`,
        kind: "reply",
        payload_json: { replyId: requestId },
        created_at: now,
      });
    });
  },
};
