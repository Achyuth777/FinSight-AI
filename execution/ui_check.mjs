// Browser acceptance check for the FinSight frontend.
// Needs the API and the web app already running (see README) and a local Chrome or Edge.
// Usage: node execution/ui_check.mjs [--base http://127.0.0.1:3000] [--shots dir]
// Checks: horizontal overflow per route and viewport, evidence drawer behaviour,
// and the core journey (open transaction -> create case -> note -> status -> reload).
// Exits 1 if any check fails; writes .tmp/ui-check.json.
import { createRequire } from "node:module";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
const { chromium } = createRequire(import.meta.url)("../frontend/node_modules/playwright-core");

const args = process.argv.slice(2);
const arg = (name, fallback) => (args.includes(name) ? args[args.indexOf(name) + 1] : fallback);
const base = arg("--base", "http://127.0.0.1:3000");
const shots = arg("--shots", "");
const only = arg("--only", ""); // overflow | drawer | journey | investigations | onboarding | transactions | models | motion | a11y | worst | consistency
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

// Motion: sheets survive rapid toggling, keyboard opens skip animation, reduced motion keeps no movement, no stuck overlay.
async function motionChecks(browser) {
  const visit = async (width, height, reducedMotion = "no-preference") => {
    const context = await browser.newContext({ viewport: { width, height }, reducedMotion });
    const page = await context.newPage();
    await page.goto(base + "/app/transactions", { waitUntil: "networkidle" });
    await page.locator(".id-button").first().waitFor();
    return { context, page };
  };
  const pressTransform = async (page) => {
    const button = page.locator(".button:not(:disabled)").first();
    const box = await button.boundingBox();
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.waitForTimeout(250);
    const value = await button.evaluate((el) => getComputedStyle(el).transform);
    await page.mouse.up();
    return value;
  };
  const settled = (page) => page.waitForFunction(() => document.getAnimations().every((a) => a.playState !== "running"));
  for (const [width, height] of [[1024, 768], [390, 844]]) {
    const { context, page } = await visit(width, height);
    const opener = page.locator(".id-button").first();
    await opener.focus();
    for (let i = 0; i < 8; i++) {
      await page.keyboard.press("Enter");
      await page.getByRole("dialog").first().waitFor();
      await page.keyboard.press("Escape");
      await page.waitForTimeout(60); // a fast human cadence; history.back() settles within a frame
    }
    await page.waitForTimeout(300);
    record(`motion: 8 rapid keyboard open/close cycles leave no sheet or overlay @${width}`, (await page.locator(".dialog-overlay, [role=dialog]").count()) === 0);
    record(`motion: focus returns to the row button after rapid cycles @${width}`, await page.evaluate(() => document.activeElement?.classList.contains("id-button")));
    await opener.click();
    await page.getByRole("dialog").waitFor();
    await page.keyboard.press("Escape");
    await page.locator(".dialog-overlay").waitFor({ state: "detached" });
    for (let i = 0; i < 5; i++) {
      await opener.click({ force: true });
      await page.getByRole("dialog").first().waitFor();
      await page.keyboard.press("Escape");
      await page.waitForTimeout(60); // a fast human cadence; history.back() settles within a frame
    }
    await page.waitForTimeout(300);
    record(`motion: 5 rapid pointer open/close cycles leave no overlay @${width}`, (await page.locator(".dialog-overlay").count()) === 0);
    await opener.click();
    await page.getByRole("dialog").waitFor();
    await settled(page);
    record(`motion: sheet rests at its final position and full opacity @${width}`, await page.evaluate(() => { const s = getComputedStyle(document.querySelector(".sheet")); return s.opacity === "1" && (s.transform === "none" || s.transform === "matrix(1, 0, 0, 1, 0, 0)"); }));
    record(`motion: no horizontal overflow with sheet open @${width}`, await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth));
    await context.close();
  }
  {
    const { context, page } = await visit(1024, 768);
    record("motion: a pressed button scales to 0.97", (await pressTransform(page)) === "matrix(0.97, 0, 0, 0.97, 0, 0)");
    const opener = page.locator(".id-button").first();
    await opener.focus();
    await page.keyboard.press("Enter");
    await page.getByRole("dialog").waitFor();
    const keyboardMs = await page.evaluate(() => parseFloat(getComputedStyle(document.querySelector(".sheet")).animationDuration) * 1000);
    await page.keyboard.press("Escape");
    await page.locator(".dialog-overlay").waitFor({ state: "detached" });
    await opener.click();
    await page.getByRole("dialog").waitFor();
    const pointerMs = await page.evaluate(() => parseFloat(getComputedStyle(document.querySelector(".sheet")).animationDuration) * 1000);
    record("motion: keyboard open is effectively instant, pointer open eases in", keyboardMs <= 1 && pointerMs >= 150 && pointerMs <= 200, `keyboard ${keyboardMs}ms, pointer ${pointerMs}ms`);
    await context.close();
  }
  {
    const { context, page } = await visit(1024, 768, "reduce");
    await page.locator(".id-button").first().click();
    await page.getByRole("dialog").waitFor();
    const names = await page.evaluate(() => document.getAnimations().map((a) => a.animationName || "").filter(Boolean));
    record("motion: reduced motion keeps fades and drops sheet travel", names.length > 0 && names.every((n) => n.startsWith("fade")), names.join(","));
    await page.keyboard.press("Escape");
    await page.locator(".dialog-overlay").waitFor({ state: "detached" });
    record("motion: reduced motion still unmounts the sheet after closing", (await page.getByRole("dialog").count()) === 0);
    record("motion: reduced motion drops press scale", (await pressTransform(page)) === "none");
    await context.close();
  }
  {
    const { context, page } = await visit(1440, 900);
    await page.goto(base + "/app/overview", { waitUntil: "networkidle" });
    await page.waitForTimeout(600);
    const looping = await page.evaluate(() => document.getAnimations().filter((a) => a.effect?.getComputedTiming().iterations === Infinity).length);
    record("motion: no looping animation on a settled overview", looping === 0, `${looping} looping`);
    await context.close();
  }
}

// Accessibility: axe (WCAG 2.x A/AA + best practice) on every workspace route and key states; visible keyboard focus.
async function a11yChecks(browser) {
  const axeSource = readFileSync(new URL("../frontend/node_modules/axe-core/axe.min.js", import.meta.url), "utf8");
  const scan = async (page, label) => {
    await page.addScriptTag({ content: axeSource });
    const found = await page.evaluate(async () => {
      const r = await axe.run(document, { runOnly: ["wcag2a", "wcag2aa", "wcag21aa", "best-practice"] });
      return r.violations.map((v) => v.id + "(" + v.nodes.length + "): " + v.nodes[0].target.join(" ").slice(0, 60));
    });
    record(`a11y: ${label} has no axe violations`, found.length === 0, found.join(" | "));
  };
  const json = (body, status = 200) => (r) => r.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) });
  const visit = async (browser, width, path, setup) => {
    const context = await browser.newContext({ viewport: { width, height: 900 } });
    await ensureRun(context.request);
    const page = await context.newPage();
    if (setup) await setup(page);
    await page.goto(base + path, { waitUntil: "networkidle" });
    await page.waitForTimeout(500);
    return { context, page };
  };
  for (const s of sections) {
    const { context, page } = await visit(browser, 1280, "/app/" + s);
    await scan(page, s + " @1280");
    await context.close();
  }
  for (const [width, label] of [[1440, "docked evidence pane @1440"], [768, "evidence sheet @768"], [390, "evidence sheet @390"]]) {
    const { context, page } = await visit(browser, width, "/app/transactions");
    await page.locator(".id-button").first().click();
    await page.locator(width >= 1100 ? ".tx-pane" : "[role=dialog]").waitFor();
    await page.waitForFunction(() => document.getAnimations().every((a) => a.playState !== "running"));
    await scan(page, label);
    await context.close();
  }
  {
    const { context, page } = await visit(browser, 1280, "/app/assistant");
    await page.locator(".suggestions button").first().click();
    await page.waitForTimeout(800);
    await scan(page, "evidence search results @1280");
    await context.close();
  }
  for (const [route, width] of [["/", 375], ["/", 1280], ["/login", 375], ["/login", 1280]]) {
    const { context, page } = await visit(browser, width, route);
    await scan(page, `${route} @${width}`);
    await context.close();
  }
  {
    const { context, page } = await visit(browser, 375, "/app/assistant");
    await page.locator("#evidence-query").fill("A".repeat(290));
    await page.getByRole("button", { name: /search/i }).first().click();
    await page.waitForTimeout(800);
    record("evidence search: a 290-character query does not overflow @375", await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth));
    await scan(page, "evidence search with a long query @375");
    await context.close();
  }
  for (const [label, setup] of [
    ["server error state", (page) => page.route("**/api/runs", json({ detail: "boom" }, 500))],
    ["session-ended state", (page) => page.route("**/api/runs", json({ detail: "Sign in to use the workspace." }, 401))],
    ["empty workspace state", async (page) => { await page.route("**/api/runs", json([])); await page.route("**/api/datasets", json([])); await page.route("**/api/cases", json([])); }],
  ]) {
    const { context, page } = await visit(browser, 1280, "/app/overview", setup);
    await scan(page, label);
    await context.close();
  }
  {
    const { context, page } = await visit(browser, 1280, "/app/transactions");
    const stops = [];
    for (let i = 0; i < 14; i++) {
      await page.keyboard.press("Tab");
      stops.push(await page.evaluate(() => {
        const el = document.activeElement;
        if (!el || el === document.body) return "body";
        const s = getComputedStyle(el);
        const ring = (s.outlineStyle !== "none" && parseFloat(s.outlineWidth) > 0) || (s.boxShadow && s.boxShadow !== "none");
        return ring ? "" : (el.tagName + "." + el.className).slice(0, 40);
      }));
    }
    const bad = stops.filter(Boolean);
    record("a11y: the first 14 Tab stops on Transactions all show a focus indicator", bad.length === 0, bad.join(", "));
    await context.close();
  }
}

// Worst-case data: long unbroken labels, huge/zero/negative amounts, 1-day age. Injected into the real /api/runs response.
async function worstCaseChecks(browser) {
  const longId = "WORST-" + "X".repeat(70);
  for (const width of [375, 768, 1280, 1440]) {
    const context = await browser.newContext({ viewport: { width, height: 900 } });
    await ensureRun(context.request);
    const page = await context.newPage();
    await page.route(/\/api\/runs\/[^/?]+$/, async (route) => {
      const response = await route.fetch();
      const run = await response.json();
      const tx = run.transactions;
      Object.assign(tx[0], { transaction_id: longId, account_id: "ACC-" + "9".repeat(40), device_id: "DEV-" + "8".repeat(40), merchant: "Extraordinarily-Long-Merchant-Name-With-No-Break-Opportunities".repeat(2).slice(0, 150), amount: 98765432109.5, account_age_days: 1, risk_score: 99.9, flagged: true });
      Object.assign(tx[1], { transaction_id: "WORST-ZERO", amount: 0 });
      Object.assign(tx[2], { transaction_id: "WORST-NEG", amount: -45.5 });
      await route.fulfill({ response, json: run });
    });
    await page.goto(base + "/app/transactions?q=WORST", { waitUntil: "networkidle" });
    await page.locator(".id-button").first().waitFor();
    const rows = await page.locator(".id-button").count();
    record(`worst case: long, zero and negative rows all render @${width}`, rows === 3, `${rows} rows`);
    record(`worst case: no horizontal overflow in the list @${width}`, await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth));
    if (width >= 720) {
      record(`worst case: the ID cell does not run under the amount (and the table fits at 1280+) @${width}`, await page.evaluate((id) => {
        const row = [...document.querySelectorAll(".tx-table tbody tr")].find((r) => r.textContent.includes(id));
        const a = row.querySelector(".c-id").getBoundingClientRect();
        const b = row.querySelector(".c-amount").getBoundingClientRect();
        const scroller = document.querySelector(".table-scroll");
        return (innerWidth < 1280 || scroller.scrollWidth <= scroller.clientWidth + 1) && [...row.querySelectorAll(".c-id button, .c-id small")].every((e) => e.getBoundingClientRect().right <= b.left + 1) && a.right <= b.left + 1;
      }, longId));
    }
    await page.locator(".id-button", { hasText: "X".repeat(20) }).first().click();
    await page.locator(width >= 1100 ? ".tx-pane" : "[role=dialog]").waitFor();
    await page.waitForFunction(() => document.getAnimations().every((a) => a.playState !== "running"));
    record(`worst case: evidence has no horizontal overflow @${width}`, await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth));
    record(`worst case: evidence content stays inside its container @${width}`, await page.evaluate(() => {
      const box = document.querySelector(".tx-pane, .sheet").getBoundingClientRect();
      return [...document.querySelectorAll(".tx-pane *, .sheet *")].every((e) => { const r = e.getBoundingClientRect(); return !r.width || (r.right <= box.right + 1 && r.left >= box.left - 1); });
    }));
    record(`worst case: sticky action bar is flush with the bottom of its container @${width}`, await page.evaluate(() => {
      const box = document.querySelector(".tx-pane, .sheet");
      box.scrollTop = 120;
      const bar = box.querySelector(".drawer-actions").getBoundingClientRect();
      const edge = box.getBoundingClientRect();
      return Math.abs(bar.bottom - (edge.bottom - parseFloat(getComputedStyle(box).borderBottomWidth))) <= 1.5;
    }));
    record(`worst case: "1 day" is singular @${width}`, (await page.getByText("1 day", { exact: true }).count()) === 1);
    await context.close();
  }
  {
    const context = await browser.newContext({ viewport: { width: 768, height: 900 } });
    await ensureRun(context.request);
    const page = await context.newPage();
    await page.goto(base + "/app/transactions", { waitUntil: "networkidle" });
    await page.locator(".id-button").first().waitFor();
    record("tablet: the transaction table fits at 768 with ordinary data (no sideways scroll)", await page.evaluate(() => { const s = document.querySelector(".table-scroll"); return s.scrollWidth <= s.clientWidth + 1; }));
    await context.close();
  }
  for (const width of [360, 375, 390, 768, 1280]) {
    const context = await browser.newContext({ viewport: { width, height: 900 } });
    await ensureRun(context.request);
    const page = await context.newPage();
    await page.goto(base + "/app/overview", { waitUntil: "networkidle" });
    await page.locator(".stat-value").first().waitFor();
    const split = await page.evaluate(() => [...document.querySelectorAll(".stat-value")].filter((e) => e.getBoundingClientRect().height > parseFloat(getComputedStyle(e).fontSize) * 1.15 * 1.5).map((e) => e.textContent));
    record(`overview: every headline figure stays on one line @${width}`, split.length === 0, split.join(" | "));
    await context.close();
  }
}

// Consistency: type floor and one table-header style across every workspace table.
async function consistencyChecks(browser) {
  for (const width of [375, 1440]) {
    const context = await browser.newContext({ viewport: { width, height: 900 } });
    await ensureRun(context.request);
    const page = await context.newPage();
    const small = [];
    const headers = new Set();
    for (const s of sections) {
      await page.goto(base + "/app/" + s, { waitUntil: "networkidle" });
      await page.waitForTimeout(300);
      const found = await page.evaluate(() => {
        const visible = (e) => e.getBoundingClientRect().width > 0 && !e.closest("nextjs-portal");
        const tiny = [...document.querySelectorAll("body *")].filter((e) => visible(e) && [...e.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim()) && parseFloat(getComputedStyle(e).fontSize) < 11).map((e) => e.tagName.toLowerCase() + "." + (e.className || "") + ":" + e.textContent.trim().slice(0, 20));
        const th = [...document.querySelectorAll("th")].filter((e) => visible(e) && !e.classList.contains("sr-only")).map((e) => { const c = getComputedStyle(e); return c.fontSize + "/" + c.fontWeight + "/" + c.color; });
        return { tiny, th };
      });
      small.push(...found.tiny.map((x) => s + " " + x));
      found.th.forEach((x) => headers.add(x));
    }
    record(`consistency: no workspace text under 11px @${width}`, small.length === 0, small.slice(0, 3).join(" | "));
    record(`consistency: every table header shares one size, weight and colour @${width}`, headers.size === 1, [...headers].join(" | "));
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
    await act.waitFor();
    const make = act.getByRole("button", { name: /create investigation/i });
    if (await make.count()) await make.click();
    await act.getByText(/in investigation/i).first().waitFor();
    record("journey: evidence pane stays open and shows the case status", await page.locator(".tx-pane").isVisible());
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
    const items = page.locator(".case-item");
    if ((await items.count()) > 1) {
      await items.nth(1).click();
      const picked = await page.locator(".case-detail h2").first().innerText();
      await page.reload({ waitUntil: "networkidle" });
      record("investigations: the selected case survives a reload (?case=)", (await page.locator(".case-detail h2").first().innerText()) === picked && /case=/.test(page.url()));
      const idLine = await page.locator(".case-item.selected").count();
      record("investigations: list marks the selected case", idLine === 1);
    }
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
    const risk = await page.getByLabel("Anomaly level").inputValue();
    record("onboarding: lands on Transactions filtered to flagged, with a factual summary", risk === "flagged", "risk filter " + risk);
  } catch (e) {
    record("onboarding: J1 checks", false, String(e.message).split(String.fromCharCode(10))[0]);
  }
  await context.close();
}

// Transactions screen: docked pane with keyboard, sheet on tablets, cards on phones, filter states.
async function transactionChecks(browser) {
  const open = async (width, height) => {
    const context = await browser.newContext({ viewport: { width, height } });
    const page = await context.newPage();
    await page.goto(base + "/app/transactions", { waitUntil: "networkidle" });
    await page.locator(".id-button").first().waitFor();
    return { context, page };
  };
  try {
    let { context, page } = await open(1440, 900);
    const first = page.locator(".id-button").first();
    await first.focus();
    await page.keyboard.press("Enter");
    await page.locator(".tx-pane").waitFor();
    record("transactions: Enter opens the docked evidence pane and focuses its heading", await page.evaluate(() => document.activeElement?.id === "evidence-title"));
    record("transactions: no horizontal overflow with the pane docked @1440", await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth));
    await page.keyboard.press("Escape");
    await page.locator(".tx-pane").waitFor({ state: "detached" });
    record("transactions: Escape closes the pane and focus returns to the row", await page.evaluate(() => document.activeElement?.classList.contains("id-button")));
    await page.getByLabel("Search", { exact: true }).fill("zzz-no-such-thing");
    await page.getByText("No transactions match these filters.").waitFor();
    await page.getByRole("button", { name: "Clear filters" }).last().click();
    await page.locator(".id-button").first().waitFor();
    record("transactions: empty filter result offers Clear filters and recovers", true);
    await page.getByLabel("Min amount (INR)").fill("-5");
    record("transactions: invalid minimum amount is reported", (await page.getByText("Enter 0 or more.").count()) === 1);
    await context.close();
    ({ context, page } = await open(1024, 768));
    await page.locator(".id-button").first().click();
    await page.getByRole("dialog").waitFor();
    await page.keyboard.press("Escape");
    await page.getByRole("dialog").waitFor({ state: "detached" });
    record("transactions: evidence is a modal sheet below 1100px and closes on Escape", true);
    await context.close();
    ({ context, page } = await open(390, 844));
    record("transactions: phone cards do not overflow @390", await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth));
    await page.locator(".id-button").first().click();
    await page.getByRole("dialog").waitFor();
    await page.waitForFunction(() => document.getAnimations().every((a) => a.playState !== "running"));
    const box = await page.locator(".drawer-actions").first().boundingBox();
    record("transactions: phone sheet keeps its action visible", !!box && box.y + box.height <= 844);
    await context.close();
  } catch (e) {
    record("transactions: screen checks", false, String(e.message).split(String.fromCharCode(10))[0]);
  }
}

// Overview, URL state and session expiry: links do what they say, refresh and Back behave, 401 is explained.
async function routeChecks(browser) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  try {
    await page.goto(base + "/app/overview", { waitUntil: "networkidle" });
    await page.locator(".stat").first().waitFor();
    record("overview: four stats, no decorative arrows", (await page.locator(".stat").count()) === 4);
    await page.locator(".stat.is-link").first().click();
    await page.waitForURL("**/app/transactions");
    await page.locator(".id-button").first().waitFor();
    record("overview: 'Flagged for review' opens Transactions filtered to flagged", (await page.getByLabel("Anomaly level").inputValue()) === "flagged");
    const id = await page.locator(".id-button").first().innerText();
    await page.locator(".id-button").first().click();
    await page.waitForURL(/tx=/);
    await page.reload({ waitUntil: "networkidle" });
    await page.locator(".tx-pane").waitFor();
    record("routes: ?tx= reopens the evidence after a reload", (await page.locator(".tx-pane #evidence-title").innerText()) === id);
    await page.goBack();
    await page.locator(".tx-pane").waitFor({ state: "detached" });
    record("routes: Back closes the evidence pane", !/tx=/.test(page.url()));
    await page.goForward();
    await page.locator(".tx-pane").waitFor();
    record("routes: Forward reopens it", /tx=/.test(page.url()));
    await page.goto(base + "/app/transactions?tx=NOT-A-REAL-ID", { waitUntil: "networkidle" });
    record("routes: unknown ?tx= explains itself", (await page.getByText(/is not in run/).count()) > 0);
    await page.route("**/api/runs", (r) => r.fulfill({ status: 401, contentType: "application/json", body: JSON.stringify({ detail: "Sign in to use the workspace." }) }));
    await page.goto(base + "/app/overview", { waitUntil: "networkidle" });
    await page.getByText(/Your session ended/).waitFor();
    const href = await page.getByRole("link", { name: "Sign in again" }).getAttribute("href");
    record("session: 401 shows a sign-in link that returns to this page", href === "/login?next=%2Fapp%2Foverview", href || "");
  } catch (e) {
    record("routes: overview, URL state and session checks", false, String(e.message).split(String.fromCharCode(10))[0]);
  }
  await context.close();
}

// Linked accounts and Evidence search: controls work, state is in the URL, phones get the table not the graph.
async function exploreChecks(browser) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  try {
    await page.goto(base + "/app/network", { waitUntil: "networkidle" });
    await page.locator(".stat").first().waitFor();
    const options = await page.locator("#entity option").evaluateAll((os) => os.map((o) => o.value));
    const other = options[options.length - 1];
    await page.locator("#entity").selectOption(other);
    await page.reload({ waitUntil: "networkidle" });
    record("linked accounts: chosen account survives a reload (?account=)", (await page.locator("#entity").inputValue()) === other && /account=/.test(page.url()));
    const link = page.locator(".link-table .id-button").first();
    if (await link.count()) {
      const name = await link.innerText();
      await link.click();
      await page.waitForFunction((n) => document.querySelector("#entity")?.value === n, name);
      record("linked accounts: a linked account in the table becomes the selected account", true);
    } else record("linked accounts: an account without links says so", (await page.getByText(/shares no device/).count()) > 0);
    await page.goto(base + "/app/assistant", { waitUntil: "networkidle" });
    await page.locator(".suggestions button").first().click();
    await page.locator(".source").first().waitFor();
    record("evidence search: an example runs the search and cites results", /q=/.test(page.url()));
    await page.locator(".source").first().click();
    await page.getByRole("dialog").waitFor();
    record("evidence search: a result opens its transaction evidence", true);
    await page.keyboard.press("Escape");
    await page.reload({ waitUntil: "networkidle" });
    await page.locator(".source").first().waitFor();
    record("evidence search: ?q= re-runs the search after a reload", true);
    await page.getByLabel("Search", { exact: true }).fill("zzzzqqq-nothing");
    await page.getByRole("button", { name: "Search", exact: true }).click();
    await page.getByText(/No matching evidence/).waitFor();
    record("evidence search: no match is stated plainly", true);
    const phone = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const pp = await phone.newPage();
    await pp.goto(base + "/app/network", { waitUntil: "networkidle" });
    record("linked accounts: phone shows the table, not the graph", !(await pp.locator(".network-canvas").first().isVisible().catch(() => false)));
    await phone.close();
  } catch (e) {
    record("explore: linked accounts and evidence search", false, String(e.message).split(String.fromCharCode(10))[0]);
  }
  await context.close();
}

// First-run, slow and failing states, simulated at the network layer so the user's data is untouched.
async function stateChecks(browser) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();
  try {
    const json = (body, status = 200) => (r) => r.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) });
    await page.route("**/api/runs", json([]));
    await page.route("**/api/datasets", json([]));
    await page.route("**/api/cases", json([]));
    for (const section of ["overview", "transactions", "network", "assistant", "monitoring"]) {
      await page.goto(base + "/app/" + section, { waitUntil: "networkidle" });
      const ok = (await page.getByRole("heading", { name: "No data yet" }).count()) === 1 && (await page.getByRole("button", { name: /load synthetic sample/i }).count()) === 1;
      record("empty state S0 on " + section + ": one explanation and the two first choices", ok);
    }
    await page.unroute("**/api/runs");
    await page.route("**/api/runs", async (r) => { await new Promise((x) => setTimeout(x, 1500)); r.fulfill({ status: 200, contentType: "application/json", body: "[]" }); });
    await page.goto(base + "/app/overview", { waitUntil: "domcontentloaded" });
    await page.locator(".page-skeleton").waitFor({ timeout: 5000 });
    record("slow request: overview shows a loading skeleton", true);
    await page.unroute("**/api/runs");
    await page.route("**/api/runs", json({ detail: "boom" }, 500));
    await page.goto(base + "/app/overview", { waitUntil: "networkidle" });
    record("server error: message and Retry are shown", (await page.getByText("boom").count()) > 0 && (await page.getByRole("button", { name: "Retry" }).count()) > 0);
    await page.goto(base + "/login", { waitUntil: "networkidle" });
    await page.route("**/api/auth/login", json({ error: "Workspace login is not configured." }, 503));
    await page.getByLabel("Workspace password").fill("sixteen-chars-pass");
    await page.getByRole("button", { name: "Continue" }).click();
    await page.getByText(/FINSIGHT_OWNER_PASSWORD/).waitFor();
    record("login: not-configured tells the owner what to set", true);
  } catch (e) {
    record("states: empty, slow, failing, login", false, String(e.message).split(String.fromCharCode(10))[0]);
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
if (!only || only === "transactions") await transactionChecks(browser);
if (!only || only === "routes") await routeChecks(browser);
if (!only || only === "explore") await exploreChecks(browser);
if (!only || only === "states") await stateChecks(browser);
if (!only || only === "models") await modelChecks(browser);
if (!only || only === "motion") await motionChecks(browser);
if (!only || only === "a11y") await a11yChecks(browser);
if (!only || only === "worst") await worstCaseChecks(browser);
if (!only || only === "consistency") await consistencyChecks(browser);
await browser.close();

const failed = results.filter((r) => !r.ok);
mkdirSync(".tmp", { recursive: true });
writeFileSync(".tmp/ui-check.json", JSON.stringify({ base, at: new Date().toISOString(), results }, null, 2));
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
process.exit(failed.length ? 1 : 0);
