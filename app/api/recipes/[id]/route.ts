import { and, eq, sql } from "drizzle-orm";
import { getChatGPTUser } from "../../../chatgpt-auth";
import { getDb } from "../../../../db";
import { bookmarks, comments, likes, ratings, recipes } from "../../../../db/schema";
import { parseRecipe } from "../../../../lib/recipes";

type Context = { params: Promise<{ id: string }> };

export async function GET(_: Request, context: Context) {
  const { id } = await context.params;
  const user = await getChatGPTUser();
  const db = getDb();
  const [recipe] = await db.select().from(recipes).where(eq(recipes.id, id)).limit(1);
  if (!recipe || (recipe.visibility !== "public" && recipe.userId !== user?.userId)) return Response.json({ error: "レシピが見つかりません" }, { status: 404 });
  const thread = await db.select().from(comments).where(eq(comments.recipeId, id)).orderBy(comments.createdAt);
  const [likeCount] = await db.select({ count: sql<number>`count(*)` }).from(likes).where(eq(likes.recipeId, id));
  const [ratingSummary] = await db.select({ count: sql<number>`count(*)`, average: sql<number | null>`avg(${ratings.score})` }).from(ratings).where(eq(ratings.recipeId, id));
  const ownRating = user ? await db.select({ score: ratings.score }).from(ratings).where(and(eq(ratings.recipeId, id), eq(ratings.userId, user.userId))) : [];
  const liked = user ? (await db.select().from(likes).where(and(eq(likes.recipeId, id), eq(likes.userId, user.userId)))).length > 0 : false;
  const saved = user ? (await db.select().from(bookmarks).where(and(eq(bookmarks.recipeId, id), eq(bookmarks.userId, user.userId)))).length > 0 : false;
  return Response.json({ recipe: { ...recipe, steps: JSON.parse(recipe.steps), likeCount: likeCount.count, commentCount: thread.length, ratingCount: ratingSummary.count, averageRating: ratingSummary.average, userRating: ownRating[0]?.score ?? null, liked, saved }, comments: thread });
}

export async function PATCH(request: Request, context: Context) {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: "ログインが必要です" }, { status: 401 });
  const { id } = await context.params;
  let data;
  try { data = parseRecipe(await request.json()); } catch { return Response.json({ error: "入力を確認してください" }, { status: 400 }); }
  if (!data) return Response.json({ error: "タイトルと豆の名前を入力してください" }, { status: 400 });
  const db = getDb();
  const result = await db.update(recipes).set({ ...data, steps: JSON.stringify(data.steps), updatedAt: new Date().toISOString() }).where(and(eq(recipes.id, id), eq(recipes.userId, user.userId))).returning({ id: recipes.id });
  if (!result.length) return Response.json({ error: "編集できません" }, { status: 404 });
  return Response.json({ id });
}

export async function DELETE(_: Request, context: Context) {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: "ログインが必要です" }, { status: 401 });
  const { id } = await context.params;
  const result = await getDb().delete(recipes).where(and(eq(recipes.id, id), eq(recipes.userId, user.userId))).returning({ id: recipes.id });
  if (!result.length) return Response.json({ error: "削除できません" }, { status: 404 });
  return Response.json({ ok: true });
}
