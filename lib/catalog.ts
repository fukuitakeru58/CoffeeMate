import { and, eq, sql } from "drizzle-orm";
import { getDb } from "../db";
import { beans, drippers, recipeCounters } from "../db/schema";

export function beanNameKey(name: string) {
  return name.normalize("NFKC").trim().replace(/\s+/g, " ").toLocaleLowerCase("ja-JP");
}

export async function resolveBean(userId: string, beanId: string | null, name: string) {
  const db = getDb();
  if (beanId) {
    const [bean] = await db.select().from(beans).where(and(eq(beans.id, beanId), eq(beans.userId, userId))).limit(1);
    if (!bean) throw new Error("選択したコーヒー豆が見つかりません");
    return { id: bean.id, name: bean.name };
  }
  const trimmed = name.trim().slice(0, 100);
  if (!trimmed) return null;
  const nameKey = beanNameKey(trimmed);
  const now = new Date().toISOString();
  const id = crypto.randomUUID();
  await db.insert(beans).values({ id, userId, name: trimmed, nameKey, createdAt: now, updatedAt: now }).onConflictDoNothing();
  const [bean] = await db.select().from(beans).where(and(eq(beans.userId, userId), eq(beans.nameKey, nameKey))).limit(1);
  return bean ? { id: bean.id, name: bean.name } : null;
}

export async function resolveDripper(userId: string, dripperId: string | null, name: string) {
  const db = getDb();
  if (dripperId) {
    const [dripper] = await db.select().from(drippers).where(and(eq(drippers.id, dripperId), eq(drippers.userId, userId))).limit(1);
    if (!dripper) throw new Error("選択したドリッパーが見つかりません");
    return { id: dripper.id, name: dripper.name };
  }
  const trimmed = name.trim().slice(0, 100);
  if (!trimmed) return null;
  const nameKey = beanNameKey(trimmed);
  await db.insert(drippers).values({ id: crypto.randomUUID(), userId, name: trimmed, nameKey, createdAt: new Date().toISOString() }).onConflictDoNothing();
  const [dripper] = await db.select().from(drippers).where(and(eq(drippers.userId, userId), eq(drippers.nameKey, nameKey))).limit(1);
  return dripper ? { id: dripper.id, name: dripper.name } : null;
}

export async function generatedRecipeTitle(userId: string) {
  const date = new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Tokyo", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  const [counter] = await getDb().insert(recipeCounters).values({ userId, date, count: 1 }).onConflictDoUpdate({
    target: [recipeCounters.userId, recipeCounters.date],
    set: { count: sql`${recipeCounters.count} + 1` },
  }).returning({ count: recipeCounters.count });
  return `${date} #${String(counter.count).padStart(2, "0")}`;
}

export function parseMapUrl(value: unknown) {
  if (typeof value !== "string" || !value.trim()) return "";
  try {
    const url = new URL(value.trim());
    const host = url.hostname.toLowerCase();
    const allowed = host === "maps.app.goo.gl" || host === "goo.gl" || host === "google.com" || host.endsWith(".google.com") || host === "openstreetmap.org" || host.endsWith(".openstreetmap.org");
    return url.protocol === "https:" && allowed ? url.toString().slice(0, 1000) : null;
  } catch { return null; }
}
