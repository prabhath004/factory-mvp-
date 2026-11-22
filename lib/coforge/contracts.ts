import { z } from "zod";
import { REPO_NAME } from "@/lib/repo-name";

export const projectModeSchema = z.enum(["greenfield", "brownfield"]);
export type ProjectMode = z.infer<typeof projectModeSchema>;

export const projectInputSchema = z.object({
  name: z.string().trim().min(2, "Give the project a name.").max(80, "Keep the project name under 80 characters."),
  mode: projectModeSchema,
  repo: z.string().trim().regex(REPO_NAME, "Name the repository as owner/name."),
  defaultBranch: z.string().trim().min(1).max(120).default("main"),
});
export type ProjectInput = z.infer<typeof projectInputSchema>;

export const missionStatuses = [
  "draft",
  "planning",
  "awaiting_approval",
  "queued",
  "running",
  "waiting_for_user",
  "verifying",
  "pr_open",
  "reviewing",
  "merge_ready",
  "needs_changes",
  "completed",
  "merged",
  "failed",
  "cancelled",
] as const;
export const missionStatusSchema = z.enum(missionStatuses);
export type MissionStatus = z.infer<typeof missionStatusSchema>;

export const missionTaskStatusSchema = z.enum(["pending", "active", "done", "blocked", "skipped"]);
export type MissionTaskStatus = z.infer<typeof missionTaskStatusSchema>;

const planTaskSchema = z.object({
  ordinal: z.number().int().min(1).max(5),
  title: z.string().trim().min(3).max(140),
  description: z.string().trim().min(3).max(2_000),
  acceptanceCriteria: z.array(z.string().trim().min(1).max(500)).min(1).max(8),
  verification: z.string().trim().min(3).max(1_000),
});
export type MissionPlanTask = z.infer<typeof planTaskSchema>;

export const missionPlanSchema = z
  .object({
    summary: z.string().trim().min(3).max(2_000),
    assumptions: z.array(z.string().trim().min(1).max(500)).max(10),
    risks: z.array(z.string().trim().min(1).max(500)).max(10),
    prTitle: z.string().trim().min(3).max(200),
    verification: z.array(z.string().trim().min(1).max(500)).min(1).max(10),
    tasks: z.array(planTaskSchema).min(2, "Too small: a mission plan needs at least 2 tasks.").max(5),
  })
  .superRefine((plan, context) => {
    const ordinals = plan.tasks.map((task) => task.ordinal);
    if (ordinals.some((ordinal, index) => ordinal !== index + 1)) {
      context.addIssue({ code: "custom", path: ["tasks"], message: "Task ordinals must be consecutive and start at 1." });
    }
  });
export type MissionPlan = z.infer<typeof missionPlanSchema>;

export const createMissionSchema = z.object({
  projectId: z.uuid(),
  goal: z.string().trim().min(10, "Describe the change in at least 10 characters.").max(10_000),
  provider: z.string().trim().min(1).max(200).nullable().default(null),
  model: z.string().trim().min(1).max(200).nullable().default(null),
  acceptanceCriteria: z.array(z.string().trim().min(1).max(500)).max(12).default([]),
  budgetWarningUsd: z.number().positive().max(100_000).nullable().default(null),
});
export type CreateMissionInput = z.infer<typeof createMissionSchema>;

export const updatePlanSchema = z.object({
  planVersion: z.number().int().positive(),
  plan: missionPlanSchema,
});

export const missionReplySchema = z.object({
  requestId: z.uuid(),
  body: z.string().trim().min(1, "Write an answer before sending.").max(4_000),
});

export const missionEventKinds = [
  "created",
  "plan_started",
  "plan_ready",
  "plan_edited",
  "approved",
  "claimed",
  "stage",
  "note",
  "reply",
  "stop_requested",
  "retry_requested",
] as const;
export type MissionEventKind = (typeof missionEventKinds)[number];

type MissionAction =
  | "plan_started"
  | "plan_ready"
  | "plan_edited"
  | "approved"
  | "claimed"
  | "question_asked"
  | "answer_received"
  | "verification_started"
  | "pr_opened"
  | "review_started"
  | "ready_to_merge"
  | "changes_requested"
  | "delivered"
  | "merged"
  | "failed"
  | "cancelled"
  | "retried";

const transitions: Partial<Record<MissionStatus, Partial<Record<MissionAction, MissionStatus>>>> = {
  draft: { plan_started: "planning", cancelled: "cancelled" },
  planning: { plan_ready: "awaiting_approval", failed: "failed", cancelled: "cancelled" },
  awaiting_approval: { plan_edited: "awaiting_approval", approved: "queued", cancelled: "cancelled" },
  queued: { claimed: "running", failed: "failed", cancelled: "cancelled" },
  running: { question_asked: "waiting_for_user", verification_started: "verifying", pr_opened: "pr_open", failed: "failed", cancelled: "cancelled" },
  waiting_for_user: { answer_received: "running", failed: "failed", cancelled: "cancelled" },
  verifying: { pr_opened: "pr_open", question_asked: "waiting_for_user", failed: "failed", cancelled: "cancelled" },
  pr_open: { review_started: "reviewing", ready_to_merge: "merge_ready", changes_requested: "needs_changes", merged: "merged", failed: "failed" },
  reviewing: { ready_to_merge: "merge_ready", changes_requested: "needs_changes", merged: "merged", failed: "failed" },
  merge_ready: { delivered: "completed", changes_requested: "needs_changes", merged: "merged" },
  needs_changes: { claimed: "running", failed: "failed", cancelled: "cancelled" },
  completed: { merged: "merged" },
  failed: { retried: "queued" },
};

export function nextMissionStatus(current: MissionStatus, action: MissionAction): MissionStatus {
  const next = transitions[current]?.[action];
  if (!next) throw new Error(`mission transition ${current} -> ${action} is not allowed`);
  return next;
}
