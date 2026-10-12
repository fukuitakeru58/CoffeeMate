import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getLocalIdentity } from "../lib/local-auth";

export type AuthUser = {
  userId: string;
  displayName: string;
};

export async function getAuthUser(): Promise<AuthUser | null> {
  const requestHeaders = await headers();
  const local = await getLocalIdentity(requestHeaders.get("cookie"));
  return local ? { userId: local.userId, displayName: local.username } : null;
}

export async function requireAuthUser(returnTo: string): Promise<AuthUser> {
  const user = await getAuthUser();
  if (user) return user;
  redirect(`/login?return_to=${encodeURIComponent(safeReturnPath(returnTo))}`);
}

function safeReturnPath(value: string): string {
  if (!value.startsWith("/") || value.startsWith("//")) return "/";
  try {
    const url = new URL(value, "https://app.local");
    if (url.origin !== "https://app.local" || ["/login", "/logout"].includes(url.pathname)) return "/";
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return "/";
  }
}
