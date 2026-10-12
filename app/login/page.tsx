import { getPlatformUser } from "../chatgpt-auth";
import { getProfile } from "../../lib/profiles";
import LoginForm from "./login-form";

export const dynamic = "force-dynamic";

function safeReturnTo(value?: string) {
  if (!value?.startsWith("/") || value.startsWith("//")) return "/";
  try {
    const url = new URL(value, "https://coffeemate.local");
    if (url.origin !== "https://coffeemate.local" || ["/login", "/logout", "/onboarding"].includes(url.pathname)) return "/";
    return `${url.pathname}${url.search}${url.hash}`;
  } catch { return "/"; }
}

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ return_to?: string }> }) {
  const platform = await getPlatformUser();
  const profile = platform ? await getProfile(platform.userId) : null;
  const { return_to: returnTo } = await searchParams;
  return <LoginForm returnTo={safeReturnTo(returnTo)} linkedName={profile?.displayName ?? null} />;
}
