import { and, eq } from "drizzle-orm";
import { getChatGPTUser } from "../../../../chatgpt-auth";
import { getDb } from "../../../../../db";
import { bookmarks, likes, recipes } from "../../../../../db/schema";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: "ログインが必要です" }, { status: 401 });
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
