import { CircleAlertIcon, CircleCheckIcon, CircleDashedIcon, CirclePauseIcon, GitPullRequestIcon, LoaderCircleIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { MissionStatus } from "@/lib/coforge/contracts";

const statusMeta: Record<MissionStatus, { label: string; variant: "secondary" | "info" | "warning" | "success" | "error" | "outline"; icon: typeof CircleDashedIcon }> = {
  draft: { label: "Draft", variant: "secondary", icon: CircleDashedIcon },
  planning: { label: "Planning", variant: "info", icon: LoaderCircleIcon },
  awaiting_approval: { label: "Approval", variant: "warning", icon: CirclePauseIcon },
  queued: { label: "Queued", variant: "secondary", icon: CircleDashedIcon },
  running: { label: "Running", variant: "info", icon: LoaderCircleIcon },
  waiting_for_user: { label: "Needs answer", variant: "warning", icon: CirclePauseIcon },
  verifying: { label: "Verifying", variant: "info", icon: LoaderCircleIcon },
  pr_open: { label: "PR open", variant: "info", icon: GitPullRequestIcon },
  reviewing: { label: "Reviewing", variant: "info", icon: GitPullRequestIcon },
  merge_ready: { label: "Merge ready", variant: "success", icon: CircleCheckIcon },
  needs_changes: { label: "Needs changes", variant: "warning", icon: CircleAlertIcon },
  completed: { label: "Delivered", variant: "success", icon: CircleCheckIcon },
  merged: { label: "Merged", variant: "success", icon: CircleCheckIcon },
  failed: { label: "Failed", variant: "error", icon: CircleAlertIcon },
  cancelled: { label: "Cancelled", variant: "outline", icon: CircleAlertIcon },
};

export function MissionStatusBadge({ status }: { status: MissionStatus }) {
  const meta = statusMeta[status];
  const Icon = meta.icon;
  return (
    <Badge variant={meta.variant}>
      <Icon aria-hidden="true" className={status === "running" || status === "planning" || status === "verifying" ? "animate-spin" : undefined} />
      {meta.label}
    </Badge>
  );
}
