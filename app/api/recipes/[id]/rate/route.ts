import { eq } from "drizzle-orm";
import { getChatGPTUser } from "../../../../chatgpt-auth";
import { getDb } from "../../../../../db";
import { ratings, recipes } from "../../../../../db/schema";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: "ログインが必要です" }, { status: 401 });
  const { id } = await context.params;
  let score: number;
  try { score = Number(((await request.json()) as { score?: unknown }).score); }
  catch { return Response.json({ error: "評価を確認してください" }, { status: 400 }); }
  if (!Number.isInteger(score) || score < 1 || score > 5) return Response.json({ error: "1〜5で評価してください" }, { status: 400 });
  const db = getDb();
  const [recipe] = await db.select({ visibility: recipes.visibility }).from(recipes).where(eq(recipes.id, id));
  if (!recipe || recipe.visibility !== "public") return Response.json({ error: "公開レシピのみ評価できます" }, { status: 404 });
  await db.insert(ratings).values({ recipeId: id, userId: user.userId, score }).onConflictDoUpdate({ target: [ratings.recipeId, ratings.userId], set: { score } });
  return Response.json({ score });
}
