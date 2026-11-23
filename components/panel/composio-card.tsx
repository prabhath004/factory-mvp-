"use client";

import { ExternalLinkIcon, PlugZapIcon } from "lucide-react";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import type { ComposioToolkit } from "@/lib/integrations/composio";
import { SettingsSection } from "./settings-section";

type Toolkit = { id: ComposioToolkit; label: string; tools: readonly string[] };
type Connection = { id: string; toolkit: string; status: string; scopes_metadata: { tools: string[] } };

export function ComposioCard({ configured, toolkits, connections }: { configured: boolean; toolkits: Toolkit[]; connections: Connection[] }) {
  const [pending, startTransition] = useTransition();
  const [failure, setFailure] = useState<string | null>(null);

  const connect = (toolkit: ComposioToolkit) => {
    setFailure(null);
    startTransition(async () => {
      const response = await fetch("/api/factory/integrations/composio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ toolkit }),
      });
      const payload = await response.json() as { data?: { redirectUrl?: string }; error?: { message?: string } };
      if (!response.ok || !payload.data?.redirectUrl) {
        setFailure(payload.error?.message ?? "The connection could not be started.");
        return;
      }
      window.location.assign(payload.data.redirectUrl);
    });
  };

  return <SettingsSection
    id="integrations"
    title="Agent integrations"
    description="Optional user-scoped tools for mission context and notifications. Composio holds credentials; Factory stores only connection references and an explicit tool allowlist."
  >
    <div className="grid gap-3 md:grid-cols-3">
      {toolkits.map((toolkit) => {
        const connected = connections.find((connection) => connection.toolkit === toolkit.id && connection.status === "active");
        return <Card key={toolkit.id}>
          <CardContent className="flex h-full flex-col gap-3">
            <div className="flex items-center gap-2"><PlugZapIcon className="size-4" /><h3 className="font-medium">{toolkit.label}</h3></div>
            <p className="text-xs text-muted-foreground">Allowed: {toolkit.tools.join(", ")}</p>
            <div className="mt-auto flex items-center justify-between gap-3">
              <span className="text-xs capitalize text-muted-foreground">{connected ? "Connected" : configured ? "Not connected" : "API key required"}</span>
              <Button size="sm" variant="outline" disabled={!configured || pending || Boolean(connected)} onClick={() => connect(toolkit.id)}>
                {pending ? <Spinner data-icon="inline-start" /> : <ExternalLinkIcon data-icon="inline-start" />}
                {connected ? "Connected" : "Connect"}
              </Button>
            </div>
          </CardContent>
        </Card>;
      })}
    </div>
    {!configured && <p className="mt-3 text-sm text-muted-foreground">Set <code>COMPOSIO_API_KEY</code> in <code>.env.local</code>, restart the panel, then connect only the apps this Factory needs.</p>}
    {failure && <p role="alert" className="mt-3 text-sm text-destructive">{failure}</p>}
  </SettingsSection>;
}
