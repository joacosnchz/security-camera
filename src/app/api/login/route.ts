import { NextRequest, NextResponse } from "next/server";
import { credentialsMatch, newSessionCookie, safeNextPath, SESSION_COOKIE } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const form = await request.formData();
  const username = form.get("username");
  const password = form.get("password");
  const next = safeNextPath(form.get("next")?.toString());

  if (typeof username !== "string" || typeof password !== "string" || !credentialsMatch(username, password)) {
    const location = `/login?error=1&next=${encodeURIComponent(next)}`;
    return new NextResponse(null, { status: 303, headers: { Location: location, "Cache-Control": "no-store" } });
  }

  const response = new NextResponse(null, { status: 303, headers: { Location: next, "Cache-Control": "no-store" } });
  const session = newSessionCookie();
  response.cookies.set(SESSION_COOKIE, session.value, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: session.maxAge,
  });
  return response;
}
