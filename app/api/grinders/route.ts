import { asc, eq } from "drizzle-orm";
import { getChatGPTUser } from "../../chatgpt-auth";
import { getDb } from "../../../db";
import { grinders } from "../../../db/schema";

export async function GET() {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: "ログインが必要です" }, { status: 401 });
  const rows = await getDb().select().from(grinders).where(eq(grinders.userId, user.userId)).orderBy(asc(grinders.name));
  return Response.json({ grinders: rows });
}

export async function POST(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: "ログインが必要です" }, { status: 401 });
  let payload: { name?: unknown; maxClicks?: unknown };
  try { payload = await request.json() as { name?: unknown; maxClicks?: unknown }; }
  catch { return Response.json({ error: "入力を確認してください" }, { status: 400 }); }
  const name = typeof payload.name === "string" ? payload.name.trim().slice(0, 80) : "";
  const maxClicks = Number(payload.maxClicks);
  if (!name || !Number.isInteger(maxClicks) || maxClicks < 10 || maxClicks > 300) return Response.json({ error: "ミル名とクリック数の上限を確認してください" }, { status: 400 });
  const db = getDb();
  try {
    const [grinder] = await db.insert(grinders).values({ id: crypto.randomUUID(), userId: user.userId, name, maxClicks, createdAt: new Date().toISOString() }).returning();
    return Response.json({ grinder }, { status: 201 });
  } catch { return Response.json({ error: "同じ名前のミルが既にあります" }, { status: 409 }); }
}
