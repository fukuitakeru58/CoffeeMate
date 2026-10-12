import { eq, sql } from "drizzle-orm";
import { getDb } from "../../../../db";
import { localAccounts } from "../../../../db/schema";
import { checkAuthRateLimit, createSession, isSameOriginRequest, parseUsername, slowUnknownPassword, verifyPassword } from "../../../../lib/local-auth";

export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) return Response.json({ error: "この操作はできません" }, { status: 403 });
  if (!await checkAuthRateLimit(request, "login")) return Response.json({ error: "試行回数が多いため、少し待ってからお試しください" }, { status: 429 });
  let input: Record<string, unknown>;
  try { input = await request.json() as Record<string, unknown>; } catch { return Response.json({ error: "入力を確認してください" }, { status: 400 }); }
  const parsed = parseUsername(input.username);
  const password = input.password;
  if (!parsed || typeof password !== "string" || Array.from(password).length > 128) return Response.json({ error: "ユーザー名またはパスワードを確認してください" }, { status: 401 });
  const db = getDb();
  const [account] = await db.select().from(localAccounts).where(eq(localAccounts.usernameKey, parsed.usernameKey)).limit(1);
  if (!account) {
    await slowUnknownPassword(password);
    return Response.json({ error: "ユーザー名またはパスワードを確認してください" }, { status: 401 });
  }
  const now = new Date();
  if (account.lockedUntil && account.lockedUntil > now.toISOString()) {
    await slowUnknownPassword(password);
    return Response.json({ error: "ユーザー名またはパスワードを確認してください" }, { status: 401 });
  }
  const correct = await verifyPassword(password, account.passwordSalt, account.passwordHash);
  if (!correct) {
    await db.update(localAccounts).set({
      failedAttempts: sql`case when ${localAccounts.failedAttempts} + 1 >= 10 then 0 else ${localAccounts.failedAttempts} + 1 end`,
      lockedUntil: sql`case when ${localAccounts.failedAttempts} + 1 >= 10 then ${new Date(now.getTime() + 15 * 60_000).toISOString()} else null end`,
    }).where(eq(localAccounts.userId, account.userId));
    return Response.json({ error: "ユーザー名またはパスワードを確認してください" }, { status: 401 });
  }
  await db.update(localAccounts).set({ failedAttempts: 0, lockedUntil: null }).where(eq(localAccounts.userId, account.userId));
  const cookie = await createSession(account.userId, new URL(request.url).protocol === "https:");
  return Response.json({ userId: account.userId }, { headers: { "Set-Cookie": cookie, "Cache-Control": "no-store" } });
}
