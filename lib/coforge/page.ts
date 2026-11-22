import { auth } from "@/lib/auth/server";
import { isOwner } from "@/lib/auth/owner";
import { redirect } from "next/navigation";
import { developmentOwner } from "@/lib/auth/development-owner";

export async function pageOwnerEmail() {
  const localOwner = developmentOwner();
  if (localOwner) return localOwner;
  const user = (await auth.getSession()).data?.user;
  if (!user) redirect("/auth/sign-in");
  if (!isOwner(user)) redirect("/auth/forbidden");
  return user.email;
}
