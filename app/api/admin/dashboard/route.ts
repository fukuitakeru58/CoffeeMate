import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { getDb } from "../../../../db";
import { comments, moderationActions, profiles, recipes, reports } from "../../../../db/schema";
import { getSiteAdmin } from "../../../../lib/site-admin";

export async function GET() {
  if (!await getSiteAdmin()) return Response.json({ error: "管理者のみ利用できます" }, { status: 403 });
  const db = getDb();
  const [userCount, recipeCount, commentCount, openReportCount, reportRows, recipeRows, commentRows, actionRows] = await Promise.all([
    db.select({ count: sql<number>`count(*)` }).from(profiles),
    db.select({ count: sql<number>`count(*)` }).from(recipes).where(and(eq(recipes.visibility, "public"), eq(recipes.moderationStatus, "visible"))),
    db.select({ count: sql<number>`count(*)` }).from(comments),
    db.select({ count: sql<number>`count(*)` }).from(reports).where(eq(reports.status, "open")),
    db.select().from(reports).orderBy(sql`case when ${reports.status} = 'open' then 0 else 1 end`, desc(reports.createdAt)).limit(100),
    db.select({ id: recipes.id, userId: recipes.userId, title: recipes.title, authorName: recipes.authorName, moderationStatus: recipes.moderationStatus, createdAt: recipes.createdAt, imageKey: recipes.imageKey }).from(recipes).where(eq(recipes.visibility, "public")).orderBy(desc(recipes.createdAt)).limit(100),
    db.select({ id: comments.id, recipeId: comments.recipeId, userId: comments.userId, authorName: comments.authorName, body: comments.body, moderationStatus: comments.moderationStatus, createdAt: comments.createdAt }).from(comments).innerJoin(recipes, eq(comments.recipeId, recipes.id)).where(eq(recipes.visibility, "public")).orderBy(desc(comments.createdAt)).limit(100),
    db.select().from(moderationActions).orderBy(desc(moderationActions.createdAt)).limit(100),
  ]);
  const recipeIds = [...new Set([...reportRows.filter((row) => row.targetType === "recipe").map((row) => row.targetId), ...commentRows.map((row) => row.recipeId)])];
  const commentIds = reportRows.filter((row) => row.targetType === "comment").map((row) => row.targetId);
  const reporterIds = [...new Set(reportRows.map((row) => row.reporterUserId))];
  const [referencedRecipes, referencedComments, reporters] = await Promise.all([
    recipeIds.length ? db.select({ id: recipes.id, title: recipes.title }).from(recipes).where(inArray(recipes.id, recipeIds)) : [],
    commentIds.length ? db.select({ id: comments.id, body: comments.body, recipeId: comments.recipeId }).from(comments).where(inArray(comments.id, commentIds)) : [],
    reporterIds.length ? db.select({ userId: profiles.userId, displayName: profiles.displayName }).from(profiles).where(inArray(profiles.userId, reporterIds)) : [],
  ]);
  const recipeTitles = new Map(referencedRecipes.map((row) => [row.id, row.title]));
  const commentTargets = new Map(referencedComments.map((row) => [row.id, row]));
  const reporterNames = new Map(reporters.map((row) => [row.userId, row.displayName]));
  return Response.json({
    counts: { users: userCount[0].count, recipes: recipeCount[0].count, comments: commentCount[0].count, openReports: openReportCount[0].count },
    reports: reportRows.map((row) => ({ ...row, reporterName: reporterNames.get(row.reporterUserId) ?? "不明", targetLabel: row.targetType === "recipe" ? recipeTitles.get(row.targetId) ?? "削除済みのレシピ" : commentTargets.get(row.targetId)?.body ?? "削除済みのコメント", recipeId: row.targetType === "recipe" ? row.targetId : commentTargets.get(row.targetId)?.recipeId ?? null })),
    recipes: recipeRows,
    comments: commentRows.map((row) => ({ ...row, recipeTitle: recipeTitles.get(row.recipeId) ?? "レシピ" })),
    actions: actionRows,
  }, { headers: { "Cache-Control": "no-store" } });
}
