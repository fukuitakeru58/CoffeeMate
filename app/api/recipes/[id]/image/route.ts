import { env } from "cloudflare:workers";
import { and, eq } from "drizzle-orm";
import { getAuthUser } from "../../../../auth";
import { getDb } from "../../../../../db";
import { recipes } from "../../../../../db/schema";

type Context = { params: Promise<{ id: string }> };
const MAX_BYTES = 5 * 1024 * 1024;
const PNG_SIGNATURE = [137, 80, 78, 71, 13, 10, 26, 10];

async function findRecipe(id: string) {
  const [recipe] = await getDb().select({ userId: recipes.userId, visibility: recipes.visibility, moderationStatus: recipes.moderationStatus, imageKey: recipes.imageKey }).from(recipes).where(eq(recipes.id, id)).limit(1);
  return recipe ?? null;
}

export async function GET(_: Request, context: Context) {
  const { id } = await context.params;
  const user = await getAuthUser();
  const recipe = await findRecipe(id);
  if (!recipe || !recipe.imageKey || ((recipe.visibility !== "public" || recipe.moderationStatus !== "visible") && recipe.userId !== user?.userId)) return new Response(null, { status: 404 });
  if (!env.BUCKET) return new Response(null, { status: 503 });
  const object = await env.BUCKET.get(recipe.imageKey);
  if (!object) return new Response(null, { status: 404 });
  return new Response(object.body, { headers: { "Content-Type": "image/png", "X-Content-Type-Options": "nosniff", "Cache-Control": recipe.visibility === "public" && recipe.moderationStatus === "visible" ? "public, max-age=3600" : "private, no-store" } });
}

export async function PUT(request: Request, context: Context) {
  const user = await getAuthUser();
  if (!user) return Response.json({ error: "ログインが必要です" }, { status: 401 });
  const { id } = await context.params;
  const recipe = await findRecipe(id);
  if (!recipe || recipe.userId !== user.userId) return Response.json({ error: "レシピが見つかりません" }, { status: 404 });
  if (!env.BUCKET) return Response.json({ error: "画像保存を利用できません" }, { status: 503 });
  if (request.headers.get("content-type")?.split(";")[0] !== "image/png") return Response.json({ error: "PNG形式の画像を選んでください" }, { status: 400 });
  if (Number(request.headers.get("content-length") || 0) > MAX_BYTES) return Response.json({ error: "PNG画像は5MB以下にしてください" }, { status: 413 });
  let bytes: Uint8Array;
  try { bytes = new Uint8Array(await request.arrayBuffer()); }
  catch { return Response.json({ error: "画像を読み込めませんでした" }, { status: 400 }); }
  if (!bytes.length || bytes.length > MAX_BYTES) return Response.json({ error: "PNG画像は5MB以下にしてください" }, { status: 400 });
  if (!PNG_SIGNATURE.every((value, index) => bytes[index] === value) || bytes[12] !== 73 || bytes[13] !== 72 || bytes[14] !== 68 || bytes[15] !== 82) return Response.json({ error: "正しいPNG形式の画像を選んでください" }, { status: 400 });
  const key = `recipes/${id}/${crypto.randomUUID()}.png`;
  await env.BUCKET.put(key, bytes, { httpMetadata: { contentType: "image/png" } });
  try {
    const updated = await getDb().update(recipes).set({ imageKey: key, updatedAt: new Date().toISOString() }).where(and(eq(recipes.id, id), eq(recipes.userId, user.userId))).returning({ id: recipes.id });
    if (!updated.length) { await env.BUCKET.delete(key); return Response.json({ error: "レシピが見つかりません" }, { status: 404 }); }
  } catch (error) { await env.BUCKET.delete(key); throw error; }
  if (recipe.imageKey) await env.BUCKET.delete(recipe.imageKey);
  return Response.json({ imageKey: key });
}

export async function DELETE(_: Request, context: Context) {
  const user = await getAuthUser();
  if (!user) return Response.json({ error: "ログインが必要です" }, { status: 401 });
  const { id } = await context.params;
  const recipe = await findRecipe(id);
  if (!recipe || recipe.userId !== user.userId) return Response.json({ error: "レシピが見つかりません" }, { status: 404 });
  await getDb().update(recipes).set({ imageKey: null, updatedAt: new Date().toISOString() }).where(and(eq(recipes.id, id), eq(recipes.userId, user.userId)));
  if (recipe.imageKey && env.BUCKET) await env.BUCKET.delete(recipe.imageKey);
  return Response.json({ ok: true });
}
