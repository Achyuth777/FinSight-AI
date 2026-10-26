import { NextRequest, NextResponse } from "next/server";
import { canCreateSession, makeSession, sessionCookie, validateOwnerPassword } from "@/lib/session";
export const runtime = "nodejs";
export async function POST(request: NextRequest) {
  if (!canCreateSession()) return NextResponse.json({ error: "Workspace login is not configured." }, { status: 503 });
  const origin = request.headers.get("origin");
  if (origin && origin !== request.nextUrl.origin) return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  const body = await request.json().catch(() => null);
  if (!validateOwnerPassword(body?.password)) return NextResponse.json({ error: "Incorrect access password." }, { status: 401, headers: { "Cache-Control": "no-store" } });
  const response = NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  response.cookies.set(sessionCookie, makeSession(), { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "strict", path: "/", maxAge: 43200 });
  return response;
}
