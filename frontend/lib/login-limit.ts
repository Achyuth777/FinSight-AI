// Failed-sign-in throttling for the shared owner password.
// In memory, so it is per server process: it slows guessing against one instance but is not shared across instances
// or restarts. A durable limiter (database or edge store) is needed if the app is ever run on several instances.
const WINDOW_MS = 15 * 60 * 1000;
const PER_CLIENT_LIMIT = 5;
const GLOBAL_LIMIT = 50; // backstop when an attacker rotates client addresses
const MAX_TRACKED = 5000;

const failures = new Map<string, number[]>();
let globalFailures: number[] = [];

function recent(list: number[] | undefined, now: number) {
  return (list || []).filter((t) => now - t < WINDOW_MS);
}

// Address the platform reports. Behind a proxy that overwrites these headers (Vercel, most hosts) this is the client;
// with no proxy it can be spoofed, which is why the global backstop exists.
export function clientKey(headers: Headers) {
  const real = headers.get("x-real-ip");
  const forwarded = headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return (real || forwarded || "local").slice(0, 64);
}

// Seconds the caller must wait, or 0 when an attempt is allowed.
export function retryAfterSeconds(key: string, now = Date.now()) {
  const mine = recent(failures.get(key), now);
  const all = (globalFailures = recent(globalFailures, now));
  const waits: number[] = [];
  if (mine.length >= PER_CLIENT_LIMIT) waits.push(mine[0] + WINDOW_MS - now);
  if (all.length >= GLOBAL_LIMIT) waits.push(all[0] + WINDOW_MS - now);
  return waits.length ? Math.ceil(Math.max(...waits) / 1000) : 0;
}

export function recordFailure(key: string, now = Date.now()) {
  const mine = recent(failures.get(key), now);
  mine.push(now);
  failures.set(key, mine);
  globalFailures = recent(globalFailures, now);
  globalFailures.push(now);
  if (failures.size > MAX_TRACKED) {
    for (const [k, v] of failures) if (!recent(v, now).length) failures.delete(k);
    if (failures.size > MAX_TRACKED) failures.clear();
  }
}

export function recordSuccess(key: string) {
  failures.delete(key);
}
