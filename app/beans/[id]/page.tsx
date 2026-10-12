import { requireChatGPTUser } from "../../chatgpt-auth";
import BeanLibrary from "../bean-library";
import { redirect } from "next/navigation";
import { getProfile } from "../../../lib/profiles";

export const dynamic = "force-dynamic";

export default async function BeanPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireChatGPTUser(`/beans/${id}`);
  if (!await getProfile(user.userId)) redirect(`/onboarding?return_to=${encodeURIComponent(`/beans/${id}`)}`);
  return <BeanLibrary initialId={id} userId={user.userId} />;
}
