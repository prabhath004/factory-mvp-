import { requestMissionStop } from "@/lib/coforge/service";
import { factoryResponse, ownerEmail } from "@/lib/coforge/http";

export async function POST(_request: Request, context: RouteContext<"/api/factory/missions/[id]/stop">) {
  const { id } = await context.params;
  return factoryResponse(async () => requestMissionStop(await ownerEmail(), id));
}
