import type { MissionStatus } from "./contracts";

type JobState = { stage: string; merge_decision?: { outcome?: string; merged?: unknown } | null };

/** Project authoritative runner and GitHub state onto the Coforge product status. */
export function effectiveMissionStatus(status: MissionStatus, job: JobState | null): MissionStatus {
  if (!job || ["cancelled", "merged"].includes(status)) return status;
  if (job.stage === "merged" || job.merge_decision?.merged) return "merged";
  if (job.stage === "failed") return "failed";
  if (job.stage === "waiting") return "waiting_for_user";
  if (job.stage === "verifying") return "verifying";
  if (["queued", "triage", "investigating", "implementing"].includes(job.stage)) return job.stage === "queued" ? "queued" : "running";
  if (job.stage === "pr") {
    if (job.merge_decision?.outcome === "pending") return "reviewing";
    if (job.merge_decision?.outcome === "merge") return "merge_ready";
    if (job.merge_decision?.outcome === "handover") return "completed";
    return "pr_open";
  }
  return status;
}
