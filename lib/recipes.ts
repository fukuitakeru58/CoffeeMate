import { and, asc, desc, eq, inArray, or, sql } from "drizzle-orm";
import { getDb } from "../db";
import { beans, bookmarks, comments, follows, likes, profiles, recipes } from "../db/schema";

export type BrewConditions = {
  method: string; grinder: string; grind: string; grindClicks: string;
  dose: number; water: number; temperature: number;
  steps: { time: number; water: number; note: string }[];
};

export type RecipeInput = {
  title: string; method: string; serving: "hot" | "iced" | ""; bean: string; beanId: string | null; dripper: string; dripperId: string | null; roast: string; grinder: string;
  grind: string; grindClicks: string; dose: number; water: number;
  temperature: number; targetTime: number; actualTime: number | null; actualBrew: BrewConditions | null;
  hypothesis: string; steps: { time: number; water: number; note: string }[];
  tasting: string; rating: number | null; visibility: "private" | "public";
};

const trim = (value: unknown, max = 400) => typeof value === "string" ? value.trim().slice(0, max) : "";
const number = (value: unknown, min: number, max: number, fallback: number) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= min && parsed <= max ? parsed : fallback;
};
const tenth = (value: number) => Math.round(value * 10) / 10;
const half = (value: number) => Math.round(value * 2) / 2;
const clicks = (value: unknown) => { const text = trim(value, 40); return /^\d{1,3}$/.test(text) && Number(text) <= 300 ? String(Number(text)) : ""; };
const parseSteps = (value: unknown) => Array.isArray(value) ? value.slice(0, 12).map((item) => ({
  time: number(item?.time, 0, 5999, 0),
  water: number(item?.water, 0, 3000, 0),
  note: trim(item?.note, 140),
})) : [];

export function parseRecipe(value: unknown): RecipeInput | null {
  if (!value || typeof value !== "object") return null;
  const input = value as Record<string, unknown>;
  const title = trim(input.title, 100);
  const bean = trim(input.bean, 100);
  const steps = parseSteps(input.steps);
  const method = trim(input.method, 40) || "ハンドドリップ";
  const serving = input.serving === "hot" || input.serving === "iced" ? input.serving : "";
  const grinder = trim(input.grinder, 80);
  const grind = trim(input.grind, 40) || "中挽き";
  const grindClicks = clicks(input.grindClicks);
  const dose = tenth(number(input.dose, 1, 200, 18));
  const water = number(input.water, 1, 3000, 270);
  const temperature = half(number(input.temperature, 40, 100, 92));
  const actualInput = input.actualBrew && typeof input.actualBrew === "object" && !Array.isArray(input.actualBrew)
    ? input.actualBrew as Record<string, unknown> : null;
  const actualBrew = actualInput ? {
    method: trim(actualInput.method, 40) || method,
    grinder: trim(actualInput.grinder, 80),
    grind: trim(actualInput.grind, 40) || grind,
    grindClicks: clicks(actualInput.grindClicks),
    dose: tenth(number(actualInput.dose, 1, 200, dose)),
    water: number(actualInput.water, 1, 3000, water),
    temperature: half(number(actualInput.temperature, 40, 100, temperature)),
    steps: parseSteps(actualInput.steps),
  } : null;
  return {
    title, bean, beanId: trim(input.beanId, 80) || null, dripper: trim(input.dripper, 100), dripperId: trim(input.dripperId, 80) || null,
    method, serving,
    roast: trim(input.roast, 30) || "中煎り",
    grinder, grind, grindClicks, dose, water, temperature,
    targetTime: number(input.targetTime, 0, 5999, 180),
    actualTime: input.actualTime === null || input.actualTime === "" ? null : number(input.actualTime, 0, 5999, 180),
    actualBrew,
    hypothesis: trim(input.hypothesis, 2000),
    steps,
    tasting: trim(input.tasting, 2000),
    rating: input.rating == null || input.rating === "" ? null : number(input.rating, 1, 5, 3),
    visibility: input.visibility === "public" ? "public" : "private",
  };
}

export type RecipeSort = "date" | "likes" | "saves" | "comments";
export type SortDirection = "asc" | "desc";

export async function listRecipes(scope: string, userId?: string, profileUserId?: string, filters: { roast?: string; country?: string; dripper?: string; sort?: RecipeSort; direction?: SortDirection } = {}) {
  const db = getDb();
  const sortColumn = filters.sort === "likes" ? sql<number>`(select count(*) from ${likes} where ${likes.recipeId} = ${recipes.id})`
    : filters.sort === "saves" ? sql<number>`(select count(*) from ${bookmarks} where ${bookmarks.recipeId} = ${recipes.id})`
    : filters.sort === "comments" ? sql<number>`(select count(*) from ${comments} where ${comments.recipeId} = ${recipes.id} and ${comments.moderationStatus} = 'visible')`
    : recipes.createdAt;
  const orderBy = filters.direction === "asc" ? asc(sortColumn) : desc(sortColumn);
  const countryBeans = filters.country ? await db.select({ id: beans.id }).from(beans).where(eq(beans.country, filters.country)) : [];
  if (filters.country && !countryBeans.length) return [];
  const filterConditions = [
    filters.roast ? eq(recipes.roast, filters.roast) : undefined,
    filters.dripper ? eq(recipes.dripper, filters.dripper) : undefined,
    filters.country ? inArray(recipes.beanId, countryBeans.map((bean) => bean.id)) : undefined,
  ].filter((condition) => condition !== undefined);
  const withFilters = (...conditions: Parameters<typeof and>) => and(...conditions, ...filterConditions);
  let rows;
  if (scope === "mine" && userId) {
    rows = await db.select().from(recipes).where(withFilters(eq(recipes.userId, userId))).orderBy(orderBy, desc(recipes.createdAt), desc(recipes.id)).limit(100);
  } else if (scope === "saved" && userId) {
    const saved = await db.select({ recipeId: bookmarks.recipeId }).from(bookmarks).where(eq(bookmarks.userId, userId));
    rows = saved.length ? await db.select().from(recipes).where(withFilters(inArray(recipes.id, saved.map((item) => item.recipeId)), or(and(eq(recipes.visibility, "public"), eq(recipes.moderationStatus, "visible")), eq(recipes.userId, userId)))).orderBy(orderBy, desc(recipes.createdAt), desc(recipes.id)).limit(100) : [];
  } else if (scope === "following" && userId) {
    const followed = await db.select({ userId: follows.followedUserId }).from(follows).where(eq(follows.followerUserId, userId));
    rows = followed.length ? await db.select().from(recipes).where(withFilters(inArray(recipes.userId, followed.map((item) => item.userId)), eq(recipes.visibility, "public"), eq(recipes.moderationStatus, "visible"))).orderBy(orderBy, desc(recipes.createdAt), desc(recipes.id)).limit(100) : [];
  } else if (scope === "profile" && profileUserId) {
    const ownProfile = userId === profileUserId;
    rows = await db.select().from(recipes).where(withFilters(eq(recipes.userId, profileUserId), ownProfile ? undefined : eq(recipes.visibility, "public"), ownProfile ? undefined : eq(recipes.moderationStatus, "visible"))).orderBy(orderBy, desc(recipes.createdAt), desc(recipes.id)).limit(100);
  } else {
    rows = await db.select().from(recipes).where(withFilters(eq(recipes.visibility, "public"), eq(recipes.moderationStatus, "visible"))).orderBy(orderBy, desc(recipes.createdAt), desc(recipes.id)).limit(100);
  }
  const authors = rows.length ? await db.select({ userId: profiles.userId, displayName: profiles.displayName }).from(profiles).where(inArray(profiles.userId, [...new Set(rows.map((row) => row.userId))])) : [];
  const names = new Map(authors.map((author) => [author.userId, author.displayName]));
  const selectedBeans = rows.filter((row) => row.beanId).map((row) => row.beanId!);
  const beanRows = selectedBeans.length ? await db.select({ id: beans.id, country: beans.country }).from(beans).where(inArray(beans.id, selectedBeans)) : [];
  const countries = new Map(beanRows.map((bean) => [bean.id, bean.country]));
  return Promise.all(rows.map(async (row) => {
    const [likeCount] = await db.select({ count: sql<number>`count(*)` }).from(likes).where(eq(likes.recipeId, row.id));
    const [commentCount] = await db.select({ count: sql<number>`count(*)` }).from(comments).where(and(eq(comments.recipeId, row.id), eq(comments.moderationStatus, "visible")));
    const liked = userId ? (await db.select({ userId: likes.userId }).from(likes).where(and(eq(likes.recipeId, row.id), eq(likes.userId, userId)))).length > 0 : false;
    const ownBookmark = userId ? await db.select({ note: bookmarks.note }).from(bookmarks).where(and(eq(bookmarks.recipeId, row.id), eq(bookmarks.userId, userId))).limit(1) : [];
    const saved = ownBookmark.length > 0;
    return { ...row, beanCountry: row.beanId ? countries.get(row.beanId) ?? "" : "", authorName: names.get(row.userId) ?? row.authorName, steps: JSON.parse(row.steps), actualBrew: row.actualBrew ? JSON.parse(row.actualBrew) : null, likeCount: likeCount.count, commentCount: commentCount.count, liked, saved, saveNote: ownBookmark[0]?.note ?? null };
  }));
}
