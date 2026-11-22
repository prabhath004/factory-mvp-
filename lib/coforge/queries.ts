import { asc, desc, eq, inArray } from "drizzle-orm";
import { agents, coforgeMissionEvents, events, jobEvidence, jobs, machines, runs } from "@/db/schema";
import { db } from "@/db/client";
import { getMission } from "./service";
import { branchCosts } from "@/lib/spend";
import { isOnline, parseHeartbeat, parseInventory, reportedHarnesses } from "@/lib/machine";

export async function missionEvents(owner: string, id: string) {
  const { mission } = await getMission(owner, id);
  const [productEvents, runnerEvents] = await Promise.all([
    db.select().from(coforgeMissionEvents).where(eq(coforgeMissionEvents.mission_id, id)).orderBy(desc(coforgeMissionEvents.created_at)),
    db.select().from(events).where(eq(events.job_key, mission.key)).orderBy(desc(events.at)).limit(100),
  ]);
  return { mission: productEvents, runner: runnerEvents };
}

export async function missionVerification(owner: string, id: string) {
  const { mission } = await getMission(owner, id);
  return db.select().from(jobEvidence).where(eq(jobEvidence.job_key, mission.key)).orderBy(desc(jobEvidence.recorded_at));
}

export async function missionUsage(owner: string, id: string) {
  const { runs: attempts } = await getMission(owner, id);
  const branches = attempts.map((attempt) => attempt.branch_name);
  const costs = await branchCosts(db, branches);
  const sessionRows = branches.length
    ? await db.select().from(runs).where(inArray(runs.branch, branches))
    : [];
  const sessionIds = sessionRows.map((run) => run.session_id);
  const agentRows = sessionIds.length ? await db.select().from(agents).where(inArray(agents.session_id, sessionIds)) : [];
  return {
    source: sessionRows.length === 0 ? "not_reported" : "provider_telemetry",
    attempts: attempts.map((attempt) => ({
      attempt: attempt.attempt,
      branch: attempt.branch_name,
      cost: costs[attempt.branch_name] ?? { usd: 0, known: false },
    })),
    tokens: [...sessionRows, ...agentRows].reduce(
      (total, row) => ({
        input: total.input + row.input_tokens,
        output: total.output + row.output_tokens,
        cacheRead: total.cacheRead + row.cache_read_tokens,
        cacheWrite: total.cacheWrite + row.cache_write_tokens,
      }),
      { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
    ),
  };
}

export async function providers() {
  const rows = await db.select().from(machines).orderBy(asc(machines.name));
  return {
    providers: reportedHarnesses(rows, Date.now()) ?? [],
    reported: rows.some((row) => Array.isArray(parseInventory(row.inventory)?.harnesses)),
  };
}

export async function runnerStatus() {
  const now = Date.now();
  const rows = await db.select().from(machines).orderBy(asc(machines.name));
  return rows.map((machine) => {
    const inventory = parseInventory(machine.inventory);
    return {
      id: machine.id,
      name: machine.name,
      online: isOnline(machine.last_seen_at, now),
      lastSeenAt: machine.last_seen_at,
      heartbeat: parseHeartbeat(machine.heartbeat),
      t3: inventory?.t3 ?? "unknown",
      harnesses: inventory?.harnesses ?? "unknown",
    };
  });
}

export async function missionExecution(owner: string, id: string) {
  const detail = await getMission(owner, id);
  const [job] = await db.select().from(jobs).where(eq(jobs.key, detail.mission.key));
  const sessions = job ? await db.select().from(runs).where(eq(runs.job_key, job.key)).orderBy(desc(runs.last_event_at)) : [];
  return { ...detail, job: job ?? null, sessions };
}
