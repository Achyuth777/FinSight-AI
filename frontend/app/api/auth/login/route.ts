import { NextRequest, NextResponse } from "next/server";
import { canCreateSession, isSameOrigin, makeSession, sessionCookie, validateOwnerPassword } from "@/lib/session";
import { clientKey, recordFailure, recordSuccess, retryAfterSeconds } from "@/lib/login-limit";
export const runtime = "nodejs";
export async function POST(request: NextRequest) {
  if (!canCreateSession()) return NextResponse.json({ error: "Workspace login is not configured." }, { status: 503 });
  if (!isSameOrigin(request)) return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  const key = clientKey(request.headers);
  const wait = retryAfterSeconds(key);
  if (wait > 0) {
    const minutes = Math.ceil(wait / 60);
    return NextResponse.json(
      { error: `Too many failed attempts. Try again in ${minutes} minute${minutes === 1 ? "" : "s"}.` },
      { status: 429, headers: { "Cache-Control": "no-store", "Retry-After": String(wait) } },
    );
  }
  const body = await request.json().catch(() => null);
  if (!validateOwnerPassword(body?.password)) {
    recordFailure(key);
    return NextResponse.json({ error: "Incorrect access password." }, { status: 401, headers: { "Cache-Control": "no-store" } });
  }
  recordSuccess(key);
  const response = NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  response.cookies.set(sessionCookie, makeSession(), { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "strict", path: "/", maxAge: 43200 });
  return response;
}
