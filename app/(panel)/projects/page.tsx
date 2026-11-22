import { FolderGit2Icon } from "lucide-react";
import { ProjectForm } from "@/components/factory/project-form";
import { PanelHeader } from "@/components/panel/panel-header";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { db } from "@/db/client";
import { pageOwnerEmail } from "@/lib/coforge/page";
import { listProjects } from "@/lib/coforge/service";
import { readRegistry } from "@/lib/repositories";

export default async function ProjectsPage() {
  const owner = await pageOwnerEmail();
  const [projects, registry] = await Promise.all([listProjects(owner), readRegistry(db)]);
  const repositories = registry.filter((repo) => repo.enabled).map(({ repo, display_name }) => ({ repo, display_name }));
  return (
    <>
      <PanelHeader title="Projects" />
      <section className="min-h-0 flex-1 overflow-y-auto">
        <ProjectForm repositories={repositories} />
        {projects.length === 0 ? (
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon"><FolderGit2Icon /></EmptyMedia>
              <EmptyTitle>No Coforge projects</EmptyTitle>
              <EmptyDescription>Projects bind missions to an enabled, trusted GitHub repository. Local paths are never accepted from the browser.</EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <ul className="divide-y">
            {projects.map((project) => (
              <li key={project.id} className="grid gap-1 px-5 py-4 sm:grid-cols-[1fr_auto] sm:items-center">
                <div><p className="font-medium">{project.name}</p><p className="font-mono text-xs text-muted-foreground">{project.repo_url}</p></div>
                <p className="text-xs text-muted-foreground">Default branch: <span className="font-mono">{project.repo_default_branch}</span></p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
