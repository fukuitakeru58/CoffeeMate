import { and, eq } from "drizzle-orm";
import { getDb } from "../../../../../db";
import { moderationActions, reports } from "../../../../../db/schema";
import { isSameOriginRequest } from "../../../../../lib/local-auth";
import { getSiteAdmin } from "../../../../../lib/site-admin";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  if (!isSameOriginRequest(request)) return Response.json({ error: "この操作はできません" }, { status: 403 });
  const admin = await getSiteAdmin();
  if (!admin) return Response.json({ error: "管理者のみ利用できます" }, { status: 403 });
  const { id } = await context.params;
  let input: Record<string, unknown>;
  try { input = await request.json() as Record<string, unknown>; }
  catch { return Response.json({ error: "入力を確認してください" }, { status: 400 }); }
  const status = input.status;
  if (status !== "resolved" && status !== "dismissed") return Response.json({ error: "操作を確認してください" }, { status: 400 });
  const db = getDb();
  const [report] = await db.select({ id: reports.id }).from(reports).where(and(eq(reports.id, id), eq(reports.status, "open"))).limit(1);
  if (!report) return Response.json({ error: "未対応の通報が見つかりません" }, { status: 404 });
  const now = new Date().toISOString();
  await db.batch([
    db.update(reports).set({ status, resolvedAt: now, resolvedBy: admin.userId }).where(eq(reports.id, id)),
    db.insert(moderationActions).values({ id: crypto.randomUUID(), adminUserId: admin.userId, targetType: "report", targetId: id, action: status, reason: "", createdAt: now }),
  ]);
  return Response.json({ ok: true });
}
