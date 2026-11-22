import { createNeonAuth } from "@neondatabase/auth/next/server";
import { cache } from "react";
import { isOwner } from "./owner";
import { developmentOwnerUser } from "./development-owner";

export const auth = createNeonAuth({
  baseUrl: process.env.NEON_AUTH_BASE_URL!,
  cookies: { secret: process.env.NEON_AUTH_COOKIE_SECRET! },
});

/** The authenticated user, including the explicit development-only owner used by local setup. */
export async function currentUser() {
  const localOwner = developmentOwnerUser();
  if (localOwner) return localOwner;
  return (await auth.getSession()).data?.user;
}

export const assertOwner = cache(async () => {
  if (!isOwner(await currentUser())) throw new Error("an owner session is required");
});
