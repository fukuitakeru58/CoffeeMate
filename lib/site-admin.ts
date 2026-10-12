import { env } from "cloudflare:workers";
import { headers } from "next/headers";

export type SiteAdmin = { userId: string; email: string };

export async function getSiteAdmin(): Promise<SiteAdmin | null> {
  const requestHeaders = await headers();
  const userId = requestHeaders.get("oai-authenticated-user-id");
  const email = requestHeaders.get("oai-authenticated-user-email");
  const configuredEmail = (env as unknown as { SITE_ADMIN_EMAIL?: string }).SITE_ADMIN_EMAIL;
  if (!userId || !email || !configuredEmail || email.toLowerCase() !== configuredEmail.toLowerCase()) return null;
  return { userId, email };
}

export const ADMIN_SIGN_IN_PATH = "/signin-with-chatgpt?return_to=%2Fadmin";
