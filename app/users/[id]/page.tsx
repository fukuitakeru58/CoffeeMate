import { notFound, redirect } from "next/navigation";
import { getChatGPTUser } from "../../chatgpt-auth";
import { getProfile } from "../../../lib/profiles";
import ProfileView from "../profile-view";

export const dynamic = "force-dynamic";

export default async function UserPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getChatGPTUser();
  if (user && !await getProfile(user.userId)) redirect(`/onboarding?return_to=${encodeURIComponent(`/users/${id}`)}`);
  const profile = await getProfile(id);
  if (!profile) notFound();
  return <ProfileView profileId={id} initialName={profile.displayName} initialBio={profile.bio} currentUserId={user?.userId ?? null} />;
}
