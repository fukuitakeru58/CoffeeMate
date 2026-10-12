import { headers } from "next/headers";
import { getPlatformUser } from "../chatgpt-auth";
import { clearSessionCookie, deleteSession } from "../../lib/local-auth";

export async function GET(request: Request) {
  const requestHeaders = await headers();
  await deleteSession(requestHeaders.get("cookie"));
  const platform = await getPlatformUser();
  const destination = platform ? "/signout-with-chatgpt?return_to=%2F" : "/";
  return new Response(null, { status: 303, headers: { "Location": new URL(destination, request.url).toString(), "Set-Cookie": clearSessionCookie(new URL(request.url).protocol === "https:"), "Cache-Control": "no-store" } });
}
