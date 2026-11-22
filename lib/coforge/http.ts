import { auth } from "@/lib/auth/server";
import { isOwner } from "@/lib/auth/owner";
import { CoforgeError } from "./service";
import { ZodError } from "zod";
import { developmentOwner } from "@/lib/auth/development-owner";

export const apiError = (code: string, message: string, status: number, details?: unknown) =>
  Response.json({ error: { code, message, ...(details === undefined ? {} : { details }) } }, { status });

export async function ownerEmail() {
  const localOwner = developmentOwner();
  if (localOwner) return localOwner;
  const user = (await auth.getSession()).data?.user;
  if (!user) throw new ApiAuthError("AUTHENTICATION_REQUIRED", "Sign in to use Factory APIs.", 401);
  if (!isOwner(user)) throw new ApiAuthError("OWNER_REQUIRED", "Only the factory owner can use Factory APIs.", 403);
  return user.email;
}

class ApiAuthError extends Error {
  constructor(readonly code: string, message: string, readonly status: 401 | 403) {
    super(message);
  }
}

export async function jsonBody(request: Request): Promise<unknown> {
  const contentType = request.headers.get("content-type")?.split(";", 1)[0]?.trim();
  if (contentType !== "application/json") throw new CoforgeError("JSON_REQUIRED", "Send an application/json request body.", 400);
  try {
    return await request.json();
  } catch {
    throw new CoforgeError("INVALID_JSON", "The request body is not valid JSON.", 400);
  }
}

export async function factoryResponse(work: () => Promise<unknown>, successStatus = 200) {
  try {
    return Response.json({ data: await work() }, { status: successStatus, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof ApiAuthError || error instanceof CoforgeError) return apiError(error.code, error.message, error.status, error instanceof CoforgeError ? error.details : undefined);
    if (error instanceof ZodError) return apiError("VALIDATION_ERROR", "The request parameters are invalid.", 422, error.flatten());
    console.error("Factory API failed", error);
    return apiError("INTERNAL_ERROR", "The Factory request could not be completed.", 500);
  }
}
