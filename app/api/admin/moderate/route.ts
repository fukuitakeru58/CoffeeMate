import { and, eq } from "drizzle-orm";
import { env } from "cloudflare:workers";
import { getDb } from "../../../../db";
import { comments, moderationActions, recipes, reports } from "../../../../db/schema";
import { isSameOriginRequest } from "../../../../lib/local-auth";
import { getSiteAdmin } from "../../../../lib/site-admin";

export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) return Response.json({ error: "この操作はできません" }, { status: 403 });
  const admin = await getSiteAdmin();
  if (!admin) return Response.json({ error: "管理者のみ利用できます" }, { status: 403 });
  let input: Record<string, unknown>;
  try { input = await request.json() as Record<string, unknown>; }
  catch { return Response.json({ error: "入力を確認してください" }, { status: 400 }); }
  const targetType = input.targetType;
  const targetId = typeof input.targetId === "string" ? input.targetId.trim() : "";
  const action = input.action;
  const reason = typeof input.reason === "string" ? input.reason.trim().slice(0, 300) : "";
  if ((targetType !== "recipe" && targetType !== "comment") || !targetId || targetId.length > 100 || (action !== "hide" && action !== "restore" && action !== "delete")) {
    return Response.json({ error: "対象と操作を確認してください" }, { status: 400 });
  }
  const db = getDb();
  const now = new Date().toISOString();
  const audit = db.insert(moderationActions).values({ id: crypto.randomUUID(), adminUserId: admin.userId, targetType, targetId, action, reason, createdAt: now });
  if (targetType === "recipe") {
    const [target] = await db.select({ imageKey: recipes.imageKey }).from(recipes).where(and(eq(recipes.id, targetId), eq(recipes.visibility, "public"))).limit(1);
    if (!target) return Response.json({ error: "レシピが見つかりません" }, { status: 404 });
    const updateReports = db.update(reports).set({ status: "resolved", resolvedAt: now, resolvedBy: admin.userId }).where(and(eq(reports.targetType, "recipe"), eq(reports.targetId, targetId), eq(reports.status, "open")));
    if (action === "delete") {
      await db.batch([db.delete(recipes).where(eq(recipes.id, targetId)), updateReports, audit]);
      if (target.imageKey && env.BUCKET) await env.BUCKET.delete(target.imageKey);
    } else {
      await db.batch([db.update(recipes).set({ moderationStatus: action === "hide" ? "hidden" : "visible", updatedAt: now }).where(eq(recipes.id, targetId)), ...(action === "hide" ? [updateReports] : []), audit]);
    }
  } else {
    const [target] = await db.select({ id: comments.id }).from(comments).innerJoin(recipes, eq(comments.recipeId, recipes.id)).where(and(eq(comments.id, targetId), eq(recipes.visibility, "public"))).limit(1);
    if (!target) return Response.json({ error: "コメントが見つかりません" }, { status: 404 });
    const updateReports = db.update(reports).set({ status: "resolved", resolvedAt: now, resolvedBy: admin.userId }).where(and(eq(reports.targetType, "comment"), eq(reports.targetId, targetId), eq(reports.status, "open")));
    if (action === "delete") {
      await db.batch([db.delete(comments).where(eq(comments.id, targetId)), updateReports, audit]);
    } else {
      await db.batch([db.update(comments).set({ moderationStatus: action === "hide" ? "hidden" : "visible" }).where(eq(comments.id, targetId)), ...(action === "hide" ? [updateReports] : []), audit]);
    }
  }
  return Response.json({ ok: true });
}
