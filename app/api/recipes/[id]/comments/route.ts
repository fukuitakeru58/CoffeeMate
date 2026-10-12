import { eq } from "drizzle-orm";
import { getAuthUser } from "../../../../auth";
import { getDb } from "../../../../../db";
import { comments, recipes } from "../../../../../db/schema";
import { getProfile } from "../../../../../lib/profiles";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getAuthUser();
  if (!user) return Response.json({ error: "ログインが必要です" }, { status: 401 });
  const profile = await getProfile(user.userId);
  if (!profile) return Response.json({ error: "先にマイページを作成してください" }, { status: 409 });
  const { id } = await context.params;
  const db = getDb();
  const [recipe] = await db.select({ visibility: recipes.visibility, moderationStatus: recipes.moderationStatus, userId: recipes.userId }).from(recipes).where(eq(recipes.id, id));
  if (!recipe || recipe.moderationStatus !== "visible" || (recipe.visibility !== "public" && recipe.userId !== user.userId)) return Response.json({ error: "レシピが見つかりません" }, { status: 404 });
  let body = "";
  try { body = String(((await request.json()) as { body?: unknown }).body ?? "").trim().slice(0, 1000); } catch { return Response.json({ error: "コメントを確認してください" }, { status: 400 }); }
  if (!body) return Response.json({ error: "コメントを入力してください" }, { status: 400 });
  const comment = { id: crypto.randomUUID(), recipeId: id, userId: user.userId, authorName: profile.displayName, body, createdAt: new Date().toISOString() };
  await db.insert(comments).values(comment);
  return Response.json({ comment }, { status: 201 });
}
