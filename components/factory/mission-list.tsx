"use client";

import { ArrowRightIcon, GitPullRequestIcon, RocketIcon } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import type { listMissions } from "@/lib/coforge/service";
import { effectiveMissionStatus } from "@/lib/coforge/status";
import { MissionStatusBadge } from "./status-badge";

type Missions = Awaited<ReturnType<typeof listMissions>>;

const elapsed = (date: Date) => {
  const seconds = Math.max(0, Math.round((Date.now() - date.getTime()) / 1000));
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  return hours < 24 ? `${hours}h ago` : `${Math.floor(hours / 24)}d ago`;
};

export function MissionList({ missions }: { missions: Missions }) {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const shown = useMemo(() => missions.filter(({ mission, project, job }) => {
    const matchesStatus = status === "all" || effectiveMissionStatus(mission.status, job) === status;
    const text = `${mission.key} ${mission.goal} ${project.name} ${project.repo_url}`.toLowerCase();
    return matchesStatus && text.includes(search.trim().toLowerCase());
  }), [missions, search, status]);
  if (missions.length === 0) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon"><RocketIcon /></EmptyMedia>
          <EmptyTitle>No missions yet</EmptyTitle>
          <EmptyDescription>Describe a bounded change, review the plan, and send it to your local runner.</EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button render={<Link href="/missions/new" />}>New mission</Button>
        </EmptyContent>
      </Empty>
    );
  }
  return (
    <div className="min-w-0">
      <div className="flex flex-col gap-2 border-b px-5 py-3 sm:flex-row">
        <input aria-label="Search missions" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search mission, project, or repository" className="h-9 min-w-0 flex-1 rounded-lg border border-input bg-background px-3 text-sm outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring" />
        <select aria-label="Filter missions by status" value={status} onChange={(event) => setStatus(event.target.value)} className="h-9 rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <option value="all">All statuses</option>
          {[...new Set(missions.map(({ mission, job }) => effectiveMissionStatus(mission.status, job)))].map((value) => <option key={value} value={value}>{value.replaceAll("_", " ")}</option>)}
        </select>
      </div>
      {shown.length === 0 ? <p className="p-8 text-center text-sm text-muted-foreground">No missions match these filters.</p> : <div className="overflow-x-auto">
      <table className="w-full min-w-192 border-collapse text-left text-sm">
        <thead className="sticky top-0 z-10 bg-background text-xs text-muted-foreground">
          <tr className="border-b">
            <th className="h-10 px-5 font-medium">Mission</th>
            <th className="px-3 font-medium">Project</th>
            <th className="px-3 font-medium">Stage</th>
            <th className="px-3 font-medium">Agent</th>
            <th className="px-3 font-medium">PR</th>
            <th className="px-3 font-medium">Last activity</th>
            <th className="w-10 px-3"><span className="sr-only">Open</span></th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {shown.map(({ mission, project, job }) => {
            const status = effectiveMissionStatus(mission.status, job);
            return (
            <tr key={mission.id} className="group hover:bg-accent/40">
              <td className="max-w-md px-5 py-3">
                <Link href={`/missions/${mission.id}`} className="block truncate font-medium outline-none group-hover:text-primary focus-visible:underline">
                  {mission.goal}
                </Link>
                <span className="mt-0.5 block font-mono text-[11px] text-muted-foreground">{mission.key}</span>
              </td>
              <td className="px-3 py-3">
                <span className="block font-medium">{project.name}</span>
                <span className="block font-mono text-[11px] text-muted-foreground">{project.repo_url}</span>
              </td>
              <td className="px-3 py-3"><MissionStatusBadge status={status} /></td>
              <td className="px-3 py-3 font-mono text-xs text-muted-foreground">{mission.selected_provider ?? "Settings"}</td>
              <td className="px-3 py-3 text-muted-foreground">
                {["pr_open", "reviewing", "merge_ready", "completed"].includes(status) ? <span className="inline-flex items-center gap-1"><GitPullRequestIcon className="size-3.5" /> Open</span> : status === "merged" ? <span className="inline-flex items-center gap-1"><GitPullRequestIcon className="size-3.5" /> Merged</span> : "—"}
              </td>
              <td className="px-3 py-3 tabular-nums text-muted-foreground">{elapsed(mission.updated_at)}</td>
              <td className="px-3 py-3"><ArrowRightIcon className="size-4 text-faint transition-transform group-hover:translate-x-0.5 group-hover:text-foreground" /></td>
            </tr>
            );
          })}
        </tbody>
      </table>
      </div>}
    </div>
  );
}
