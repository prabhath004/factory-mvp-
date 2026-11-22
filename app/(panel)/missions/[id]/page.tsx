import { notFound } from "next/navigation";
import { MissionActions } from "@/components/factory/mission-actions";
import { MissionWorkspace, MISSION_TABS, type MissionTab } from "@/components/factory/mission-workspace";
import { PlanReview } from "@/components/factory/plan-review";
import { MissionStatusBadge } from "@/components/factory/status-badge";
import { PanelHeader } from "@/components/panel/panel-header";
import { pageOwnerEmail } from "@/lib/coforge/page";
import { missionEvents, missionExecution, missionUsage, missionVerification, runnerStatus } from "@/lib/coforge/queries";
import { CoforgeError } from "@/lib/coforge/service";

export default async function MissionPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ tab?: string }> }) {
  const [{ id }, query, owner] = await Promise.all([params, searchParams, pageOwnerEmail()]);
  let execution;
  try { execution = await missionExecution(owner, id); }
  catch (error) { if (error instanceof CoforgeError && error.status === 404) notFound(); throw error; }
  const tab: MissionTab = MISSION_TABS.includes(query.tab as MissionTab) ? query.tab as MissionTab : "activity";
  const [events, verification, usage, runners] = await Promise.all([
    missionEvents(owner, id),
    missionVerification(owner, id),
    missionUsage(owner, id),
    runnerStatus(),
  ]);
  const question = execution.job?.question ?? execution.sessions.find((session) => session.question)?.question;
  const waiting = execution.mission.status === "waiting_for_user";
  return <>
    <PanelHeader title={`${execution.mission.key} · ${execution.mission.goal}`} actions={<div className="flex items-center gap-2"><MissionStatusBadge status={execution.mission.status} />{!waiting && <MissionActions missionId={id} status={execution.mission.status} question={question} />}</div>} />
    {waiting && <MissionActions missionId={id} status={execution.mission.status} question={question} />}
    {execution.mission.status === "awaiting_approval" && execution.mission.plan_json
      ? <PlanReview missionId={id} version={execution.mission.plan_version} initialPlan={execution.mission.plan_json} />
      : <MissionWorkspace execution={execution} events={events} verification={verification} usage={usage} runners={runners} tab={tab} />}
  </>;
}
