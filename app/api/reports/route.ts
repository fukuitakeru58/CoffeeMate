import { and, eq, sql } from "drizzle-orm";
import { getAuthUser } from "../../auth";
import { getDb } from "../../../db";
import { comments, recipes, reports } from "../../../db/schema";
import { isSameOriginRequest } from "../../../lib/local-auth";

const reasons = new Set(["spam", "abuse", "inappropriate", "other"]);

export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) return Response.json({ error: "この操作はできません" }, { status: 403 });
  const user = await getAuthUser();
  if (!user) return Response.json({ error: "通報にはログインが必要です" }, { status: 401 });
  let input: Record<string, unknown>;
  try { input = await request.json() as Record<string, unknown>; }
  catch { return Response.json({ error: "入力を確認してください" }, { status: 400 }); }
  const targetType = input.targetType;
  const targetId = typeof input.targetId === "string" ? input.targetId.trim() : "";
  const reason = input.reason;
  const details = typeof input.details === "string" ? input.details.trim() : "";
  if ((targetType !== "recipe" && targetType !== "comment") || !targetId || targetId.length > 100 || typeof reason !== "string" || !reasons.has(reason) || details.length > 500) {
    return Response.json({ error: "通報内容を確認してください" }, { status: 400 });
  }
  const db = getDb();
  const [openCount] = await db.select({ count: sql<number>`count(*)` }).from(reports).where(and(eq(reports.reporterUserId, user.userId), eq(reports.status, "open")));
  if (openCount.count >= 20) return Response.json({ error: "通報の件数が多いため、しばらく待ってください" }, { status: 429 });
  if (targetType === "recipe") {
    const [recipe] = await db.select({ id: recipes.id }).from(recipes).where(and(eq(recipes.id, targetId), eq(recipes.visibility, "public"), eq(recipes.moderationStatus, "visible"))).limit(1);
    if (!recipe) return Response.json({ error: "レシピが見つかりません" }, { status: 404 });
  } else {
    const [comment] = await db.select({ id: comments.id }).from(comments).innerJoin(recipes, eq(comments.recipeId, recipes.id)).where(and(eq(comments.id, targetId), eq(comments.moderationStatus, "visible"), eq(recipes.visibility, "public"), eq(recipes.moderationStatus, "visible"))).limit(1);
    if (!comment) return Response.json({ error: "コメントが見つかりません" }, { status: 404 });
  }
  try {
    await db.insert(reports).values({ id: crypto.randomUUID(), reporterUserId: user.userId, targetType, targetId, reason, details, status: "open", createdAt: new Date().toISOString() });
  } catch {
    return Response.json({ error: "この投稿はすでに通報済みです" }, { status: 409 });
  }
  return Response.json({ ok: true }, { status: 201 });
}
