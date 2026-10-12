import { eq } from "drizzle-orm";
import { getDb } from "../../../../db";
import { localAccounts, localSessions } from "../../../../db/schema";
import { checkAuthRateLimit, createSession, hashPassword, isSameOriginRequest, parseUsername, passwordError, randomToken, sha256 } from "../../../../lib/local-auth";

export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) return Response.json({ error: "この操作はできません" }, { status: 403 });
  if (!await checkAuthRateLimit(request, "recover")) return Response.json({ error: "試行回数が多いため、少し待ってからお試しください" }, { status: 429 });
  let input: Record<string, unknown>;
  try { input = await request.json() as Record<string, unknown>; } catch { return Response.json({ error: "入力を確認してください" }, { status: 400 }); }
  const parsed = parseUsername(input.username);
  const code = typeof input.recoveryCode === "string" ? input.recoveryCode.trim() : "";
  if (!parsed || !/^[A-Za-z0-9_-]{32}$/.test(code)) return Response.json({ error: "ユーザー名または復旧コードを確認してください" }, { status: 401 });
  const invalidPassword = passwordError(input.password, parsed.username);
  if (invalidPassword) return Response.json({ error: invalidPassword }, { status: 400 });
  const db = getDb();
  const [account] = await db.select().from(localAccounts).where(eq(localAccounts.usernameKey, parsed.usernameKey)).limit(1);
  if (!account || account.recoveryHash !== await sha256(code)) return Response.json({ error: "ユーザー名または復旧コードを確認してください" }, { status: 401 });
  const password = await hashPassword(input.password as string);
  const nextRecoveryCode = randomToken(24);
  await db.update(localAccounts).set({ passwordHash: password.hash, passwordSalt: password.salt, recoveryHash: await sha256(nextRecoveryCode), failedAttempts: 0, lockedUntil: null, updatedAt: new Date().toISOString() }).where(eq(localAccounts.userId, account.userId));
  await db.delete(localSessions).where(eq(localSessions.userId, account.userId));
  const cookie = await createSession(account.userId, new URL(request.url).protocol === "https:");
  return Response.json({ userId: account.userId, recoveryCode: nextRecoveryCode }, { headers: { "Set-Cookie": cookie, "Cache-Control": "no-store" } });
}
