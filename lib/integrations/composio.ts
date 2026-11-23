import { randomUUID } from "node:crypto";
import { Composio } from "@composio/core";
import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { integrationConnections } from "@/db/schema";
import { CoforgeError } from "@/lib/coforge/service";

export const COMPOSIO_TOOLKITS = {
  slack: { label: "Slack", tools: ["SLACK_SEND_MESSAGE"] },
  jira: { label: "Jira", tools: ["JIRA_GET_ISSUE"] },
  notion: { label: "Notion", tools: ["NOTION_FETCH_DATA"] },
} as const;

export type ComposioToolkit = keyof typeof COMPOSIO_TOOLKITS;

const apiKey = () => process.env.COMPOSIO_API_KEY?.trim() || null;

const client = () => {
  const key = apiKey();
  if (!key) throw new CoforgeError("COMPOSIO_NOT_CONFIGURED", "Add COMPOSIO_API_KEY to enable external integrations.", 422);
  return new Composio({ apiKey: key, allowTracking: false, disableVersionCheck: true });
};

export function composioReadiness() {
  return {
    configured: apiKey() !== null,
    toolkits: Object.entries(COMPOSIO_TOOLKITS).map(([id, value]) => ({ id: id as ComposioToolkit, ...value })),
  };
}

export async function listComposioConnections(owner: string) {
  const rows = await db
    .select()
    .from(integrationConnections)
    .where(and(eq(integrationConnections.owner_id, owner), eq(integrationConnections.provider, "composio")))
    .orderBy(asc(integrationConnections.toolkit), asc(integrationConnections.created_at));
  if (!apiKey()) return rows;
  const composio = client();
  return Promise.all(rows.map(async (row) => {
    try {
      const account = await composio.connectedAccounts.get(row.connection_ref);
      const status = String(account.status).toLowerCase();
      if (status !== row.status) {
        await db.update(integrationConnections).set({ status, updated_at: new Date() }).where(eq(integrationConnections.id, row.id));
      }
      return { ...row, status };
    } catch {
      return row;
    }
  }));
}

export async function beginComposioConnection(owner: string, toolkit: unknown, callbackUrl: string) {
  if (typeof toolkit !== "string" || !(toolkit in COMPOSIO_TOOLKITS)) {
    throw new CoforgeError("INTEGRATION_NOT_ALLOWED", "Choose an integration allowed by Factory policy.", 422);
  }
  const allowed = COMPOSIO_TOOLKITS[toolkit as ComposioToolkit];
  const composio = client();
  const session = await composio.sessions.create(owner, {
    toolkits: { enable: [toolkit] },
    tools: { [toolkit]: { enable: [...allowed.tools] } },
    manageConnections: { enable: false },
    workbench: { enable: false },
    proxyExecute: false,
  });
  const request = await session.authorize(toolkit, { callbackUrl });
  if (!request.redirectUrl) throw new CoforgeError("COMPOSIO_AUTH_FAILED", "Composio did not return an authorization URL.", 422);
  const now = new Date();
  await db.insert(integrationConnections).values({
    id: randomUUID(),
    owner_id: owner,
    provider: "composio",
    toolkit,
    connection_ref: request.id,
    status: String(request.status ?? "initiated").toLowerCase(),
    scopes_metadata: { tools: [...allowed.tools] },
    created_at: now,
    updated_at: now,
  }).onConflictDoUpdate({
    target: [integrationConnections.owner_id, integrationConnections.provider, integrationConnections.connection_ref],
    set: { status: "initiated", scopes_metadata: { tools: [...allowed.tools] }, updated_at: now },
  });
  return { redirectUrl: request.redirectUrl };
}
