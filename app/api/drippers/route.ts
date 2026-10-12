import { asc, and, eq } from "drizzle-orm";
import { getChatGPTUser } from "../../chatgpt-auth";
import { getDb } from "../../../db";
import { drippers, recipes } from "../../../db/schema";
import { resolveDripper } from "../../../lib/catalog";

export async function GET() {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: "ログインが必要です" }, { status: 401 });
  const rows = await getDb().select().from(drippers).where(eq(drippers.userId, user.userId)).orderBy(asc(drippers.name));
  return Response.json({ drippers: rows });
}

export async function POST(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: "ログインが必要です" }, { status: 401 });
  let payload: { name?: unknown };
  try { payload = await request.json() as { name?: unknown }; }
  catch { return Response.json({ error: "入力を確認してください" }, { status: 400 }); }
  const name = typeof payload.name === "string" ? payload.name.trim().slice(0, 100) : "";
  if (!name) return Response.json({ error: "ドリッパー名を入力してください" }, { status: 400 });
  const dripper = await resolveDripper(user.userId, null, name);
  return Response.json({ dripper }, { status: 201 });
}

export async function DELETE(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: "ログインが必要です" }, { status: 401 });
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return Response.json({ error: "ドリッパーを指定してください" }, { status: 400 });
  const db = getDb();
  await db.update(recipes).set({ dripperId: null }).where(and(eq(recipes.dripperId, id), eq(recipes.userId, user.userId)));
  const removed = await db.delete(drippers).where(and(eq(drippers.id, id), eq(drippers.userId, user.userId))).returning({ id: drippers.id });
  return removed.length ? Response.json({ ok: true }) : Response.json({ error: "見つかりません" }, { status: 404 });
}
