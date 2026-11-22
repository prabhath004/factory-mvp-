import { missionUsage } from "@/lib/coforge/queries";
import { factoryResponse, ownerEmail } from "@/lib/coforge/http";

export async function GET(_request: Request, context: RouteContext<"/api/factory/missions/[id]/usage">) {
  const { id } = await context.params;
  return factoryResponse(async () => missionUsage(await ownerEmail(), id));
}
