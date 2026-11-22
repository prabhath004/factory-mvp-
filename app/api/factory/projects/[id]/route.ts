import { getProject } from "@/lib/coforge/service";
import { factoryResponse, ownerEmail } from "@/lib/coforge/http";

export async function GET(_request: Request, context: RouteContext<"/api/factory/projects/[id]">) {
  const { id } = await context.params;
  return factoryResponse(async () => getProject(await ownerEmail(), id));
}
