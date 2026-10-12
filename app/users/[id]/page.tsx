import { notFound } from "next/navigation";
import { getAuthUser } from "../../auth";
import { getProfile } from "../../../lib/profiles";
import { getLocalUsername } from "../../../lib/local-auth";
import ProfileView from "../profile-view";

export const dynamic = "force-dynamic";

export default async function UserPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getAuthUser();
  const profile = await getProfile(id);
  if (!profile) notFound();
  const accountName = await getLocalUsername(id);
  return <ProfileView profileId={id} initialName={profile.displayName} initialBio={profile.bio} accountName={accountName} currentUserId={user?.userId ?? null} />;
}
