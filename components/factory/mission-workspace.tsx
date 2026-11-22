import Link from "next/link";
import { CheckCircle2Icon, CircleIcon, CircleSlashIcon, Clock3Icon, ExternalLinkIcon, GitBranchIcon, XCircleIcon } from "lucide-react";
import { Screenshots } from "@/components/panel/screenshots";
import { parseAssessment } from "@/lib/assessment";
import type { missionEvents, missionExecution, missionUsage, missionVerification, runnerStatus } from "@/lib/coforge/queries";
import { cn } from "@/lib/utils";

type Execution = Awaited<ReturnType<typeof missionExecution>>;
type Events = Awaited<ReturnType<typeof missionEvents>>;
type Verification = Awaited<ReturnType<typeof missionVerification>>;
type Usage = Awaited<ReturnType<typeof missionUsage>>;
type Runners = Awaited<ReturnType<typeof runnerStatus>>;

export const MISSION_TABS = ["activity", "logs", "diff", "tests", "pr", "cost"] as const;
export type MissionTab = (typeof MISSION_TABS)[number];

const date = (value: Date | string | null | undefined) => value ? new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)) : "Not reported";
const duration = (ms: number) => ms < 1_000 ? `${ms} ms` : `${(ms / 1_000).toFixed(ms < 10_000 ? 1 : 0)} s`;
const money = (usd: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 4 }).format(usd);

function EmptyFact({ children }: { children: React.ReactNode }) {
  return <p className="rounded-lg border border-dashed p-5 text-sm text-muted-foreground">{children}</p>;
}

function Activity({ events }: { events: Events }) {
  const all = [
    ...events.mission.map((event) => ({ id: event.id, at: event.created_at, label: event.kind.replaceAll("_", " "), detail: event.stage })),
    ...events.runner.map((event) => ({ id: event.event_id, at: event.at, label: event.kind.replaceAll("_", " "), detail: event.refusal })),
  ].sort((a, b) => b.at.getTime() - a.at.getTime());
  if (!all.length) return <EmptyFact>No mission or runner activity has been recorded yet.</EmptyFact>;
  return <ol className="divide-y">{all.map((event) => <li key={event.id} className="grid grid-cols-[1rem_minmax(0,1fr)] gap-3 py-3"><span className="mt-1.5 size-2 rounded-full bg-info" /><div><p className="text-sm capitalize">{event.label}</p>{event.detail && <p className="mt-0.5 text-xs text-muted-foreground">{event.detail}</p>}<time className="mt-1 block text-xs text-muted-foreground">{date(event.at)}</time></div></li>)}</ol>;
}

function Logs({ events }: { events: Events }) {
  if (!events.runner.length) return <EmptyFact>Runner logs will appear after a local runner claims this mission.</EmptyFact>;
  return <div className="overflow-hidden rounded-lg border bg-neutral-950 text-neutral-200"><ol className="divide-y divide-neutral-800 font-mono text-xs">{events.runner.map((event) => <li key={event.event_id} className="grid gap-1 p-3 sm:grid-cols-[9rem_8rem_minmax(0,1fr)]"><time className="text-neutral-500">{date(event.at)}</time><span className="text-blue-300">{event.kind}</span><pre className="overflow-x-auto whitespace-pre-wrap break-words text-neutral-300">{JSON.stringify(event.payload)}</pre></li>)}</ol></div>;
}

function Tests({ rows }: { rows: Verification }) {
  if (!rows.length) return <EmptyFact>No commit-bound verification evidence has been reported. A green badge is never inferred from agent text.</EmptyFact>;
  return <div className="space-y-4">{rows.map((row) => <article key={row.sha} className="rounded-lg border"><header className="flex flex-wrap items-center justify-between gap-2 border-b p-3"><div><p className="font-mono text-xs">{row.sha.slice(0, 12)}</p><p className="mt-1 text-xs text-muted-foreground">{row.producer} · {row.source} · {date(row.recorded_at)}</p></div><span className={cn("rounded-full px-2 py-1 text-xs", row.clean ? "bg-success/10 text-success-foreground" : "bg-warning/10 text-warning-foreground")}>{row.clean ? "Clean commit" : "Dirty tree"}</span></header><ul className="divide-y">{row.checks.map((check, index) => <li key={`${check.name}-${index}`} className="grid grid-cols-[1.25rem_minmax(0,1fr)_auto] gap-2 p-3">{check.passed ? <CheckCircle2Icon className="size-4 text-success" /> : <XCircleIcon className="size-4 text-destructive" />}<div className="min-w-0"><p className="font-medium">{check.name}</p><code className="mt-1 block overflow-x-auto text-xs text-muted-foreground">{check.command}</code>{check.outputTail && <details className="mt-2"><summary className="cursor-pointer text-xs text-muted-foreground">Output tail</summary><pre className="mt-2 max-h-72 overflow-auto rounded bg-neutral-950 p-3 text-xs whitespace-pre-wrap text-neutral-200">{check.outputTail}</pre></details>}</div><p className="text-right text-xs text-muted-foreground">{duration(check.durationMs)}<br />exit {check.exitCode ?? "—"}</p></li>)}</ul></article>)}</div>;
}

function Diff({ execution }: { execution: Execution }) {
  const files = execution.job?.merge_decision?.review?.files ?? [];
  if (!execution.job?.pr_url && files.length === 0) return <EmptyFact>The changed-file list will appear after GitHub reports the delivery pull request.</EmptyFact>;
  return <div className="grid gap-4"><div className="overflow-hidden rounded-lg border"><ul className="divide-y">{files.map((file) => <li key={file.path} className="grid grid-cols-[minmax(0,1fr)_auto_auto] gap-3 p-3 text-sm"><code className="min-w-0 break-all">{file.path}</code><span className="tabular-nums text-success-foreground">+{file.additions}</span><span className="tabular-nums text-destructive-foreground">−{file.deletions}</span></li>)}</ul>{files.length === 0 && <p className="p-4 text-sm text-muted-foreground">GitHub has not reported changed files yet.</p>}</div>{execution.job?.pr_url && <a href={`${execution.job.pr_url}/files`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-sm font-medium text-info hover:underline">Review the full diff on GitHub <ExternalLinkIcon className="size-3.5" /></a>}</div>;
}

function PullRequest({ execution }: { execution: Execution }) {
  const decision = execution.job?.merge_decision;
  const assessment = parseAssessment(execution.job?.merge_assessment);
  const prUrl = execution.job?.pr_url ?? execution.runs.find((run) => run.pr_url)?.pr_url;
  if (!execution.job) return <EmptyFact>No runner job has been claimed yet, so there is no pull request state.</EmptyFact>;
  return <div className="grid gap-4"><section className="rounded-lg border p-4"><p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Delivery pull request</p>{prUrl ? <a href={prUrl} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1.5 font-medium text-info hover:underline">Open pull request <ExternalLinkIcon className="size-3.5" /></a> : <p className="mt-2 text-sm text-muted-foreground">Not opened yet.</p>}<dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2"><div><dt className="text-muted-foreground">Decision</dt><dd className="mt-1 capitalize">{decision?.outcome?.replaceAll("_", " ") ?? "Not evaluated"}</dd></div><div><dt className="text-muted-foreground">Head commit</dt><dd className="mt-1 font-mono text-xs">{decision?.headSha?.slice(0, 12) ?? "Not reported"}</dd></div><div><dt className="text-muted-foreground">Changed files</dt><dd className="mt-1">{decision?.review?.fileCount ?? "Not reported"}</dd></div><div><dt className="text-muted-foreground">Bugbot review</dt><dd className="mt-1 capitalize">{decision?.review?.bugbot.state ?? "Not reported"}</dd></div></dl></section>{assessment?.screenshots?.length && execution.job ? <section><h3 className="mb-2 text-sm font-medium">Browser evidence</h3><Screenshots job={execution.job} assessment={assessment} /></section> : null}{decision?.reasons?.length ? <section><h3 className="text-sm font-medium">Decision reasons</h3><ul className="mt-2 list-disc space-y-1 ps-5 text-sm text-muted-foreground">{decision.reasons.map((reason) => <li key={reason}>{reason}</li>)}</ul></section> : null}</div>;
}

function Cost({ usage, warningUsd }: { usage: Usage; warningUsd: number | null }) {
  const known = usage.attempts.some((attempt) => attempt.cost.known);
  const total = usage.attempts.reduce((sum, attempt) => sum + (attempt.cost.known ? attempt.cost.usd : 0), 0);
  const tokenTotal = usage.tokens.input + usage.tokens.output + usage.tokens.cacheRead + usage.tokens.cacheWrite;
  return <div className="grid gap-4">{known && warningUsd !== null && total >= warningUsd && <p role="status" className="rounded-lg border border-warning/30 bg-warning/5 p-3 text-sm text-warning-foreground">Reported spend has reached the {money(warningUsd)} warning threshold. This warning does not stop the run.</p>}<div className="grid gap-3 sm:grid-cols-2"><section className="rounded-lg border p-4"><p className="text-xs text-muted-foreground">Reported spend</p><p className="mt-2 text-2xl font-semibold tabular-nums">{known ? money(total) : "Not reported"}</p>{warningUsd !== null && <p className="mt-1 text-xs text-muted-foreground">Warning at {money(warningUsd)}</p>}</section><section className="rounded-lg border p-4"><p className="text-xs text-muted-foreground">Reported tokens</p><p className="mt-2 text-2xl font-semibold tabular-nums">{tokenTotal ? tokenTotal.toLocaleString() : "Not reported"}</p></section></div><div className="rounded-lg border"><ul className="divide-y">{usage.attempts.map((attempt) => <li key={attempt.attempt} className="flex items-center justify-between gap-4 p-3 text-sm"><span>Attempt {attempt.attempt} · <code className="text-xs text-muted-foreground">{attempt.branch}</code></span><span>{attempt.cost.known ? money(attempt.cost.usd) : "Not reported"}</span></li>)}</ul>{!usage.attempts.length && <p className="p-4 text-sm text-muted-foreground">No execution attempts yet.</p>}</div><p className="text-xs text-muted-foreground">Source: {usage.source === "provider_telemetry" ? "provider telemetry" : "no provider telemetry"}. Unknown values are not estimated.</p></div>;
}

export function MissionWorkspace({ execution, events, verification, usage, runners, tab }: { execution: Execution; events: Events; verification: Verification; usage: Usage; runners: Runners; tab: MissionTab }) {
  const online = runners.filter((runner) => runner.online);
  const latestRun = execution.runs[0];
  return <div className="grid min-h-0 flex-1 overflow-y-auto xl:grid-cols-[240px_minmax(0,1fr)_280px] xl:overflow-hidden">
    <aside className="border-b p-4 xl:overflow-y-auto xl:border-e xl:border-b-0"><p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Task plan</p><ol className="mt-3 space-y-3">{execution.tasks.map((task) => <li key={task.id} className="grid grid-cols-[1.25rem_minmax(0,1fr)] gap-2">{task.status === "done" ? <CheckCircle2Icon className="size-4 text-success" /> : task.status === "blocked" ? <CircleSlashIcon className="size-4 text-destructive" /> : task.status === "active" ? <Clock3Icon className="size-4 animate-pulse text-info" /> : <CircleIcon className="size-4 text-muted-foreground" />}<div><p className="text-sm font-medium leading-5">{task.title}</p><p className="mt-0.5 text-xs capitalize text-muted-foreground">{task.status}</p></div></li>)}</ol>{!execution.tasks.length && <p className="mt-3 text-sm text-muted-foreground">The plan has not been generated.</p>}</aside>
    <main className="min-w-0 xl:overflow-y-auto"><nav aria-label="Mission details" className="sticky top-0 z-10 flex gap-1 overflow-x-auto border-b bg-background px-4 pt-2">{MISSION_TABS.map((item) => <Link key={item} href={`/missions/${execution.mission.id}?tab=${item}`} aria-current={tab === item ? "page" : undefined} className={cn("border-b-2 px-3 py-2 text-sm capitalize", tab === item ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground")}>{item}</Link>)}</nav><div className="p-4 md:p-6">{tab === "activity" && <Activity events={events} />}{tab === "logs" && <Logs events={events} />}{tab === "diff" && <Diff execution={execution} />}{tab === "tests" && <Tests rows={verification} />}{tab === "pr" && <PullRequest execution={execution} />}{tab === "cost" && <Cost usage={usage} warningUsd={execution.mission.budget_warning_usd} />}</div></main>
    <aside className="border-t p-4 xl:overflow-y-auto xl:border-s xl:border-t-0"><p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Run inspector</p><dl className="mt-4 grid gap-4 text-sm"><div><dt className="text-muted-foreground">Repository</dt><dd className="mt-1">{execution.project.repo_url}</dd></div><div><dt className="text-muted-foreground">Branch</dt><dd className="mt-1 flex items-center gap-1.5 break-all font-mono text-xs"><GitBranchIcon className="size-3.5 shrink-0" />{latestRun?.branch_name ?? "Not assigned"}</dd></div><div><dt className="text-muted-foreground">Run ID</dt><dd className="mt-1 break-all font-mono text-xs">{latestRun?.id ?? "Not assigned"}</dd></div><div><dt className="text-muted-foreground">Provider / model</dt><dd className="mt-1">{latestRun?.provider ?? execution.mission.selected_provider ?? "Runner default"}<br /><span className="text-xs text-muted-foreground">{latestRun?.model ?? execution.mission.selected_model ?? "Runner default"}</span></dd></div><div><dt className="text-muted-foreground">Final commit</dt><dd className="mt-1 font-mono text-xs">{latestRun?.final_commit_sha?.slice(0, 12) ?? "Not reported"}</dd></div><div><dt className="text-muted-foreground">Runner health</dt><dd className={cn("mt-1", online.length ? "text-success-foreground" : "text-warning-foreground")}>{online.length ? `${online.length} online` : runners.length ? "All runners offline or stale" : "No runner registered"}</dd>{runners[0] && <p className="mt-1 text-xs text-muted-foreground">Last seen {date(runners[0].lastSeenAt)}</p>}</div><div><dt className="text-muted-foreground">Attempt</dt><dd className="mt-1">{latestRun ? `#${latestRun.attempt} · ${latestRun.status}` : "Not started"}</dd></div></dl></aside>
  </div>;
}
