import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { getDb } from "../db";
import { bookmarks, comments, likes, ratings, recipes } from "../db/schema";

export type RecipeInput = {
  title: string; method: string; bean: string; roast: string; grinder: string;
  grind: string; grindClicks: string; dose: number; water: number;
  temperature: number; targetTime: number; actualTime: number | null;
  hypothesis: string; steps: { time: number; water: number; note: string }[];
  tasting: string; rating: number | null; visibility: "private" | "public";
};

const trim = (value: unknown, max = 400) => typeof value === "string" ? value.trim().slice(0, max) : "";
const number = (value: unknown, min: number, max: number, fallback: number) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= min && parsed <= max ? parsed : fallback;
};

export function parseRecipe(value: unknown): RecipeInput | null {
  if (!value || typeof value !== "object") return null;
  const input = value as Record<string, unknown>;
  const title = trim(input.title, 100);
  const bean = trim(input.bean, 100);
  if (!title || !bean) return null;
  const steps = Array.isArray(input.steps) ? input.steps.slice(0, 12).map((item) => ({
    time: number(item?.time, 0, 3600, 0),
    water: number(item?.water, 0, 3000, 0),
    note: trim(item?.note, 140),
  })) : [];
  return {
    title, bean,
    method: trim(input.method, 40) || "ハンドドリップ",
    roast: trim(input.roast, 30) || "中煎り",
    grinder: trim(input.grinder, 80),
    grind: trim(input.grind, 40) || "中挽き",
    grindClicks: trim(input.grindClicks, 40),
    dose: number(input.dose, 1, 200, 18),
    water: number(input.water, 1, 3000, 270),
    temperature: number(input.temperature, 40, 100, 92),
    targetTime: number(input.targetTime, 0, 3600, 180),
    actualTime: input.actualTime === null || input.actualTime === "" ? null : number(input.actualTime, 0, 3600, 180),
    hypothesis: trim(input.hypothesis, 2000),
    steps,
    tasting: trim(input.tasting, 2000),
    rating: input.rating === null || input.rating === "" ? null : number(input.rating, 1, 5, 3),
    visibility: input.visibility === "public" ? "public" : "private",
  };
}

export async function listRecipes(scope: string, userId?: string) {
  const db = getDb();
  let rows;
  if (scope === "mine" && userId) {
    rows = await db.select().from(recipes).where(eq(recipes.userId, userId)).orderBy(desc(recipes.createdAt)).limit(100);
  } else if (scope === "saved" && userId) {
    const saved = await db.select({ recipeId: bookmarks.recipeId }).from(bookmarks).where(eq(bookmarks.userId, userId));
    rows = saved.length ? await db.select().from(recipes).where(and(inArray(recipes.id, saved.map((item) => item.recipeId)), eq(recipes.visibility, "public"))).orderBy(desc(recipes.createdAt)).limit(100) : [];
  } else {
    rows = await db.select().from(recipes).where(eq(recipes.visibility, "public")).orderBy(desc(recipes.createdAt)).limit(100);
  }
  return Promise.all(rows.map(async (row) => {
    const [likeCount] = await db.select({ count: sql<number>`count(*)` }).from(likes).where(eq(likes.recipeId, row.id));
    const [commentCount] = await db.select({ count: sql<number>`count(*)` }).from(comments).where(eq(comments.recipeId, row.id));
    const [ratingSummary] = await db.select({ count: sql<number>`count(*)`, average: sql<number | null>`avg(${ratings.score})` }).from(ratings).where(eq(ratings.recipeId, row.id));
    const ownRating = userId ? await db.select({ score: ratings.score }).from(ratings).where(and(eq(ratings.recipeId, row.id), eq(ratings.userId, userId))) : [];
    const liked = userId ? (await db.select({ userId: likes.userId }).from(likes).where(and(eq(likes.recipeId, row.id), eq(likes.userId, userId)))).length > 0 : false;
    const saved = userId ? (await db.select({ userId: bookmarks.userId }).from(bookmarks).where(and(eq(bookmarks.recipeId, row.id), eq(bookmarks.userId, userId)))).length > 0 : false;
    return { ...row, steps: JSON.parse(row.steps), likeCount: likeCount.count, commentCount: commentCount.count, ratingCount: ratingSummary.count, averageRating: ratingSummary.average, userRating: ownRating[0]?.score ?? null, liked, saved };
  }));
}
