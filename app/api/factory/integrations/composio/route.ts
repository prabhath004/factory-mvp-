import { factoryResponse, jsonBody, ownerEmail } from "@/lib/coforge/http";
import { beginComposioConnection, composioReadiness, listComposioConnections } from "@/lib/integrations/composio";

export async function GET() {
  return factoryResponse(async () => {
    const owner = await ownerEmail();
    return { ...composioReadiness(), connections: await listComposioConnections(owner) };
  });
}

export async function POST(request: Request) {
  return factoryResponse(async () => {
    const body = await jsonBody(request) as { toolkit?: unknown };
    const origin = new URL(request.url).origin;
    return beginComposioConnection(await ownerEmail(), body.toolkit, `${origin}/settings?composio=connected`);
  }, 201);
}
