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

// J3: status in the header, selection survives a filter, a failed save keeps the note.
async function investigationChecks(browser) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();
  try {
    await page.goto(base + "/app/investigations", { waitUntil: "networkidle" });
    await page.locator("#decision").waitFor();
    const status = await page.locator("#decision").inputValue();
    const header = await page.getByText("Status: " + status).count();
    record("investigations: status shown in the case header", header > 0, "status " + status);
    const other = ["open", "reviewing", "cleared", "escalated"].find((s) => s !== status);
    await page.getByLabel("Case status filter").selectOption(other);
    record("investigations: selected case stays listed under a non-matching filter", (await page.locator(".case-item.selected").count()) === 1);
    await page.getByLabel("Case status filter").selectOption("all");
    const draft = "draft kept " + Date.now();
    await page.locator("#note").fill(draft);
    await page.route("**/api/cases/**", (r) => (r.request().method() === "PATCH" ? r.abort() : r.continue()));
    await page.getByRole("button", { name: /save note/i }).click();
    await page.getByRole("alert").first().waitFor();
    record("investigations: failed save keeps the typed note and shows the error", (await page.locator("#note").inputValue()) === draft);
  } catch (e) {
    record("investigations: J3 checks", false, String(e.message).split(String.fromCharCode(10))[0]);
  }
  await context.close();
}

// J1: import a CSV, analyze with defaults, land on flagged transactions with a factual summary.
async function onboardingCheck(browser) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();
  try {
    const head = "transaction_id,timestamp,account_id,device_id,merchant,amount,velocity_1h,account_age_days,distance_km";
    const lines = [head];
    for (let i = 0; i < 160; i++) {
      const ts = new Date(Date.UTC(2026, 9, 1, 0, i * 7)).toISOString();
      const odd = i % 40 === 39;
      lines.push([`UIC-${1000 + i}`, ts, `UIA-${i % 12}`, `UID-${i % 15}`, ["Alpha Store", "Beta Fuel", "Gamma Air"][i % 3], odd ? 90000 + i : 500 + ((i * 37) % 900), odd ? 15 : 1 + (i % 3), 30 + (i % 200), odd ? 900 : 5 + (i % 20)].join(","));
    }
    await page.goto(base + "/app/overview", { waitUntil: "networkidle" });
    await page.locator('input[aria-label="Import transaction CSV"]').setInputFiles({ name: "ui-check-" + Date.now() + ".csv", mimeType: "text/csv", buffer: Buffer.from(lines.join("\n")) });
    const analyze = page.getByRole("button", { name: /analyze with defaults/i }).first();
    await analyze.waitFor();
    record("onboarding: import leads to a single 'Analyze with defaults' step", true);
    await analyze.click();
    await page.waitForURL("**/app/transactions");
    await page.getByText(/Analysed .*160 rows, \d+ flagged for review/).first().waitFor();
    const risk = await page.getByLabel("Risk filter").inputValue();
    record("onboarding: lands on Transactions filtered to flagged, with a factual summary", risk === "flagged", "risk filter " + risk);
  } catch (e) {
    record("onboarding: J1 checks", false, String(e.message).split(String.fromCharCode(10))[0]);
  }
  await context.close();
}

// Experiments and Data checks: caveat, n and positives, unlabeled datasets, no duplicated metrics.
async function modelChecks(browser) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();
  try {
    await page.goto(base + "/app/laboratory", { waitUntil: "networkidle" });
    // Load a run of the labeled synthetic dataset from the history (the latest run may be an unlabeled import).
    await page.locator("tbody tr").filter({ hasText: "Synthetic payment sandbox" }).first().getByRole("button", { name: /load|selected/i }).click();
    await page.getByText(/^n = [\d,]+ held-out rows, [\d,]+ positives/).first().waitFor();
    record("experiments: held-out metrics show n and positives", true);
    record("experiments: synthetic caveat sits above the metrics", (await page.getByText(/Synthetic sample: labels come from simple generating rules/).count()) > 0);
    const plain = await page.locator("#dataset option").evaluateAll((os) => os.find((o) => /ui-check-/.test(o.textContent))?.value);
    if (plain) {
      await page.locator("#dataset").selectOption(plain);
      const note = await page.getByText(/Unavailable: this dataset has no is_fraud labels/).count();
      const disabled = await page.getByLabel(/Compare XGBoost/).isDisabled();
      record("experiments: XGBoost on an unlabeled dataset is explained before running", note > 0 && disabled);
    } else record("experiments: XGBoost on an unlabeled dataset is explained before running", false, "no unlabeled dataset available (run the onboarding check first)");
    await page.goto(base + "/app/monitoring", { waitUntil: "networkidle" });
    await page.getByText("Feature distribution drift").waitFor();
    record("data checks: metrics are not duplicated here", (await page.getByText("ROC-AUC").count()) === 0);
  } catch (e) {
    record("model checks", false, String(e.message).split(String.fromCharCode(10))[0]);
  }
  await context.close();
}

const browser = await launch();
await ensureRun((await browser.newContext()).request);
if (!only || only === "overflow") await overflowChecks(browser);
if (!only || only === "drawer") await drawerChecks(browser);
if (!only || only === "journey") await journeyCheck(browser);
if (!only || only === "journey" || only === "investigations") await investigationChecks(browser);
if (!only || only === "onboarding") await onboardingCheck(browser);
if (!only || only === "models") await modelChecks(browser);
await browser.close();

const failed = results.filter((r) => !r.ok);
mkdirSync(".tmp", { recursive: true });
writeFileSync(".tmp/ui-check.json", JSON.stringify({ base, at: new Date().toISOString(), results }, null, 2));
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
process.exit(failed.length ? 1 : 0);
