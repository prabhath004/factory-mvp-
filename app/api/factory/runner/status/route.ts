import { runnerStatus } from "@/lib/coforge/queries";
import { factoryResponse, ownerEmail } from "@/lib/coforge/http";

export async function GET() {
  return factoryResponse(async () => (await ownerEmail(), runnerStatus()));
}
