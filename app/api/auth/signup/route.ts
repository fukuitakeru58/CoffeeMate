import { eq } from "drizzle-orm";
import { getPlatformUser } from "../../../chatgpt-auth";
import { getDb } from "../../../../db";
import { localAccounts, profiles } from "../../../../db/schema";
import { getProfile } from "../../../../lib/profiles";
import { checkAuthRateLimit, createSession, hashPassword, isSameOriginRequest, parseUsername, passwordError, randomToken, sha256 } from "../../../../lib/local-auth";

export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) return Response.json({ error: "この操作はできません" }, { status: 403 });
  if (!await checkAuthRateLimit(request, "signup")) return Response.json({ error: "試行回数が多いため、少し待ってからお試しください" }, { status: 429 });
  let input: Record<string, unknown>;
  try { input = await request.json() as Record<string, unknown>; } catch { return Response.json({ error: "入力を確認してください" }, { status: 400 }); }
  const parsed = parseUsername(input.username);
  if (!parsed) return Response.json({ error: "ユーザー名は英数字・_・.・- の3〜24文字で入力してください" }, { status: 400 });
  const invalidPassword = passwordError(input.password, parsed.username);
  if (invalidPassword) return Response.json({ error: invalidPassword }, { status: 400 });
  const db = getDb();
  const [taken] = await db.select({ userId: localAccounts.userId }).from(localAccounts).where(eq(localAccounts.usernameKey, parsed.usernameKey)).limit(1);
  if (taken) return Response.json({ error: "このユーザー名は使用されています" }, { status: 409 });
  const platform = await getPlatformUser();
  const userId = platform?.userId ?? `local_${crypto.randomUUID()}`;
  const [alreadyLinked] = await db.select({ userId: localAccounts.userId }).from(localAccounts).where(eq(localAccounts.userId, userId)).limit(1);
  if (alreadyLinked) return Response.json({ error: "このマイページには既にユーザー名が登録されています" }, { status: 409 });
  const existingProfile = platform ? await getProfile(userId) : null;
  const password = await hashPassword(input.password as string);
  const recoveryCode = randomToken(24);
  const now = new Date().toISOString();
  const account = { userId, username: parsed.username, usernameKey: parsed.usernameKey, passwordHash: password.hash, passwordSalt: password.salt, recoveryHash: await sha256(recoveryCode), createdAt: now, updatedAt: now };
  try {
    if (existingProfile) await db.insert(localAccounts).values(account);
    else await db.batch([
      db.insert(profiles).values({ userId, displayName: parsed.username, bio: "", createdAt: now, updatedAt: now }),
      db.insert(localAccounts).values(account),
    ]);
  } catch {
    return Response.json({ error: "登録できませんでした。ユーザー名を変えてお試しください" }, { status: 409 });
  }
  const cookie = await createSession(userId, new URL(request.url).protocol === "https:");
  return Response.json({ userId, recoveryCode, linked: !!platform }, { status: 201, headers: { "Set-Cookie": cookie, "Cache-Control": "no-store" } });
}
