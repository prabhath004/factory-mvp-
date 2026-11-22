import { approveMission } from "@/lib/coforge/service";
import { factoryResponse, jsonBody, ownerEmail } from "@/lib/coforge/http";

export async function POST(request: Request, context: RouteContext<"/api/factory/missions/[id]/approve">) {
  const { id } = await context.params;
  return factoryResponse(async () => {
    const body = (await jsonBody(request)) as { planVersion?: unknown };
    return approveMission(await ownerEmail(), id, body?.planVersion);
  });
}
