import { eq } from "drizzle-orm";
import { getDb } from "../db";
import { comments, profiles, recipes } from "../db/schema";

export async function getProfile(userId: string) {
  const [profile] = await getDb().select().from(profiles).where(eq(profiles.userId, userId)).limit(1);
  return profile ?? null;
}

export function parseProfileInput(value: unknown) {
  if (!value || typeof value !== "object") return null;
  const input = value as Record<string, unknown>;
  const displayName = typeof input.displayName === "string" ? input.displayName.trim().replace(/\s+/g, " ") : "";
  const bio = typeof input.bio === "string" ? input.bio.trim() : "";
  if (!displayName || displayName.length > 40 || bio.length > 500) return null;
  return { displayName, bio };
}

export async function syncAuthorName(userId: string, displayName: string) {
  const db = getDb();
  await db.update(recipes).set({ authorName: displayName }).where(eq(recipes.userId, userId));
  await db.update(comments).set({ authorName: displayName }).where(eq(comments.userId, userId));
}
