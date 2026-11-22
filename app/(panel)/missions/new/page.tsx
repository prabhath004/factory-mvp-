import { ArrowLeftIcon } from "lucide-react";
import Link from "next/link";
import { NewMissionForm } from "@/components/factory/new-mission-form";
import { PanelHeader } from "@/components/panel/panel-header";
import { Button } from "@/components/ui/button";
import { pageOwnerEmail } from "@/lib/coforge/page";
import { providers } from "@/lib/coforge/queries";
import { listProjects } from "@/lib/coforge/service";

export default async function NewMissionPage() {
  const owner = await pageOwnerEmail();
  const [projects, providerState] = await Promise.all([listProjects(owner), providers()]);
  return (
    <>
      <PanelHeader title="New mission" actions={<Button size="sm" variant="ghost" render={<Link href="/missions" />}><ArrowLeftIcon />Missions</Button>} />
      <section className="min-h-0 flex-1 overflow-y-auto p-5 md:p-8">
        <div className="mb-7 max-w-3xl"><h2 className="text-2xl font-semibold tracking-tight">Describe the outcome</h2><p className="mt-1 text-sm text-muted-foreground">Coforge will propose a bounded checklist for review before the runner can claim any work.</p></div>
        <NewMissionForm projects={projects.map(({ id, name, repo_url }) => ({ id, name, repo_url }))} harnesses={providerState.providers} providersReported={providerState.reported} />
      </section>
    </>
  );
}
