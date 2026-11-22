import { PlusIcon } from "lucide-react";
import Link from "next/link";
import { MissionList } from "@/components/factory/mission-list";
import { PanelHeader } from "@/components/panel/panel-header";
import { Button } from "@/components/ui/button";
import { pageOwnerEmail } from "@/lib/coforge/page";
import { listMissions } from "@/lib/coforge/service";

export default async function MissionsPage() {
  const missions = await listMissions(await pageOwnerEmail());
  return (
    <>
      <PanelHeader title="Missions" actions={<Button size="sm" render={<Link href="/missions/new" />}><PlusIcon />New mission</Button>} />
      <section className="flex min-h-0 flex-1 flex-col overflow-y-auto">
        <div className="border-b px-5 py-4">
          <p className="max-w-2xl text-sm text-muted-foreground">Approved software goals running through one local agent, branch, and delivery pull request.</p>
        </div>
        <MissionList missions={missions} />
      </section>
    </>
  );
}
