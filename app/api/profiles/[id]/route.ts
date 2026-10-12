import { and, eq, sql } from "drizzle-orm";
import { getAuthUser } from "../../../auth";
import { getDb } from "../../../../db";
import { follows, profiles, recipes } from "../../../../db/schema";

export async function GET(_: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const user = await getAuthUser();
  const db = getDb();
  const [profile] = await db.select({ userId: profiles.userId, displayName: profiles.displayName, bio: profiles.bio, createdAt: profiles.createdAt }).from(profiles).where(eq(profiles.userId, id)).limit(1);
  if (!profile) return Response.json({ error: "マイページが見つかりません" }, { status: 404 });
  const [followers] = await db.select({ count: sql<number>`count(*)` }).from(follows).where(eq(follows.followedUserId, id));
  const [following] = await db.select({ count: sql<number>`count(*)` }).from(follows).where(eq(follows.followerUserId, id));
  const [publicRecipes] = await db.select({ count: sql<number>`count(*)` }).from(recipes).where(and(eq(recipes.userId, id), eq(recipes.visibility, "public"), eq(recipes.moderationStatus, "visible")));
  const isFollowing = user && user.userId !== id ? (await db.select({ id: follows.followedUserId }).from(follows).where(and(eq(follows.followerUserId, user.userId), eq(follows.followedUserId, id))).limit(1)).length > 0 : false;
  return Response.json({ profile: { ...profile, followerCount: followers.count, followingCount: following.count, publicRecipeCount: publicRecipes.count, isFollowing, isOwn: user?.userId === id } });
}
