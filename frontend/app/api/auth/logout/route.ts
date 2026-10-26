import { NextResponse } from "next/server";
import { sessionCookie } from "@/lib/session";
export async function POST() {
  const response = NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  response.cookies.delete(sessionCookie);
  return response;
}
