import { planMission, updateMissionPlan } from "@/lib/coforge/service";
import { factoryResponse, jsonBody, ownerEmail } from "@/lib/coforge/http";

export async function POST(_request: Request, context: RouteContext<"/api/factory/missions/[id]/plan">) {
  const { id } = await context.params;
  return factoryResponse(async () => planMission(await ownerEmail(), id));
}

export async function PATCH(request: Request, context: RouteContext<"/api/factory/missions/[id]/plan">) {
  const { id } = await context.params;
  return factoryResponse(async () => updateMissionPlan(await ownerEmail(), id, await jsonBody(request)));
}
