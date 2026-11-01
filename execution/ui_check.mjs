// Browser acceptance check for the FinSight frontend.
// Needs the API and the web app already running (see README) and a local Chrome or Edge.
// Usage: node execution/ui_check.mjs [--base http://127.0.0.1:3000] [--shots dir]
// Checks: horizontal overflow per route and viewport, evidence drawer behaviour,
// and the core journey (open transaction -> create case -> note -> status -> reload).
// Exits 1 if any check fails; writes .tmp/ui-check.json.
import { createRequire } from "node:module";
import { mkdirSync, writeFileSync } from "node:fs";
const { chromium } = createRequire(import.meta.url)("../frontend/node_modules/playwright-core");

const args = process.argv.slice(2);
const arg = (name, fallback) => (args.includes(name) ? args[args.indexOf(name) + 1] : fallback);
const base = arg("--base", "http://127.0.0.1:3000");
const shots = arg("--shots", "");
const only = arg("--only", ""); // overflow | drawer | journey
if (shots) mkdirSync(shots, { recursive: true });

const sections = ["overview", "transactions", "investigations", "network", "laboratory", "monitoring", "assistant"];
const routes = ["/", "/login", ...sections.map((s) => "/app/" + s)];
const widths = [360, 390, 768, 1024, 1440];
const results = [];
const record = (check, ok, detail = "") => {
  results.push({ check, ok, detail });
  console.log((ok ? "PASS " : "FAIL ") + check + (detail ? "  " + detail : ""));
};

async function launch() {
  for (const channel of ["chrome", "msedge"]) {
    try {
      return await chromium.launch({ channel });
    } catch {}
  }
  throw new Error("No local Chrome or Edge found for Playwright.");
}

// Make sure a run exists so every section renders populated data.
async function ensureRun(request) {
  const listing = await request.get(base + "/api/runs");
  if (!listing.ok()) throw new Error(`GET /api/runs returned HTTP ${listing.status()}; are the API and web app running?`);
  const runs = await listing.json();
  if (runs.length) return;
  const dataset = await (await request.post(base + "/api/datasets/demo")).json();
  await request.post(base + "/api/runs", { data: { dataset_id: dataset.id, trees: 100 } });
}

async function overflowChecks(browser) {
  for (const width of widths) {
    const context = await browser.newContext({ viewport: { width, height: 800 } });
    const page = await context.newPage();
    for (const route of routes) {
      const response = await page.goto(base + route, { waitUntil: "networkidle" });
      await page.waitForTimeout(1200);
      const { scroll, client } = await page.evaluate(() => ({
        scroll: document.documentElement.scrollWidth,
        client: document.documentElement.clientWidth,
      }));
      // An error page must never count as a pass.
      const status = response ? response.status() : 0;
      record(`overflow ${route} @${width}`, status < 400 && scroll <= client, `HTTP ${status}, scrollWidth ${scroll} vs ${client}`);
    }
    await context.close();
  }
}

async function drawerChecks(browser) {
  const context = await browser.newContext({ viewport: { width: 1024, height: 768 } });
  const page = await context.newPage();
  await page.goto(base + "/app/transactions", { waitUntil: "networkidle" });
  const opener = page.locator(".id-button").first();
  await opener.waitFor();
  await opener.focus();
  await opener.click();
  const dialog = page.getByRole("dialog");
  await dialog.waitFor();
  record("drawer opens and is labelled", (await dialog.getAttribute("aria-labelledby")) !== null);
  record("drawer takes focus", await page.evaluate(() => document.querySelector("[role=dialog]").contains(document.activeElement)));
  // The pinned action is "Create investigation", or "Open investigation" once the case exists.
  const create = page.locator(".drawer-actions").getByRole("button").or(page.locator(".drawer-actions a.button")).first();
  const box = await create.boundingBox();
  record("drawer: case action visible without scrolling @1024x768", !!box && box.y + box.height <= 768, box ? `bottom edge ${Math.round(box.y + box.height)}px` : "not found");
  if (shots) await page.screenshot({ path: `${shots}/21-drawer-desktop.png` });
  await page.keyboard.press("Escape");
  await dialog.waitFor({ state: "detached" });
  record("drawer closes on Escape and focus returns to opener", await opener.evaluate((el) => el === document.activeElement));
  await context.close();
}

async function journeyCheck(browser) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();
  try {
    await ensureRun(context.request);
    await page.goto(base + "/app/transactions", { waitUntil: "networkidle" });
    await page.locator(".id-button").first().click();
    const act = page.locator(".drawer-actions");
    const make = act.getByRole("button", { name: /create investigation/i });
    if (await make.count()) await make.click();
    await act.getByText(/in investigation/i).first().waitFor();
    record("journey: drawer stays open and shows the case status", await page.getByRole("dialog").isVisible());
    await page.goto(base + "/app/investigations", { waitUntil: "networkidle" });
    const note = "ui-check note " + Date.now();
    await page.locator("#note").fill(note);
    await page.getByRole("button", { name: /save note/i }).click();
    await page.getByText("Investigation updated.").waitFor();
    await page.locator("#decision").selectOption("reviewing");
    await page.getByText("Investigation updated.").waitFor();
    await page.reload({ waitUntil: "networkidle" });
    const persisted = await page.getByText(note).count();
    const status = await page.locator("#decision").inputValue();
    record("journey: case, note and status persist after reload", persisted > 0 && status === "reviewing", `note found ${persisted}, status ${status}`);
    if (shots) await page.screenshot({ path: `${shots}/22-investigations-after-reload.png` });
  } catch (e) {
    const notices = await page.locator(".notice").allInnerTexts().catch(() => []);
    if (shots) await page.screenshot({ path: `${shots}/22-journey-failure.png` });
    record("journey: case, note and status persist after reload", false, String(e.message).split("\n")[0] + " | page: " + page.url() + " | notices: " + JSON.stringify(notices));
  }
  await context.close();
}

const browser = await launch();
await ensureRun((await browser.newContext()).request);
if (!only || only === "overflow") await overflowChecks(browser);
if (!only || only === "drawer") await drawerChecks(browser);
if (!only || only === "journey") await journeyCheck(browser);
await browser.close();

const failed = results.filter((r) => !r.ok);
mkdirSync(".tmp", { recursive: true });
writeFileSync(".tmp/ui-check.json", JSON.stringify({ base, at: new Date().toISOString(), results }, null, 2));
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
process.exit(failed.length ? 1 : 0);
