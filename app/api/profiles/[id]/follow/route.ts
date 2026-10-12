import { and, eq, sql } from "drizzle-orm";
import { getChatGPTUser } from "../../../../chatgpt-auth";
import { getDb } from "../../../../../db";
import { follows, profiles } from "../../../../../db/schema";
import { getProfile } from "../../../../../lib/profiles";

type Context = { params: Promise<{ id: string }> };

async function check(context: Context) {
  const user = await getChatGPTUser();
  if (!user) return { error: Response.json({ error: "ログインが必要です" }, { status: 401 }) };
  if (!await getProfile(user.userId)) return { error: Response.json({ error: "先にマイページを作成してください" }, { status: 409 }) };
  const { id } = await context.params;
  if (id === user.userId) return { error: Response.json({ error: "自分はフォローできません" }, { status: 400 }) };
  const [target] = await getDb().select({ userId: profiles.userId }).from(profiles).where(eq(profiles.userId, id)).limit(1);
  if (!target) return { error: Response.json({ error: "マイページが見つかりません" }, { status: 404 }) };
  return { userId: user.userId, targetId: id };
}

async function result(targetId: string, active: boolean) {
  const [count] = await getDb().select({ count: sql<number>`count(*)` }).from(follows).where(eq(follows.followedUserId, targetId));
  return Response.json({ following: active, followerCount: count.count });
}

export async function PUT(_: Request, context: Context) {
  const state = await check(context);
  if (state.error) return state.error;
  await getDb().insert(follows).values({ followerUserId: state.userId!, followedUserId: state.targetId!, createdAt: new Date().toISOString() }).onConflictDoNothing();
  return result(state.targetId!, true);
}

export async function DELETE(_: Request, context: Context) {
  const state = await check(context);
  if (state.error) return state.error;
  await getDb().delete(follows).where(and(eq(follows.followerUserId, state.userId!), eq(follows.followedUserId, state.targetId!)));
  return result(state.targetId!, false);
}
