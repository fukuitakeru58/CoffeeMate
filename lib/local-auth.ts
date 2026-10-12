import { and, eq, gt, lt, sql } from "drizzle-orm";
import { getDb } from "../db";
import { authThrottles, localAccounts, localSessions } from "../db/schema";

export const SESSION_COOKIE = "coffeemate_session";
const SESSION_AGE_SECONDS = 60 * 60 * 24 * 30;
// Cloudflare Workers supports at most 100,000 PBKDF2 iterations per call.
const PASSWORD_ITERATIONS = 100_000;

export function parseUsername(value: unknown) {
  if (typeof value !== "string") return null;
  const username = value.trim();
  return /^[A-Za-z0-9_.-]{3,24}$/.test(username) ? { username, usernameKey: username.toLowerCase() } : null;
}

export function passwordError(value: unknown) {
  if (typeof value !== "string") return "パスワードを入力してください";
  const length = Array.from(value).length;
  if (length < 8 || length > 128) return "パスワードは8〜128文字にしてください";
  if (!value.trim()) return "空白だけのパスワードは使えません";
  return null;
}

function toBase64Url(bytes: Uint8Array) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(value: string) {
  const binary = atob(value.replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

export function randomToken(length = 32) { return toBase64Url(crypto.getRandomValues(new Uint8Array(length))); }

export async function sha256(value: string) {
  const hash = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)));
  return Array.from(hash, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function hashPassword(password: string, existingSalt?: string) {
  const salt = existingSalt ?? randomToken(16);
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]);
  const hash = await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt: fromBase64Url(salt), iterations: PASSWORD_ITERATIONS }, key, 256);
  return { salt, hash: toBase64Url(new Uint8Array(hash)) };
}

export async function verifyPassword(password: string, salt: string, expected: string) {
  const actual = (await hashPassword(password, salt)).hash;
  if (actual.length !== expected.length) return false;
  let difference = 0;
  for (let index = 0; index < actual.length; index++) difference |= actual.charCodeAt(index) ^ expected.charCodeAt(index);
  return difference === 0;
}

export async function slowUnknownPassword(password: string) {
  await hashPassword(password, "AAAAAAAAAAAAAAAAAAAAAA");
}

export function readSessionToken(cookieHeader: string | null) {
  const match = cookieHeader?.match(/(?:^|;\s*)coffeemate_session=([A-Za-z0-9_-]{43})/);
  return match?.[1] ?? null;
}

export function sessionCookie(token: string, secure: boolean) {
  return `${SESSION_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${SESSION_AGE_SECONDS}${secure ? "; Secure" : ""}`;
}

export function clearSessionCookie(secure: boolean) {
  return `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure ? "; Secure" : ""}`;
}

export async function createSession(userId: string, secure: boolean) {
  const token = randomToken();
  const now = new Date();
  await getDb().delete(localSessions).where(lt(localSessions.expiresAt, now.toISOString()));
  await getDb().insert(localSessions).values({ tokenHash: await sha256(token), userId, createdAt: now.toISOString(), expiresAt: new Date(now.getTime() + SESSION_AGE_SECONDS * 1000).toISOString() });
  return sessionCookie(token, secure);
}

export async function getLocalIdentity(cookieHeader: string | null) {
  const token = readSessionToken(cookieHeader);
  if (!token) return null;
  const db = getDb();
  const [session] = await db.select({ userId: localSessions.userId }).from(localSessions).where(and(eq(localSessions.tokenHash, await sha256(token)), gt(localSessions.expiresAt, new Date().toISOString()))).limit(1);
  if (!session) return null;
  const [account] = await db.select({ username: localAccounts.username }).from(localAccounts).where(eq(localAccounts.userId, session.userId)).limit(1);
  return account ? { userId: session.userId, username: account.username } : null;
}

export async function getLocalUsername(userId: string) {
  const [account] = await getDb().select({ username: localAccounts.username }).from(localAccounts).where(eq(localAccounts.userId, userId)).limit(1);
  return account?.username ?? null;
}

export async function deleteSession(cookieHeader: string | null) {
  const token = readSessionToken(cookieHeader);
  if (token) await getDb().delete(localSessions).where(eq(localSessions.tokenHash, await sha256(token)));
}

export function isSameOriginRequest(request: Request) {
  const origin = request.headers.get("origin");
  return !origin || origin === new URL(request.url).origin || request.headers.get("sec-fetch-site") === "same-origin";
}

export async function checkAuthRateLimit(request: Request, action: "signup" | "login" | "recover") {
  const ip = request.headers.get("cf-connecting-ip");
  if (!ip) return true;
  const now = Date.now();
  const bucket = Math.floor(now / (15 * 60_000));
  const bucketKey = await sha256(`${action}:${ip}:${bucket}`);
  const db = getDb();
  const nowIso = new Date(now).toISOString();
  await db.delete(authThrottles).where(lt(authThrottles.expiresAt, nowIso));
  await db.insert(authThrottles).values({ bucketKey, attempts: 1, expiresAt: new Date((bucket + 2) * 15 * 60_000).toISOString() }).onConflictDoUpdate({ target: authThrottles.bucketKey, set: { attempts: sql`${authThrottles.attempts} + 1` } });
  const [record] = await db.select({ attempts: authThrottles.attempts }).from(authThrottles).where(eq(authThrottles.bucketKey, bucketKey)).limit(1);
  const maximum = action === "login" ? 40 : 20;
  return (record?.attempts ?? 0) <= maximum;
}
