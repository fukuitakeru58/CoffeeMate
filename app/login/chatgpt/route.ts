import { headers } from "next/headers";
import { clearSessionCookie, deleteSession } from "../../../lib/local-auth";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const requested = searchParams.get("return_to") || "/";
  let returnTo = "/";
  if (requested.startsWith("/") && !requested.startsWith("//")) {
    try {
      const parsed = new URL(requested, "https://coffeemate.local");
      if (parsed.origin === "https://coffeemate.local" && !["/login", "/logout", "/onboarding"].includes(parsed.pathname)) returnTo = parsed.pathname + parsed.search + parsed.hash;
    } catch { /* use home */ }
  }
  await deleteSession((await headers()).get("cookie"));
  const destination = `/signin-with-chatgpt?return_to=${encodeURIComponent(returnTo)}`;
  return new Response(null, { status: 303, headers: { "Location": new URL(destination, request.url).toString(), "Set-Cookie": clearSessionCookie(new URL(request.url).protocol === "https:"), "Cache-Control": "no-store" } });
}
