import { NextRequest, NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/session";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;
async function forward(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  if (!(await isAuthenticated())) return NextResponse.json({ detail: "Sign in to use the workspace." }, { status: 401 });
  const base = process.env.API_URL || (process.env.NODE_ENV === "production" ? "" : "http://127.0.0.1:8000");
  const token = process.env.FINSIGHT_API_KEY || "";
  if (!base || (process.env.NODE_ENV === "production" && token.length < 32)) return NextResponse.json({ detail: "Backend connection is not configured." }, { status: 503 });
  let backend: URL;
  try {
    backend = new URL(base);
    if (backend.protocol !== "https:" && !(process.env.NODE_ENV !== "production" && backend.hostname === "127.0.0.1")) throw new Error("HTTPS required");
    if (backend.username || backend.password || backend.search || backend.hash) throw new Error("Invalid API base");
  } catch {
    return NextResponse.json({ detail: "Invalid backend configuration." }, { status: 503 });
  }
  const { path } = await context.params;
  if (!Array.isArray(path) || !path.length || path.some((part) => !/^[a-zA-Z0-9_-]{1,128}$/.test(part))) return NextResponse.json({ detail: "Invalid API path." }, { status: 400 });
  backend.pathname = backend.pathname.replace(/\/$/, "") + "/api/" + path.map(encodeURIComponent).join("/");
  backend.search = request.nextUrl.search;
  if (!["GET", "POST", "PATCH"].includes(request.method)) return NextResponse.json({ detail: "Method not allowed." }, { status: 405 });
  if (request.method !== "GET") {
    const origin = request.headers.get("origin");
    if (origin && origin !== request.nextUrl.origin) return NextResponse.json({ detail: "Invalid request origin." }, { status: 403 });
  }
  if (Number(request.headers.get("content-length") || 0) > 5500000) return NextResponse.json({ detail: "Request too large." }, { status: 413 });
  let body: ArrayBuffer | undefined;
  if (request.method !== "GET") {
    body = await request.arrayBuffer();
    if (body.byteLength > 5500000) return NextResponse.json({ detail: "Request too large." }, { status: 413 });
  }
  const headers: Record<string, string> = { Accept: request.headers.get("accept") || "application/json" };
  const contentType = request.headers.get("content-type");
  if (contentType) headers["Content-Type"] = contentType;
  if (token) headers["X-Finsight-API-Key"] = token;
  try {
    const upstream = await fetch(backend, { method: request.method, headers, body, cache: "no-store", signal: AbortSignal.timeout(55000) });
    const responseHeaders = new Headers({ "Cache-Control": "no-store" });
    const type = upstream.headers.get("content-type");
    const disposition = upstream.headers.get("content-disposition");
    if (type) responseHeaders.set("Content-Type", type);
    if (disposition) responseHeaders.set("Content-Disposition", disposition);
    return new Response(upstream.body, { status: upstream.status, headers: responseHeaders });
  } catch {
    return NextResponse.json({ detail: "Backend unavailable. Render may be waking up." }, { status: 502 });
  }
}
export { forward as GET, forward as POST, forward as PATCH };
