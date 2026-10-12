import { and, eq } from "drizzle-orm";
import { getAuthUser } from "../../../../auth";
import { getDb } from "../../../../../db";
import { bookmarks, recipes } from "../../../../../db/schema";
import { getProfile } from "../../../../../lib/profiles";

type Context = { params: Promise<{ id: string }> };
const MAX_NOTE_LENGTH = 2000;

export async function PUT(request: Request, context: Context) {
  const user = await getAuthUser();
  if (!user) return Response.json({ error: "ログインが必要です" }, { status: 401 });
  if (!await getProfile(user.userId)) return Response.json({ error: "先にマイページを作成してください" }, { status: 409 });
  let payload: { note?: unknown };
  try { payload = await request.json() as { note?: unknown }; }
  catch { return Response.json({ error: "メモを確認してください" }, { status: 400 }); }
  if (typeof payload.note !== "string" || payload.note.length > MAX_NOTE_LENGTH) return Response.json({ error: "メモは2000文字以内で入力してください" }, { status: 400 });
  const note = payload.note.trim();
  const { id } = await context.params;
  const db = getDb();
  const [recipe] = await db.select({ visibility: recipes.visibility, moderationStatus: recipes.moderationStatus, userId: recipes.userId }).from(recipes).where(eq(recipes.id, id)).limit(1);
  if (!recipe || recipe.moderationStatus !== "visible" || (recipe.visibility !== "public" && recipe.userId !== user.userId)) return Response.json({ error: "レシピが見つかりません" }, { status: 404 });
  await db.insert(bookmarks).values({ recipeId: id, userId: user.userId, note }).onConflictDoUpdate({ target: [bookmarks.recipeId, bookmarks.userId], set: { note } });
  return Response.json({ saved: true, note });
}

export async function DELETE(_: Request, context: Context) {
  const user = await getAuthUser();
  if (!user) return Response.json({ error: "ログインが必要です" }, { status: 401 });
  const { id } = await context.params;
  await getDb().delete(bookmarks).where(and(eq(bookmarks.recipeId, id), eq(bookmarks.userId, user.userId)));
  return Response.json({ saved: false });
}
