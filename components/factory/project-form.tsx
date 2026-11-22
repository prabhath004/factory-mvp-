"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Repository = { repo: string; display_name: string | null };

export function ProjectForm({ repositories }: { repositories: Repository[] }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    setPending(true);
    setError(null);
    const data = new FormData(form);
    const response = await fetch("/api/factory/projects", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: data.get("name"), repo: data.get("repo"), mode: "brownfield", defaultBranch: "main" }),
    });
    const result = (await response.json()) as { error?: { message?: string } };
    setPending(false);
    if (!response.ok) return setError(result.error?.message ?? "Could not save the project.");
    form.reset();
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="grid gap-4 border-b p-5 md:grid-cols-[minmax(12rem,1fr)_minmax(16rem,1.4fr)_auto] md:items-end">
      <div className="grid gap-1.5">
        <Label htmlFor="project-name">Project name</Label>
        <Input id="project-name" name="name" required maxLength={80} placeholder="Claims application" />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="project-repo">Enabled repository</Label>
        <select id="project-repo" name="repo" required className="h-8 rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <option value="">Select repository</option>
          {repositories.map((repository) => <option key={repository.repo} value={repository.repo}>{repository.display_name ?? repository.repo}</option>)}
        </select>
      </div>
      <Button type="submit" loading={pending} disabled={repositories.length === 0}>Add project</Button>
      {error && <p role="alert" className="text-sm text-destructive md:col-span-3">{error}</p>}
      {repositories.length === 0 && <p className="text-sm text-muted-foreground md:col-span-3">Enable a repository under Repository setup before creating a Coforge project.</p>}
    </form>
  );
}
