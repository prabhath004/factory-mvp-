import { missionVerification } from "@/lib/coforge/queries";
import { factoryResponse, ownerEmail } from "@/lib/coforge/http";

export async function GET(_request: Request, context: RouteContext<"/api/factory/missions/[id]/verification">) {
  const { id } = await context.params;
  return factoryResponse(async () => missionVerification(await ownerEmail(), id));
}
