"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import { AlertCircleIcon, ArrowRightIcon } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type Project = { id: string; name: string; repo_url: string };
type Harness = { id: string; name: string; enabled: boolean; models: { slug: string; name?: string }[] };

export function NewMissionForm({ projects, harnesses, providersReported }: { projects: Project[]; harnesses: Harness[]; providersReported: boolean }) {
  const router = useRouter();
  const [provider, setProvider] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const models = useMemo(() => harnesses.find((harness) => harness.id === provider)?.models ?? [], [harnesses, provider]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    const data = new FormData(event.currentTarget);
    const acceptanceCriteria = String(data.get("acceptanceCriteria") ?? "").split("\n").map((item) => item.trim()).filter(Boolean);
    const budgetWarning = String(data.get("budgetWarningUsd") ?? "").trim();
    const created = await fetch("/api/factory/missions", {
      method: "POST",
      headers: { "content-type": "application/json", "idempotency-key": crypto.randomUUID() },
      body: JSON.stringify({
        projectId: data.get("projectId"),
        goal: data.get("goal"),
        provider: provider || null,
        model: data.get("model") || null,
        acceptanceCriteria,
        budgetWarningUsd: budgetWarning ? Number(budgetWarning) : null,
      }),
    });
    const result = (await created.json()) as { data?: { id: string }; error?: { message?: string } };
    if (!created.ok || !result.data) {
      setPending(false);
      return setError(result.error?.message ?? "Could not create the mission.");
    }
    const planned = await fetch(`/api/factory/missions/${result.data.id}/plan`, { method: "POST" });
    if (!planned.ok) {
      const failure = (await planned.json()) as { error?: { message?: string } };
      setPending(false);
      return setError(failure.error?.message ?? "The mission was saved, but its plan could not be generated.");
    }
    router.push(`/missions/${result.data.id}`);
    router.refresh();
  }

  if (projects.length === 0) {
    return (
      <Alert variant="warning" className="max-w-2xl">
        <AlertCircleIcon />
        <AlertTitle>Create a project first</AlertTitle>
        <AlertDescription><span>A mission must target an enabled repository. <Link href="/projects" className="font-medium text-foreground underline underline-offset-4">Set up a project</Link>.</span></AlertDescription>
      </Alert>
    );
  }

  return (
    <form onSubmit={submit} className="grid max-w-3xl gap-6">
      <div className="grid gap-2">
        <Label htmlFor="mission-goal">What should the factory change?</Label>
        <Textarea id="mission-goal" name="goal" required minLength={10} maxLength={10_000} size="lg" placeholder="Add claim status tracking. Show a status history and let an adjuster update a claim." autoFocus />
        <p className="text-xs text-muted-foreground">Be specific about the user-visible outcome. The plan remains editable before execution.</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="mission-project">Existing repository</Label>
          <select id="mission-project" name="projectId" required className="h-9 rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring">
            {projects.map((project) => <option key={project.id} value={project.id}>{project.name} · {project.repo_url}</option>)}
          </select>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="mission-provider">Local agent</Label>
          <select id="mission-provider" value={provider} onChange={(event) => setProvider(event.target.value)} className="h-9 rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <option value="">Use Factory settings</option>
            {harnesses.map((harness) => <option key={harness.id} value={harness.id} disabled={!harness.enabled || harness.models.length === 0}>{harness.name}{!harness.enabled ? " · unavailable" : harness.models.length === 0 ? " · no models" : ""}</option>)}
          </select>
          {!providersReported && <p className="text-xs text-warning-foreground">No runner has reported its provider inventory yet.</p>}
        </div>
        {provider && (
          <div className="grid gap-2 sm:col-start-2">
            <Label htmlFor="mission-model">Model</Label>
            <select id="mission-model" name="model" required className="h-9 rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring">
              {models.map((model) => <option key={model.slug} value={model.slug}>{model.name ?? model.slug}</option>)}
            </select>
          </div>
        )}
      </div>
      <details className="rounded-lg border bg-card">
        <summary className="cursor-pointer px-4 py-3 text-sm font-medium outline-none focus-visible:ring-2 focus-visible:ring-ring">Advanced acceptance criteria</summary>
        <div className="border-t p-4">
          <Label htmlFor="mission-criteria">One criterion per line</Label>
          <Textarea id="mission-criteria" name="acceptanceCriteria" className="mt-2" placeholder={"Status persists after refresh\nClaim history is visible"} />
          <Label htmlFor="mission-budget" className="mt-4">Cost warning (USD, optional)</Label>
          <input id="mission-budget" name="budgetWarningUsd" type="number" min="0.01" max="100000" step="0.01" inputMode="decimal" className="mt-2 h-9 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring" placeholder="10.00" />
          <p className="mt-1 text-xs text-muted-foreground">Warns when reported spend reaches this value. It does not stop the run.</p>
        </div>
      </details>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      <div className="flex items-center justify-between gap-4 border-t pt-4">
        <p className="text-xs text-muted-foreground">Runs locally in a Git worktree. Worktrees are not a security sandbox.</p>
        <Button type="submit" loading={pending}>Generate plan<ArrowRightIcon /></Button>
      </div>
    </form>
  );
}
