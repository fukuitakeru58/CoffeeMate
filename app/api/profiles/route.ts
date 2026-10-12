import { eq } from "drizzle-orm";
import { getChatGPTUser } from "../../chatgpt-auth";
import { getDb } from "../../../db";
import { profiles } from "../../../db/schema";
import { getProfile, parseProfileInput, syncAuthorName } from "../../../lib/profiles";

export async function GET() {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: "ログインが必要です" }, { status: 401 });
  return Response.json({ profile: await getProfile(user.userId) });
}

export async function POST(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: "ログインが必要です" }, { status: 401 });
  let input;
  try { input = parseProfileInput(await request.json()); }
  catch { return Response.json({ error: "入力を確認してください" }, { status: 400 }); }
  if (!input) return Response.json({ error: "表示名は1〜40文字、自己紹介は500文字以内で入力してください" }, { status: 400 });
  const now = new Date().toISOString();
  const profile = { userId: user.userId, ...input, createdAt: now, updatedAt: now };
  try { await getDb().insert(profiles).values(profile); }
  catch { return Response.json({ error: "マイページは既に作成されています" }, { status: 409 }); }
  await syncAuthorName(user.userId, input.displayName);
  return Response.json({ profile }, { status: 201 });
}

export async function PATCH(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: "ログインが必要です" }, { status: 401 });
  let input;
  try { input = parseProfileInput(await request.json()); }
  catch { return Response.json({ error: "入力を確認してください" }, { status: 400 }); }
  if (!input) return Response.json({ error: "表示名は1〜40文字、自己紹介は500文字以内で入力してください" }, { status: 400 });
  const [profile] = await getDb().update(profiles).set({ ...input, updatedAt: new Date().toISOString() }).where(eq(profiles.userId, user.userId)).returning();
  if (!profile) return Response.json({ error: "先にマイページを作成してください" }, { status: 409 });
  await syncAuthorName(user.userId, input.displayName);
  return Response.json({ profile });
}
