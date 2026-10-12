import { desc, eq } from "drizzle-orm";
import { getChatGPTUser } from "../../chatgpt-auth";
import { getDb } from "../../../db";
import { beans } from "../../../db/schema";
import { resolveBean } from "../../../lib/catalog";

export async function GET() {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: "ログインが必要です" }, { status: 401 });
  const rows = await getDb().select().from(beans).where(eq(beans.userId, user.userId)).orderBy(desc(beans.updatedAt));
  return Response.json({ beans: rows });
}

export async function POST(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: "ログインが必要です" }, { status: 401 });
  let name = "";
  try { name = String(((await request.json()) as { name?: unknown }).name ?? "").trim().slice(0, 100); }
  catch { return Response.json({ error: "豆の名前を確認してください" }, { status: 400 }); }
  if (!name) return Response.json({ error: "豆の名前を入力してください" }, { status: 400 });
  const bean = await resolveBean(user.userId, null, name);
  return Response.json({ bean }, { status: 201 });
}
