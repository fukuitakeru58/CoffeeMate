import { headers } from "next/headers";
import { clearSessionCookie, deleteSession } from "../../lib/local-auth";

export async function GET(request: Request) {
  const requestHeaders = await headers();
  await deleteSession(requestHeaders.get("cookie"));
  return new Response(null, { status: 303, headers: { "Location": new URL("/", request.url).toString(), "Set-Cookie": clearSessionCookie(new URL(request.url).protocol === "https:"), "Cache-Control": "no-store" } });
}
