// Production-mode checks for sign-in, session expiry, security headers, third-party requests and layout shift.
// Needs a PRODUCTION web app (`next build && next start`) started with FINSIGHT_OWNER_PASSWORD and FINSIGHT_SESSION_SECRET,
// and the same two variables in this process's environment. The API need not be reachable: only the web layer is exercised.
// Usage: FINSIGHT_OWNER_PASSWORD=... FINSIGHT_SESSION_SECRET=... node execution/auth_check.mjs [--base http://127.0.0.1:3000]
// Exits 1 if any check fails.
import { createRequire } from "node:module";
import { createHmac } from "node:crypto";
const { chromium } = createRequire(import.meta.url)("../frontend/node_modules/playwright-core");

const args = process.argv.slice(2);
const base = args.includes("--base") ? args[args.indexOf("--base") + 1] : "http://127.0.0.1:3000";
const password = process.env.FINSIGHT_OWNER_PASSWORD || "";
const secret = process.env.FINSIGHT_SESSION_SECRET || "";
if (password.length < 16 || secret.length < 32) {
  console.error("Set FINSIGHT_OWNER_PASSWORD (16+ chars) and FINSIGHT_SESSION_SECRET (32+ chars) to the values the server was started with.");
  process.exit(2);
}
const results = [];
const record = (check, ok, detail = "") => {
  results.push({ check, ok });
  console.log((ok ? "PASS " : "FAIL ") + check + (detail ? "  " + detail : ""));
};
const cookieFor = (expiresAt) => {
  const stamp = String(expiresAt);
  return stamp + "." + createHmac("sha256", secret).update(stamp).digest("hex");
};

let browser;
for (const channel of ["chrome", "msedge"]) {
  try { browser = await chromium.launch({ channel }); break; } catch {}
}
if (!browser) throw new Error("No local Chrome or Edge found for Playwright.");

// Sign-in
{
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();
  await page.goto(base + "/login?next=/app/transactions", { waitUntil: "networkidle" });
  record("login: ?next= is announced", (await page.getByText("Sign in to continue to /app/transactions.").count()) === 1);
  await page.locator("#workspace-password").fill("x".repeat(20));
  await page.getByRole("button", { name: /continue/i }).click();
  await page.getByRole("alert").filter({ hasText: /incorrect/i }).waitFor();
  record("login: a wrong password is refused with an alert and aria-invalid", (await page.locator("#workspace-password").getAttribute("aria-invalid")) === "true");
  await page.locator("#workspace-password").fill(password);
  await page.getByRole("button", { name: /continue/i }).click();
  await page.waitForURL((u) => u.pathname === "/app/transactions");
  record("login: the right password returns to the page that was asked for", true);
  const cookie = (await context.cookies()).find((c) => c.name === "finsight_session");
  record("login: session cookie is httpOnly, Secure and SameSite=Strict", !!cookie && cookie.httpOnly && cookie.secure && cookie.sameSite === "Strict", JSON.stringify({ httpOnly: cookie?.httpOnly, secure: cookie?.secure, sameSite: cookie?.sameSite }));
  await context.close();
}

// Expiry and tampering
for (const [label, value] of [["an expired but correctly signed cookie", cookieFor(Date.now() - 60000)], ["a forged cookie", cookieFor(Date.now() + 3600000).replace(/.$/, (c) => (c === "0" ? "1" : "0"))]]) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  await context.addCookies([{ name: "finsight_session", value, url: base }]);
  const page = await context.newPage();
  await page.goto(base + "/app/transactions", { waitUntil: "networkidle" });
  const url = new URL(page.url());
  record(`session: ${label} is sent to sign-in with the return path`, url.pathname === "/login" && url.searchParams.get("next") === "/app/transactions", url.pathname + url.search);
  const api = await context.request.get(base + "/api/runs");
  record(`session: ${label} gets 401 from the API proxy`, api.status() === 401, "HTTP " + api.status());
  await context.close();
}
{
  const context = await browser.newContext();
  const r = await context.request.get(base + "/api/runs");
  record("session: no cookie gets 401 from the API proxy", r.status() === 401);
  await context.close();
}

// Headers
{
  const response = await fetch(base + "/");
  for (const [name, expect] of [["x-content-type-options", /nosniff/], ["x-frame-options", /DENY/], ["referrer-policy", /strict-origin/], ["content-security-policy", /frame-ancestors 'none'/]]) {
    record(`headers: ${name}`, expect.test(response.headers.get(name) || ""), response.headers.get(name) || "(none)");
  }
  record("headers: x-powered-by is not sent", !response.headers.get("x-powered-by"));
}

// Third-party requests, console errors and layout shift on public pages
for (const [route, width] of [["/", 375], ["/", 1440], ["/login", 375]]) {
  const context = await browser.newContext({ viewport: { width, height: 900 } });
  const page = await context.newPage();
  const external = [];
  const errors = [];
  page.on("request", (r) => { if (!r.url().startsWith(base) && !r.url().startsWith("data:")) external.push(r.url()); });
  page.on("console", (m) => m.type() === "error" && errors.push(m.text().slice(0, 100)));
  await page.addInitScript(() => {
    window.__cls = 0;
    new PerformanceObserver((list) => { for (const e of list.getEntries()) if (!e.hadRecentInput) window.__cls += e.value; }).observe({ type: "layout-shift", buffered: true });
  });
  await page.goto(base + route, { waitUntil: "networkidle" });
  await page.waitForTimeout(1000);
  const cls = await page.evaluate(() => window.__cls);
  record(`public ${route} @${width}: no third-party requests`, external.length === 0, external.join(" "));
  record(`public ${route} @${width}: no console errors`, errors.length === 0, errors.join(" | "));
  record(`public ${route} @${width}: layout shift under 0.1`, cls < 0.1, "CLS " + cls.toFixed(3));
  await context.close();
}

// Failed-attempt throttling. Each scenario uses its own reported client address so earlier checks are unaffected.
const attempt = (ip, pw) => fetch(base + "/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json", "x-real-ip": ip }, body: JSON.stringify({ password: pw }) });
const statuses = [];
for (let i = 0; i < 5; i++) statuses.push((await attempt("203.0.113.9", "wrong-password-" + i)).status);
record("throttle: five wrong passwords are each answered 401", statuses.every((s) => s === 401), statuses.join(","));
const locked = await attempt("203.0.113.9", password);
record("throttle: the sixth attempt is refused with 429 even with the right password", locked.status === 429, String(locked.status));
record("throttle: 429 carries Retry-After and no session cookie", Number(locked.headers.get("retry-after")) > 0 && !(locked.headers.get("set-cookie") || "").includes("finsight_session"), String(locked.headers.get("retry-after")));
const other = await attempt("203.0.113.10", password);
record("throttle: a different client address can still sign in", other.status === 200, String(other.status));

await browser.close();
const passed = results.filter((r) => r.ok).length;
console.log(`\n${passed}/${results.length} checks passed`);
process.exit(passed === results.length ? 0 : 1);
