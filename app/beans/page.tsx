import { requireChatGPTUser } from "../chatgpt-auth";
import BeanLibrary from "./bean-library";
import { redirect } from "next/navigation";
import { getProfile } from "../../lib/profiles";

export const dynamic = "force-dynamic";

export default async function BeansPage() {
  const user = await requireChatGPTUser("/beans");
  if (!await getProfile(user.userId)) redirect(`/onboarding?return_to=${encodeURIComponent("/beans")}`);
  return <BeanLibrary initialId={null} userId={user.userId} />;
}
