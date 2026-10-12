import { and, desc, eq } from "drizzle-orm";
import { getChatGPTUser } from "../../../chatgpt-auth";
import { getDb } from "../../../../db";
import { beans, recipes } from "../../../../db/schema";
import { beanNameKey, parseMapUrl } from "../../../../lib/catalog";

type Context = { params: Promise<{ id: string }> };
const value = (item: unknown, max: number) => typeof item === "string" ? item.trim().slice(0, max) : "";

export async function GET(_: Request, context: Context) {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: "ログインが必要です" }, { status: 401 });
  const { id } = await context.params;
  const db = getDb();
  const [bean] = await db.select().from(beans).where(and(eq(beans.id, id), eq(beans.userId, user.userId))).limit(1);
  if (!bean) return Response.json({ error: "豆が見つかりません" }, { status: 404 });
  const linkedRecipes = await db.select({ id: recipes.id, title: recipes.title, method: recipes.method, createdAt: recipes.createdAt }).from(recipes).where(and(eq(recipes.beanId, id), eq(recipes.userId, user.userId))).orderBy(desc(recipes.createdAt));
  return Response.json({ bean, recipes: linkedRecipes });
}

export async function PATCH(request: Request, context: Context) {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: "ログインが必要です" }, { status: 401 });
  const { id } = await context.params;
  let payload: Record<string, unknown>;
  try { payload = await request.json() as Record<string, unknown>; }
  catch { return Response.json({ error: "入力を確認してください" }, { status: 400 }); }
  const name = value(payload.name, 100);
  if (!name) return Response.json({ error: "豆の名前を入力してください" }, { status: 400 });
  const roast = value(payload.roast, 30);
  if (roast && !["浅煎り", "中浅煎り", "中煎り", "中深煎り", "深煎り"].includes(roast)) return Response.json({ error: "焙煎度を選択してください" }, { status: 400 });
  const altitude = payload.altitude === null || payload.altitude === "" || payload.altitude === undefined ? null : Number(payload.altitude);
  if (altitude !== null && (!Number.isInteger(altitude) || altitude < 0 || altitude > 6000)) return Response.json({ error: "標高は0〜6000mの整数で入力してください" }, { status: 400 });
  const purchaseMapUrl = parseMapUrl(payload.purchaseMapUrl);
  if (purchaseMapUrl === null) return Response.json({ error: "Google マップか OpenStreetMap のHTTPSリンクを入力してください" }, { status: 400 });
  const db = getDb();
  const [existing] = await db.select({ id: beans.id }).from(beans).where(and(eq(beans.id, id), eq(beans.userId, user.userId))).limit(1);
  if (!existing) return Response.json({ error: "豆が見つかりません" }, { status: 404 });
  const patch = {
    name, nameKey: beanNameKey(name), country: value(payload.country, 80), region: value(payload.region, 120),
    farm: value(payload.farm, 120), variety: value(payload.variety, 120), roast, altitude, process: value(payload.process, 120),
    terroir: value(payload.terroir, 2000), purchasePlace: value(payload.purchasePlace, 160),
    purchaseMapUrl, notes: value(payload.notes, 2000), updatedAt: new Date().toISOString(),
  };
  try {
    await db.update(beans).set(patch).where(and(eq(beans.id, id), eq(beans.userId, user.userId)));
    await db.update(recipes).set({ bean: name }).where(and(eq(recipes.beanId, id), eq(recipes.userId, user.userId)));
    return Response.json({ ok: true });
  } catch { return Response.json({ error: "同じ名前の豆が既にあります" }, { status: 409 }); }
}

export async function DELETE(_: Request, context: Context) {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: "ログインが必要です" }, { status: 401 });
  const { id } = await context.params;
  const db = getDb();
  await db.update(recipes).set({ beanId: null }).where(and(eq(recipes.beanId, id), eq(recipes.userId, user.userId)));
  const deleted = await db.delete(beans).where(and(eq(beans.id, id), eq(beans.userId, user.userId))).returning({ id: beans.id });
  return deleted.length ? Response.json({ ok: true }) : Response.json({ error: "豆が見つかりません" }, { status: 404 });
}
