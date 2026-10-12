import { getChatGPTUser } from "./chatgpt-auth";
import { redirect } from "next/navigation";
import CoffeeApp from "./coffee-app";
import { getProfile } from "../lib/profiles";

export const dynamic = "force-dynamic";

export default async function Home() {
  const user = await getChatGPTUser();
  const profile = user ? await getProfile(user.userId) : null;
  if (user && !profile) redirect(`/onboarding?return_to=${encodeURIComponent(`/users/${user.userId}`)}`);
  return <CoffeeApp user={user ? { id: user.userId, name: profile!.displayName } : null} />;
}
