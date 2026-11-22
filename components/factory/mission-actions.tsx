"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { RotateCcwIcon, SendIcon, SquareIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { MissionStatus } from "@/lib/coforge/contracts";

export function MissionActions({ missionId, status, question }: { missionId: string; status: MissionStatus; question?: string | null }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function action(name: "stop" | "retry", body?: unknown) {
    setPending(true); setError(null);
    const response = await fetch(`/api/factory/missions/${missionId}/${name}`, { method: "POST", ...(body ? { headers: { "content-type": "application/json" }, body: JSON.stringify(body) } : {}) });
    const result = (await response.json()) as { error?: { message?: string } };
    setPending(false);
    if (!response.ok) return setError(result.error?.message ?? `Could not ${name} the mission.`);
    router.refresh();
  }

  async function reply(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const body = String(new FormData(form).get("answer") ?? "");
    setPending(true); setError(null);
    const response = await fetch(`/api/factory/missions/${missionId}/reply`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ requestId: crypto.randomUUID(), body }) });
    const result = (await response.json()) as { error?: { message?: string } };
    setPending(false);
    if (!response.ok) return setError(result.error?.message ?? "Could not send the answer.");
    form.reset(); router.refresh();
  }

  if (status === "waiting_for_user") return (
    <form onSubmit={reply} className="border-b border-warning/30 bg-warning/5 p-4">
      <p className="text-sm font-medium">Agent needs a decision</p><p className="mt-1 text-sm text-muted-foreground">{question ?? "Review the run context and provide a precise answer."}</p>
      <Textarea name="answer" required maxLength={4_000} size="sm" className="mt-3" placeholder="Answer for the active run" />
      <div className="mt-2 flex items-center justify-end gap-2">{error && <p role="alert" className="me-auto text-xs text-destructive">{error}</p>}<Button type="submit" size="sm" loading={pending}><SendIcon />Send answer</Button></div>
    </form>
  );

  if (["failed", "cancelled", "needs_changes"].includes(status)) return <div className="flex items-center gap-2">{error && <span role="alert" className="text-xs text-destructive">{error}</span>}<Button size="sm" variant="outline" loading={pending} onClick={() => action("retry")}><RotateCcwIcon />Retry</Button></div>;
  if (["completed", "merged"].includes(status)) return null;
  return <div className="flex items-center gap-2">{error && <span role="alert" className="text-xs text-destructive">{error}</span>}<Button size="sm" variant="destructive-outline" loading={pending} onClick={() => window.confirm("Stop this mission? Unpushed work will be preserved where possible.") && action("stop")}><SquareIcon />Stop</Button></div>;
}
