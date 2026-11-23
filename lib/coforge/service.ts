import { createHash, randomUUID } from "node:crypto";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import {
  coforgeMissionEvents,
  coforgeMissionReplies,
  coforgeMissionRuns,
  coforgeMissions,
  coforgeMissionTasks,
  coforgeProjects,
  jobs,
  machines,
  repoSettings,
} from "@/db/schema";
import {
  createMissionSchema,
  missionPlanSchema,
  missionReplySchema,
  projectInputSchema,
  updatePlanSchema,
  type MissionPlan,
} from "./contracts";
import { buildMissionPlan } from "./planner";
import { reportedHarnesses } from "@/lib/machine";

export class CoforgeError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly status: 400 | 404 | 409 | 422,
    readonly details?: unknown,
  ) {
    super(message);
  }
}

const isUniqueViolation = (error: unknown): boolean => {
  const candidate = error as { code?: string; cause?: unknown };
  return candidate.code === "23505" || (candidate.cause !== undefined && isUniqueViolation(candidate.cause));
};

const slug = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "project";

const requestHash = (value: unknown) => createHash("sha256").update(JSON.stringify(value)).digest("hex");

async function projectOwnedBy(owner: string, id: string) {
  const [project] = await db
    .select()
    .from(coforgeProjects)
    .where(and(eq(coforgeProjects.id, id), eq(coforgeProjects.owner_id, owner)));
  if (!project) throw new CoforgeError("PROJECT_NOT_FOUND", "Project not found.", 404);
  return project;
}

async function missionOwnedBy(owner: string, id: string) {
  const [mission] = await db
    .select()
    .from(coforgeMissions)
    .where(and(eq(coforgeMissions.id, id), eq(coforgeMissions.owner_id, owner)));
  if (!mission) throw new CoforgeError("MISSION_NOT_FOUND", "Mission not found.", 404);
  return mission;
}

export async function createProject(owner: string, input: unknown) {
  const parsed = projectInputSchema.safeParse(input);
  if (!parsed.success) throw new CoforgeError("VALIDATION_ERROR", "Project input is invalid.", 422, parsed.error.flatten());
  if (parsed.data.mode !== "brownfield") throw new CoforgeError("P1_NOT_AVAILABLE", "New application projects are not available in the P0 local runner.", 422);
  const [registered] = await db.select().from(repoSettings).where(and(eq(repoSettings.repo, parsed.data.repo), eq(repoSettings.enabled, true)));
  if (!registered) throw new CoforgeError("REPOSITORY_NOT_REGISTERED", "Choose an enabled repository from Factory settings.", 422);
  const now = new Date();
  const [existing] = await db
    .select()
    .from(coforgeProjects)
    .where(and(eq(coforgeProjects.owner_id, owner), eq(coforgeProjects.repo_url, parsed.data.repo)));
  if (existing) {
    const [updated] = await db
      .update(coforgeProjects)
      .set({ name: parsed.data.name, repo_default_branch: parsed.data.defaultBranch, updated_at: now })
      .where(eq(coforgeProjects.id, existing.id))
      .returning();
    return updated!;
  }
  const id = randomUUID();
  const baseSlug = slug(parsed.data.name);
  try {
    const [project] = await db
      .insert(coforgeProjects)
      .values({
        id,
        owner_id: owner,
        name: parsed.data.name,
        slug: baseSlug,
        mode: parsed.data.mode,
        repo_url: parsed.data.repo,
        repo_default_branch: parsed.data.defaultBranch,
        created_at: now,
        updated_at: now,
      })
      .returning();
    return project!;
  } catch (error) {
    if (!isUniqueViolation(error)) throw error;
    const [project] = await db
      .insert(coforgeProjects)
      .values({
        id,
        owner_id: owner,
        name: parsed.data.name,
        slug: `${baseSlug}-${id.slice(0, 8)}`,
        mode: parsed.data.mode,
        repo_url: parsed.data.repo,
        repo_default_branch: parsed.data.defaultBranch,
        created_at: now,
        updated_at: now,
      })
      .onConflictDoNothing()
      .returning();
    if (!project) throw new CoforgeError("PROJECT_CONFLICT", "This project already exists.", 409);
    return project;
  }
}

export const listProjects = (owner: string) =>
  db.select().from(coforgeProjects).where(eq(coforgeProjects.owner_id, owner)).orderBy(desc(coforgeProjects.updated_at));

export const getProject = (owner: string, id: string) => projectOwnedBy(owner, id);

export async function createMission(owner: string, idempotencyKey: string, input: unknown) {
  if (idempotencyKey.length < 8 || idempotencyKey.length > 200) {
    throw new CoforgeError("IDEMPOTENCY_KEY_REQUIRED", "Provide an Idempotency-Key between 8 and 200 characters.", 400);
  }
  const parsed = createMissionSchema.safeParse(input);
  if (!parsed.success) throw new CoforgeError("VALIDATION_ERROR", "Mission input is invalid.", 422, parsed.error.flatten());
  const project = await projectOwnedBy(owner, parsed.data.projectId);
  if (parsed.data.provider) {
    const harnesses = reportedHarnesses(await db.select().from(machines), Date.now());
    const provider = harnesses?.find((harness) => harness.id === parsed.data.provider && harness.enabled);
    if (!provider) throw new CoforgeError("PROVIDER_UNAVAILABLE", "The selected provider is not currently available on a runner.", 422);
    if (parsed.data.model && !provider.models.some((model) => model.slug === parsed.data.model)) {
      throw new CoforgeError("MODEL_UNAVAILABLE", "The selected model is not available for that provider.", 422);
    }
  } else if (parsed.data.model) {
    throw new CoforgeError("PROVIDER_REQUIRED", "Select a provider when selecting a model.", 422);
  }
  const hash = requestHash(parsed.data);
  const now = new Date();
  const id = randomUUID();
  try {
    return await db.transaction(async (tx) => {
      const [mission] = await tx
        .insert(coforgeMissions)
        .values({
          id,
          project_id: project.id,
          owner_id: owner,
          goal: parsed.data.goal,
          mode: project.mode,
          status: "draft",
          acceptance_criteria_json: parsed.data.acceptanceCriteria,
          selected_provider: parsed.data.provider,
          selected_model: parsed.data.model,
          budget_warning_usd: parsed.data.budgetWarningUsd,
          idempotency_key: idempotencyKey,
          request_hash: hash,
          created_at: now,
          updated_at: now,
        })
        .returning();
      await tx.insert(coforgeMissionEvents).values({
        id: randomUUID(),
        mission_id: mission!.id,
        event_key: `created:${mission!.id}`,
        kind: "created",
        payload_json: { projectId: project.id },
        created_at: now,
      });
      return mission!;
    });
  } catch (error) {
    if (!isUniqueViolation(error)) throw error;
    const [existing] = await db
      .select()
      .from(coforgeMissions)
      .where(and(eq(coforgeMissions.owner_id, owner), eq(coforgeMissions.idempotency_key, idempotencyKey)));
    if (!existing) throw error;
    if (existing.request_hash !== hash) {
      throw new CoforgeError("IDEMPOTENCY_CONFLICT", "This Idempotency-Key was already used with different mission input.", 409);
    }
    return existing;
  }
}

async function replaceTasks(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  missionId: string,
  plan: MissionPlan,
) {
  await tx.delete(coforgeMissionTasks).where(eq(coforgeMissionTasks.mission_id, missionId));
  await tx.insert(coforgeMissionTasks).values(
    plan.tasks.map((task) => ({
      id: randomUUID(),
      mission_id: missionId,
      ordinal: task.ordinal,
      title: task.title,
      description: task.description,
      acceptance_criteria_json: task.acceptanceCriteria,
      capability: task.capability,
      agent_policy: task.agentPolicy,
      depends_on_json: task.dependsOn,
      skills_json: task.skills,
      status: "pending" as const,
    })),
  );
}

export async function planMission(owner: string, id: string) {
  const mission = await missionOwnedBy(owner, id);
  if (!["draft", "failed", "awaiting_approval"].includes(mission.status)) {
    throw new CoforgeError("INVALID_STATE", `A mission in ${mission.status} cannot be planned.`, 409);
  }
  const project = await projectOwnedBy(owner, mission.project_id);
  const plan = buildMissionPlan({ goal: mission.goal, acceptanceCriteria: mission.acceptance_criteria_json, repository: project.repo_url });
  const version = mission.plan_version + 1;
  const now = new Date();
  await db.transaction(async (tx) => {
    const updated = await tx
      .update(coforgeMissions)
      .set({ status: "awaiting_approval", plan_version: version, plan_json: plan, approved_at: null, approved_plan_version: null, updated_at: now })
      .where(and(eq(coforgeMissions.id, id), eq(coforgeMissions.owner_id, owner), eq(coforgeMissions.plan_version, mission.plan_version)))
      .returning({ id: coforgeMissions.id });
    if (updated.length === 0) throw new CoforgeError("STALE_PLAN", "The plan changed. Refresh and try again.", 409);
    await replaceTasks(tx, id, plan);
    await tx.insert(coforgeMissionEvents).values([
      {
        id: randomUUID(),
        mission_id: id,
        event_key: `plan-started:${id}:${version}`,
        kind: "plan_started",
        payload_json: { planVersion: version },
        created_at: now,
      },
      {
        id: randomUUID(),
        mission_id: id,
        event_key: `plan:${id}:${version}`,
        kind: "plan_ready",
        payload_json: { planVersion: version },
        created_at: now,
      },
    ]);
  });
  return { planVersion: version, plan };
}

export async function updateMissionPlan(owner: string, id: string, input: unknown) {
  const parsed = updatePlanSchema.safeParse(input);
  if (!parsed.success) throw new CoforgeError("VALIDATION_ERROR", "Plan input is invalid.", 422, parsed.error.flatten());
  const mission = await missionOwnedBy(owner, id);
  if (mission.status !== "awaiting_approval" || mission.plan_version !== parsed.data.planVersion) {
    throw new CoforgeError("STALE_PLAN", "The plan changed. Refresh before editing it again.", 409);
  }
  const plan = missionPlanSchema.parse(parsed.data.plan);
  const version = mission.plan_version + 1;
  const now = new Date();
  await db.transaction(async (tx) => {
    const updated = await tx
      .update(coforgeMissions)
      .set({ plan_version: version, plan_json: plan, approved_at: null, approved_plan_version: null, updated_at: now })
      .where(and(eq(coforgeMissions.id, id), eq(coforgeMissions.owner_id, owner), eq(coforgeMissions.plan_version, mission.plan_version)))
      .returning({ id: coforgeMissions.id });
    if (updated.length === 0) throw new CoforgeError("STALE_PLAN", "The plan changed. Refresh and try again.", 409);
    await replaceTasks(tx, id, plan);
    await tx.insert(coforgeMissionEvents).values({
      id: randomUUID(),
      mission_id: id,
      event_key: `plan-edit:${id}:${version}`,
      kind: "plan_edited",
      payload_json: { planVersion: version },
      created_at: now,
    });
  });
  return { planVersion: version, plan };
}

export async function approveMission(owner: string, id: string, planVersion: unknown) {
  if (!Number.isInteger(planVersion) || Number(planVersion) < 1) throw new CoforgeError("VALIDATION_ERROR", "A valid planVersion is required.", 422);
  const mission = await missionOwnedBy(owner, id);
  if (mission.status === "queued" && mission.approved_plan_version === planVersion) return mission;
  if (mission.status !== "awaiting_approval" || mission.plan_version !== planVersion || !mission.plan_json) {
    throw new CoforgeError("STALE_PLAN", "Only the current plan can be approved.", 409);
  }
  const now = new Date();
  return db.transaction(async (tx) => {
    const [approved] = await tx
      .update(coforgeMissions)
      .set({ status: "queued", approved_at: now, approved_plan_version: mission.plan_version, updated_at: now })
      .where(and(eq(coforgeMissions.id, id), eq(coforgeMissions.owner_id, owner), eq(coforgeMissions.status, "awaiting_approval"), eq(coforgeMissions.plan_version, mission.plan_version)))
      .returning();
    if (!approved) throw new CoforgeError("STALE_PLAN", "The plan changed before approval.", 409);
    await tx.insert(coforgeMissionEvents).values({
      id: randomUUID(),
      mission_id: id,
      event_key: `approved:${id}:${mission.plan_version}`,
      kind: "approved",
      payload_json: { planVersion: mission.plan_version },
      created_at: now,
    });
    return approved;
  });
}

export async function requestMissionStop(owner: string, id: string) {
  const mission = await missionOwnedBy(owner, id);
  if (["completed", "merged", "failed", "cancelled"].includes(mission.status)) return mission;
  const now = new Date();
  const terminalBeforeRun = ["draft", "planning", "awaiting_approval", "queued"].includes(mission.status);
  const [updated] = await db
    .update(coforgeMissions)
    .set({ cancel_requested_at: now, ...(terminalBeforeRun ? { status: "cancelled" as const } : {}), updated_at: now })
    .where(and(eq(coforgeMissions.id, id), eq(coforgeMissions.owner_id, owner)))
    .returning();
  await db
    .insert(coforgeMissionEvents)
    .values({ id: randomUUID(), mission_id: id, event_key: `stop:${id}`, kind: "stop_requested", payload_json: {}, created_at: now })
    .onConflictDoNothing();
  return updated!;
}

export async function retryMission(owner: string, id: string) {
  const mission = await missionOwnedBy(owner, id);
  if (!inArrayValue(mission.status, ["failed", "cancelled", "needs_changes"])) {
    throw new CoforgeError("INVALID_STATE", `A mission in ${mission.status} cannot be retried.`, 409);
  }
  const attempt = (await db.select().from(coforgeMissionRuns).where(eq(coforgeMissionRuns.mission_id, id))).length + 1;
  const now = new Date();
  const [updated] = await db
    .update(coforgeMissions)
    .set({ status: "queued", cancel_requested_at: null, updated_at: now })
    .where(and(eq(coforgeMissions.id, id), eq(coforgeMissions.owner_id, owner)))
    .returning();
  await db
    .insert(coforgeMissionEvents)
    .values({ id: randomUUID(), mission_id: id, event_key: `retry:${id}:${attempt}`, kind: "retry_requested", payload_json: { attempt }, created_at: now })
    .onConflictDoNothing();
  return updated!;
}

function inArrayValue<T extends string>(value: string, values: readonly T[]): value is T {
  return values.includes(value as T);
}

export async function replyToMission(owner: string, id: string, input: unknown) {
  const parsed = missionReplySchema.safeParse(input);
  if (!parsed.success) throw new CoforgeError("VALIDATION_ERROR", "Reply input is invalid.", 422, parsed.error.flatten());
  const mission = await missionOwnedBy(owner, id);
  if (mission.status !== "waiting_for_user") throw new CoforgeError("INVALID_STATE", "This mission is not waiting for an answer.", 409);
  const now = new Date();
  await db.transaction(async (tx) => {
    const inserted = await tx
      .insert(coforgeMissionReplies)
      .values({ id: parsed.data.requestId, mission_id: id, request_id: parsed.data.requestId, body: parsed.data.body, created_at: now })
      .onConflictDoNothing()
      .returning({ id: coforgeMissionReplies.id });
    if (inserted.length === 0) return;
    await tx.insert(coforgeMissionEvents).values({
      id: randomUUID(),
      mission_id: id,
      event_key: `reply:${id}:${parsed.data.requestId}`,
      kind: "reply",
      payload_json: { replyId: parsed.data.requestId },
      created_at: now,
    });
  });
  return { accepted: true };
}

export async function listMissions(owner: string, filters: { status?: string; projectId?: string } = {}) {
  const conditions = [eq(coforgeMissions.owner_id, owner)];
  if (filters.status) conditions.push(eq(coforgeMissions.status, filters.status as typeof coforgeMissions.$inferSelect.status));
  if (filters.projectId) conditions.push(eq(coforgeMissions.project_id, filters.projectId));
  return db
    .select({ mission: coforgeMissions, project: coforgeProjects, job: jobs })
    .from(coforgeMissions)
    .innerJoin(coforgeProjects, eq(coforgeProjects.id, coforgeMissions.project_id))
    .leftJoin(jobs, eq(jobs.key, coforgeMissions.key))
    .where(and(...conditions))
    .orderBy(desc(coforgeMissions.updated_at))
    .limit(100);
}

export async function getMission(owner: string, id: string) {
  const mission = await missionOwnedBy(owner, id);
  const [project, tasks, runs] = await Promise.all([
    projectOwnedBy(owner, mission.project_id),
    db.select().from(coforgeMissionTasks).where(eq(coforgeMissionTasks.mission_id, id)).orderBy(coforgeMissionTasks.ordinal),
    db.select().from(coforgeMissionRuns).where(eq(coforgeMissionRuns.mission_id, id)).orderBy(desc(coforgeMissionRuns.attempt)),
  ]);
  return { mission, project, tasks, runs };
}
