import { missionEvents } from "@/lib/coforge/queries";
import { factoryResponse, ownerEmail } from "@/lib/coforge/http";

export async function GET(_request: Request, context: RouteContext<"/api/factory/missions/[id]/events">) {
  const { id } = await context.params;
  return factoryResponse(async () => missionEvents(await ownerEmail(), id));
}
