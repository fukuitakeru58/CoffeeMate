import { and, eq } from "drizzle-orm";
import { getAuthUser } from "../../../../auth";
import { getDb } from "../../../../../db";
import { bookmarks, likes, recipes } from "../../../../../db/schema";
import { getProfile } from "../../../../../lib/profiles";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getAuthUser();
  if (!user) return Response.json({ error: "ログインが必要です" }, { status: 401 });
  if (!await getProfile(user.userId)) return Response.json({ error: "先にマイページを作成してください" }, { status: 409 });
  const { id } = await context.params;
  const type = ((await request.json()) as { type?: unknown }).type;
  if (type !== "like" && type !== "bookmark") return Response.json({ error: "操作を確認してください" }, { status: 400 });
  const db = getDb();
  const [recipe] = await db.select({ visibility: recipes.visibility, userId: recipes.userId }).from(recipes).where(eq(recipes.id, id));
  if (!recipe || (recipe.visibility !== "public" && recipe.userId !== user.userId)) return Response.json({ error: "レシピが見つかりません" }, { status: 404 });
  const table = type === "like" ? likes : bookmarks;
  const where = and(eq(table.recipeId, id), eq(table.userId, user.userId));
  const exists = (await db.select().from(table).where(where).limit(1)).length > 0;
  if (exists) await db.delete(table).where(where);
  else await db.insert(table).values({ recipeId: id, userId: user.userId });
  return Response.json({ active: !exists });
}
