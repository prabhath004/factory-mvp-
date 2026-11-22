import { createProject, listProjects } from "@/lib/coforge/service";
import { factoryResponse, jsonBody, ownerEmail } from "@/lib/coforge/http";

export async function GET() {
  return factoryResponse(async () => listProjects(await ownerEmail()));
}

export async function POST(request: Request) {
  return factoryResponse(async () => createProject(await ownerEmail(), await jsonBody(request)), 201);
}
