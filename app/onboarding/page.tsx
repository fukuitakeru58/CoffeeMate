import { redirect } from "next/navigation";
import { requireChatGPTUser } from "../chatgpt-auth";
import { getProfile } from "../../lib/profiles";
import OnboardingForm from "./onboarding-form";

export const dynamic = "force-dynamic";

function safeReturnTo(value: string | undefined, userId: string) {
  const fallback = `/users/${encodeURIComponent(userId)}`;
  if (!value || !value.startsWith("/") || value.startsWith("//")) return fallback;
  try {
    const url = new URL(value, "https://coffeemate.local");
    return url.origin === "https://coffeemate.local" && url.pathname !== "/onboarding" ? `${url.pathname}${url.search}` : fallback;
  } catch { return fallback; }
}

export default async function OnboardingPage({ searchParams }: { searchParams: Promise<{ return_to?: string }> }) {
  const user = await requireChatGPTUser("/onboarding");
  const profile = await getProfile(user.userId);
  if (profile) redirect(`/users/${encodeURIComponent(user.userId)}`);
  const { return_to: returnTo } = await searchParams;
  return <OnboardingForm defaultName={user.displayName} returnTo={safeReturnTo(returnTo, user.userId)} />;
}
