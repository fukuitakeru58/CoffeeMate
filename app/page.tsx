import { getAuthUser } from "./auth";
import CoffeeApp from "./coffee-app";
import { getProfile } from "../lib/profiles";

export const dynamic = "force-dynamic";

export default async function Home() {
  const user = await getAuthUser();
  const profile = user ? await getProfile(user.userId) : null;
  return <CoffeeApp user={user ? { id: user.userId, name: profile?.displayName ?? user.displayName } : null} />;
}
