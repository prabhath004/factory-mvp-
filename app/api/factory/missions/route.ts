import { createMission, listMissions } from "@/lib/coforge/service";
import { factoryResponse, jsonBody, ownerEmail } from "@/lib/coforge/http";
import { missionStatusSchema } from "@/lib/coforge/contracts";
import { z } from "zod";

export async function GET(request: Request) {
  return factoryResponse(async () => {
    const url = new URL(request.url);
    const rawStatus = url.searchParams.get("status");
    const rawProject = url.searchParams.get("projectId");
    const status = rawStatus ? missionStatusSchema.parse(rawStatus) : undefined;
    const projectId = rawProject ? z.uuid().parse(rawProject) : undefined;
    return listMissions(await ownerEmail(), {
      status,
      projectId,
    });
  });
}

export async function POST(request: Request) {
  return factoryResponse(
    async () => createMission(await ownerEmail(), request.headers.get("idempotency-key") ?? "", await jsonBody(request)),
    201,
  );
}
