import { redirect } from "next/navigation";
import { getAuthUser } from "../auth";

export const dynamic = "force-dynamic";

export default async function MyPage() {
  const user = await getAuthUser();
  if (!user) redirect("/login?return_to=%2Fme");
  redirect(`/users/${encodeURIComponent(user.userId)}`);
}
