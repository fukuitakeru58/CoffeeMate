import { and, eq } from "drizzle-orm";
import { getDb } from "../../../db";
import { beans, recipes } from "../../../db/schema";

export async function GET() {
  const db = getDb();
  const [countries, drippers] = await Promise.all([
    db.selectDistinct({ value: beans.country }).from(recipes).innerJoin(beans, eq(recipes.beanId, beans.id)).where(and(eq(recipes.visibility, "public"), eq(recipes.moderationStatus, "visible"))),
    db.selectDistinct({ value: recipes.dripper }).from(recipes).where(and(eq(recipes.visibility, "public"), eq(recipes.moderationStatus, "visible"))),
  ]);
  return Response.json({ countries: countries.map((row) => row.value).filter(Boolean).sort((a, b) => a.localeCompare(b, "ja")), drippers: drippers.map((row) => row.value).filter(Boolean).sort((a, b) => a.localeCompare(b, "ja")) });
}
