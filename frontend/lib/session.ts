import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

export const sessionCookie = "finsight_session";
const LIFETIME = 12 * 60 * 60 * 1000;

function secret() {
  const value = process.env.FINSIGHT_SESSION_SECRET || "";
  return value.length >= 32 ? value : null;
}
function digest(value: string, key: string) {
  return createHmac("sha256", key).update(value).digest("hex");
}
function equal(a: string, b: string) {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}
export function canCreateSession() {
  return Boolean(secret()) && (process.env.FINSIGHT_OWNER_PASSWORD || "").length >= 16;
}
export function validateOwnerPassword(value: unknown) {
  const password = process.env.FINSIGHT_OWNER_PASSWORD || "";
  return password.length >= 16 && typeof value === "string" && value.length <= 256 && equal(password, value);
}
export function makeSession() {
  const key = secret();
  if (!key) throw new Error("Session not configured");
  const timestamp = String(Date.now() + LIFETIME);
  return timestamp + "." + digest(timestamp, key);
}
export function verifySession(value?: string) {
  const key = secret();
  if (!value || !key) return false;
  const parsed = /^(\d{13})\.([a-f0-9]{64})$/.exec(value);
  if (!parsed) return false;
  const expiration = Number(parsed[1]);
  if (!Number.isSafeInteger(expiration) || expiration <= Date.now() || expiration > Date.now() + LIFETIME + 60000) return false;
  return equal(parsed[2], digest(parsed[1], key));
}
export async function isAuthenticated() {
  // Preserve the offline single-user local development workflow.
  if (process.env.NODE_ENV !== "production" && !process.env.FINSIGHT_OWNER_PASSWORD) return true;
  const jar = await cookies();
  return verifySession(jar.get(sessionCookie)?.value);
}
