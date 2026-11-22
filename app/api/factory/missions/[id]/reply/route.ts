import { replyToMission } from "@/lib/coforge/service";
import { factoryResponse, jsonBody, ownerEmail } from "@/lib/coforge/http";

export async function POST(request: Request, context: RouteContext<"/api/factory/missions/[id]/reply">) {
  const { id } = await context.params;
  return factoryResponse(async () => replyToMission(await ownerEmail(), id, await jsonBody(request)));
}
