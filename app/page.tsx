import { getChatGPTUser } from "./chatgpt-auth";
import CoffeeApp from "./coffee-app";

export const dynamic = "force-dynamic";

export default async function Home() {
  const user = await getChatGPTUser();
  return <CoffeeApp user={user ? { id: user.userId, name: user.displayName } : null} />;
}
