import { auth } from "@/lib/auth/server";
import { isOwner } from "@/lib/auth/owner";
import { redirect } from "next/navigation";

export async function pageOwnerEmail() {
  const user = (await auth.getSession()).data?.user;
  if (!user) redirect("/auth/sign-in");
  if (!isOwner(user)) redirect("/auth/forbidden");
  return user.email;
}
