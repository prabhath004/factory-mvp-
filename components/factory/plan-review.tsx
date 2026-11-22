"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { CheckIcon, PencilLineIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { MissionPlan } from "@/lib/coforge/contracts";

export function PlanReview({ missionId, version, initialPlan }: { missionId: string; version: number; initialPlan: MissionPlan }) {
  const router = useRouter();
  const [plan, setPlan] = useState(initialPlan);
  const [editing, setEditing] = useState(false);
  const [pending, setPending] = useState<"save" | "approve" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const request = async (path: string, method: "PATCH" | "POST", body: unknown) => {
    const response = await fetch(path, { method, headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    const result = (await response.json()) as { data?: unknown; error?: { message?: string } };
    if (!response.ok) throw new Error(result.error?.message ?? "The request failed.");
    return result.data;
  };

  async function save() {
    setPending("save"); setError(null);
    try {
      await request(`/api/factory/missions/${missionId}/plan`, "PATCH", { planVersion: version, plan });
      setEditing(false); router.refresh();
    } catch (failure) { setError(failure instanceof Error ? failure.message : String(failure)); }
    finally { setPending(null); }
  }

  async function approve() {
    setPending("approve"); setError(null);
    try {
      await request(`/api/factory/missions/${missionId}/approve`, "POST", { planVersion: version });
      router.refresh();
    } catch (failure) { setError(failure instanceof Error ? failure.message : String(failure)); }
    finally { setPending(null); }
  }

  return (
    <section className="min-h-0 flex-1 overflow-y-auto p-5 md:p-8">
      <div className="mx-auto max-w-4xl">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b pb-5">
          <div><p className="font-mono text-xs text-muted-foreground">PLAN v{version}</p><h2 className="mt-1 text-2xl font-semibold tracking-tight">Review before execution</h2><p className="mt-1 max-w-2xl text-sm text-muted-foreground">Approval is the claim boundary. Editing creates a new version and invalidates prior approval.</p></div>
          <Button variant="outline" onClick={() => setEditing((value) => !value)}><PencilLineIcon />{editing ? "Cancel edit" : "Edit plan"}</Button>
        </div>
        <div className="grid gap-7 py-6">
          <div className="grid gap-2"><Label htmlFor="plan-summary">Goal summary</Label>{editing ? <Textarea id="plan-summary" value={plan.summary} onChange={(event) => setPlan({ ...plan, summary: event.target.value })} /> : <p className="text-sm leading-6">{plan.summary}</p>}</div>
          <div>
            <h3 className="mb-3 text-sm font-medium">Executable checklist</h3>
            <ol className="divide-y rounded-lg border">
              {plan.tasks.map((task, index) => (
                <li key={task.ordinal} className="grid grid-cols-[2rem_minmax(0,1fr)] gap-3 p-4">
                  <span className="flex size-7 items-center justify-center rounded-md border bg-muted font-mono text-xs">{task.ordinal}</span>
                  <div className="grid gap-2">
                    {editing ? (
                      <><Input aria-label={`Task ${task.ordinal} title`} value={task.title} onChange={(event) => setPlan({ ...plan, tasks: plan.tasks.map((item, itemIndex) => itemIndex === index ? { ...item, title: event.target.value } : item) })} /><Textarea aria-label={`Task ${task.ordinal} description`} size="sm" value={task.description} onChange={(event) => setPlan({ ...plan, tasks: plan.tasks.map((item, itemIndex) => itemIndex === index ? { ...item, description: event.target.value } : item) })} /></>
                    ) : <><h4 className="font-medium">{task.title}</h4><p className="text-sm leading-6 text-muted-foreground">{task.description}</p></>}
                    <ul className="mt-1 space-y-1 text-xs text-muted-foreground">{task.acceptanceCriteria.map((criterion) => <li key={criterion} className="flex gap-2"><CheckIcon className="mt-0.5 size-3.5 shrink-0 text-success" />{criterion}</li>)}</ul>
                    <p className="mt-1 text-xs"><span className="font-medium">Verify:</span> <span className="text-muted-foreground">{task.verification}</span></p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div><h3 className="text-sm font-medium">Assumptions</h3><ul className="mt-2 list-disc space-y-1 ps-4 text-sm text-muted-foreground">{plan.assumptions.map((item) => <li key={item}>{item}</li>)}</ul></div>
            <div><h3 className="text-sm font-medium">Risks</h3><ul className="mt-2 list-disc space-y-1 ps-4 text-sm text-muted-foreground">{plan.risks.map((item) => <li key={item}>{item}</li>)}</ul></div>
          </div>
          {editing && <div className="grid gap-2"><Label htmlFor="pr-title">Pull request title</Label><Input id="pr-title" value={plan.prTitle} onChange={(event) => setPlan({ ...plan, prTitle: event.target.value })} /></div>}
        </div>
        {error && <p role="alert" className="mb-3 text-sm text-destructive">{error}</p>}
        <div className="sticky bottom-0 flex justify-end gap-2 border-t bg-background/95 py-4 backdrop-blur-sm">
          {editing ? <Button onClick={save} loading={pending === "save"}>Save as new version</Button> : <Button onClick={approve} loading={pending === "approve"}><CheckIcon />Approve &amp; run</Button>}
        </div>
      </div>
    </section>
  );
}
