// Landing page behaviour checks (scroll engine, offscreen pause, reduced motion, nav, links, axe, mobile menu).
// Needs the production build served (npm run build && npm run start -- --port N, in frontend/).
// Usage: node execution/landing_check.mjs [--base http://127.0.0.1:3000/]
// Behavioural checks for the landing page: scroll engine, offscreen pausing, reduced motion, nav, links, axe.
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
const require = createRequire(import.meta.url);
const { chromium } = require("../frontend/node_modules/playwright-core");
const axeSrc = readFileSync(require.resolve("../frontend/node_modules/axe-core/axe.min.js"), "utf8");
const args = process.argv.slice(2);
const URL = (args.includes("--base") ? args[args.indexOf("--base") + 1] : "http://127.0.0.1:3000").replace(/\/?$/, "/");
const results = [];
const check = (name, ok, extra = "") => { results.push(ok); console.log(ok ? "PASS" : "FAIL", name, extra); };
const b = await chromium.launch({ channel: "chrome" });

// ---------- Desktop, motion allowed ----------
{
  const ctx = await b.newContext({ viewport: { width: 1280, height: 800 } });
  await ctx.addInitScript(() => {
    window.__scroll = 0;
    const add = window.addEventListener.bind(window), rem = window.removeEventListener.bind(window);
    window.addEventListener = (t, ...a) => { if (t === "scroll") window.__scroll++; return add(t, ...a); };
    window.removeEventListener = (t, ...a) => { if (t === "scroll") window.__scroll--; return rem(t, ...a); };
  });
  const p = await ctx.newPage();
  const errors = [];
  p.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  p.on("pageerror", (e) => errors.push(String(e)));
  await p.goto(URL, { waitUntil: "networkidle" });
  await p.waitForTimeout(1200);
  const flow = await p.evaluate(() => { const r = document.querySelector("#product"); return { top: r.getBoundingClientRect().top + scrollY, h: r.offsetHeight }; });
  const range = flow.h - 800;
  const jump = (y) => p.evaluate((v) => scrollTo({ top: v, behavior: "instant" }), y);
  const read = () => p.evaluate(() => { const s = document.querySelector("#product"); return { reach: s.dataset.reach, pv: parseFloat(s.dataset.p || "NaN"), listeners: window.__scroll }; });

  await jump(flow.top - 300); await p.waitForTimeout(300);
  check("scroll listener active near the section", (await read()).listeners === 1);
  const far = await p.evaluate(() => document.querySelector("#evidence").getBoundingClientRect().top + scrollY);
  await jump(far); await p.waitForTimeout(300);
  check("scroll listener inactive when the section is far away", (await read()).listeners === 0, String((await read()).listeners));
  await jump(flow.top - 300); await p.waitForTimeout(300);

  // DOM mutations during a scrub: only attribute changes on the section are allowed (no React re-render of children).
  await p.evaluate(() => {
    window.__mut = { child: 0, attr: 0 };
    new MutationObserver((l) => l.forEach((m) => { if (m.type === "childList") window.__mut.child++; else window.__mut.attr++; }))
      .observe(document.querySelector("#product"), { subtree: true, childList: true, attributes: true, attributeFilter: ["data-reach", "style"] });
  });
  const seq = [];
  for (let i = 0; i <= 20; i++) { await jump(flow.top + range * (i / 20)); await p.waitForTimeout(40); seq.push(await read()); }
  const down = seq.map((s) => s.reach).join("");
  const mono = seq.every((s, i) => i === 0 || s.pv >= seq[i - 1].pv - 1e-6);
  check("progress monotonic scrolling down", mono, down);
  check("reach reaches 1..4 in order", /^1+2+3+4+$/.test(down), down);
  const up = [];
  for (let i = 20; i >= 0; i--) { await jump(flow.top + range * (i / 20)); await p.waitForTimeout(40); up.push(await read()); }
  const upReach = up.map((s) => s.reach).join("");
  check("scrolling back reverses exactly", upReach === [...down].reverse().join("") || /^4+3+2+1+$/.test(upReach), upReach);
  check("progress at same position equal both directions", Math.abs(up[10].pv - seq[10].pv) < 0.002, `${up[10].pv} vs ${seq[10].pv}`);
  const mut = await p.evaluate(() => window.__mut);
  check("no child DOM changes while scrubbing (no per-frame React renders)", mut.child === 0, JSON.stringify(mut));

  // Computed emphasis follows reach
  await jump(flow.top + range * 0.6); await p.waitForTimeout(500);
  const scene = await p.evaluate(() => {
    const q = (sel) => document.querySelector(sel);
    const rows = [...document.querySelectorAll(".lp-row")].map((e) => getComputedStyle(e.querySelector(".lp-mono")).color);
    return {
      reach: q("#product").dataset.reach,
      select: +getComputedStyle(q(".lp-select")).opacity,
      evidence: +getComputedStyle(q(".lp-layer-evidence")).opacity,
      kase: +getComputedStyle(q(".lp-layer-case")).opacity,
      idle: +getComputedStyle(q(".lp-layer-idle")).opacity,
      first: rows[0], other: rows[1],
      cap: [...document.querySelectorAll(".lp-cap span")].map((e) => +getComputedStyle(e).opacity).join(","),
    };
  });
  check("scene 3: row selected, evidence and linked entities shown, case hidden", scene.reach === "3" && scene.select === 1 && scene.evidence === 1 && scene.kase === 0 && scene.idle === 0 && scene.first !== scene.other && scene.cap === "0,0,1,0", JSON.stringify(scene));

  // axe in the mid and end states of the reveal (earlier runs cover the start state)
  await p.evaluate(axeSrc);
  for (const f of [0.35, 0.6, 0.95]) {
    await jump(flow.top + range * f); await p.waitForTimeout(500);
    const v = await p.evaluate(async () => (await axe.run(document, { runOnly: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "best-practice"] })).violations.map((x) => x.id + ": " + x.nodes.map((n) => n.target.join(" ")).slice(0, 2).join(" | ")));
    check(`axe clean at reveal progress ${f}`, v.length === 0, JSON.stringify(v));
  }
  await jump(flow.top + flow.h + 400); await p.waitForTimeout(400);
  check("scroll listener removed after leaving section", (await read()).listeners === 0, String((await read()).listeners));

  // Hero trace pauses offscreen
  const live = await p.evaluate(() => { const t = document.querySelector(".lp-trace"); return { live: t.dataset.live, state: getComputedStyle(document.querySelector(".lp-trace-signal")).animationPlayState }; });
  check("hero trace paused when offscreen", live.live === "false" && live.state === "paused", JSON.stringify(live));
  await jump(0); await p.waitForTimeout(500);
  const live2 = await p.evaluate(() => ({ live: document.querySelector(".lp-trace").dataset.live, state: getComputedStyle(document.querySelector(".lp-trace-signal")).animationPlayState }));
  check("hero trace runs when on screen", live2.live === "true" && live2.state === "running", JSON.stringify(live2));

  // Nav gains solid state on scroll
  const navTop = await p.evaluate(() => document.querySelector(".lp-nav").dataset.scrolled);
  await jump(900); await p.waitForTimeout(400);
  const navScrolled = await p.evaluate(() => document.querySelector(".lp-nav").dataset.scrolled);
  check("nav treatment changes on scroll", navTop === "false" && navScrolled === "true", `${navTop} -> ${navScrolled}`);

  // Anchor offsets
  for (const id of ["product", "models", "evidence"]) {
    await jump(0);
    await p.click(`.lp-nav-links a[href="#${id}"]`);
    await p.waitForTimeout(1400);
    const r = await p.evaluate((i) => { const h = document.querySelector(`#${i} h2`).getBoundingClientRect(); return { top: h.top, nav: document.querySelector(".lp-nav").offsetHeight }; }, id);
    check(`anchor #${id} heading sits below the sticky nav`, r.top >= r.nav - 1 && r.top < 400, JSON.stringify(r));
  }

  // Keyboard: tab order starts with skip link, focus ring visible
  await p.goto(URL, { waitUntil: "networkidle" });
  await p.keyboard.press("Tab");
  const first = await p.evaluate(() => document.activeElement.textContent.trim());
  check("first tab stop is Skip to content", first === "Skip to content", first);
  let ring = true;
  for (let i = 0; i < 9; i++) { await p.keyboard.press("Tab"); const o = await p.evaluate(() => { const s = getComputedStyle(document.activeElement); return s.outlineStyle !== "none" && parseFloat(s.outlineWidth) >= 2; }); ring = ring && o; }
  check("focus ring visible on first 9 tab stops", ring);

  // Axe
  await p.evaluate(axeSrc);
  const axe = await p.evaluate(async () => (await axe.run(document, { runOnly: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "best-practice"] })).violations.map((v) => v.id + ": " + v.nodes.map((n) => n.target.join(" ")).slice(0, 3).join(" | ")));
  check("axe desktop clean", axe.length === 0, JSON.stringify(axe));

  // Links
  const hrefs = await p.evaluate(() => [...new Set([...document.querySelectorAll("a[href]")].map((a) => a.getAttribute("href")))]);
  const bad = [];
  for (const h of hrefs) {
    if (h.startsWith("#")) { if (!(await p.evaluate((i) => !!document.getElementById(i), h.slice(1)))) bad.push(h); continue; }
    const r = await ctx.request.get(new globalThis.URL(h, URL).href, { maxRedirects: 5 });
    if (!r.ok()) bad.push(h + " " + r.status());
  }
  check("every link resolves", bad.length === 0, `${hrefs.length} links ${JSON.stringify(bad)}`);
  check("no console errors (desktop)", errors.length === 0, JSON.stringify(errors));
  await ctx.close();
}

// ---------- Reduced motion ----------
{
  const ctx = await b.newContext({ viewport: { width: 1280, height: 800 }, reducedMotion: "reduce" });
  const p = await ctx.newPage();
  await p.goto(URL, { waitUntil: "networkidle" });
  await p.waitForTimeout(600);
  const r = await p.evaluate(() => ({
    flowH: document.querySelector("#product").offsetHeight,
    sticky: getComputedStyle(document.querySelector(".lp-flow-pin")).position,
    panels: [...document.querySelectorAll(".lp-layer-evidence, .lp-layer-case, .lp-select")].map((e) => +getComputedStyle(e).opacity === 1),
    steps: [...document.querySelectorAll(".lp-step")].map((e) => +getComputedStyle(e).opacity),
    idle: getComputedStyle(document.querySelector(".lp-layer-idle")).display,
    hidden: document.querySelectorAll("[data-reveal][data-ready]:not([data-in])").length,
    anim: document.getAnimations().filter((a) => a.playState === "running").length,
    signal: getComputedStyle(document.querySelector(".lp-trace-signal")).strokeDasharray,
    bars: [...document.querySelectorAll(".lp-bar > span")].map((e) => getComputedStyle(e).transform),
  }));
  check("reduced motion: not pinned, everything fully visible", r.sticky === "static" && r.flowH < 2200 && r.panels.every(Boolean) && r.steps.every((o) => o === 1) && r.idle === "none" && r.hidden === 0, JSON.stringify({ flowH: r.flowH, sticky: r.sticky, hidden: r.hidden }));
  check("reduced motion: no running animations", r.anim === 0, String(r.anim));
  check("reduced motion: static signal path and full bars", r.signal === "none" && r.bars.every((t) => t === "none"), `${r.signal} ${r.bars}`);
  await ctx.close();
}

// ---------- Mobile: menu + overflow + axe ----------
{
  const ctx = await b.newContext({ viewport: { width: 375, height: 812 }, hasTouch: true, isMobile: true });
  const p = await ctx.newPage();
  const errors = [];
  p.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  await p.goto(URL, { waitUntil: "networkidle" });
  const btn = p.locator(".lp-menu-button");
  check("mobile menu closed initially", (await btn.getAttribute("aria-expanded")) === "false" && !(await p.locator("#lp-menu").isVisible()));
  const box = await btn.boundingBox();
  check("menu button touch target >= 44px", box.width >= 44 && box.height >= 44, JSON.stringify(box));
  await btn.click();
  check("mobile menu opens", (await btn.getAttribute("aria-expanded")) === "true" && (await p.locator("#lp-menu").isVisible()));
  await p.keyboard.press("Escape");
  check("Escape closes menu and returns focus to button", (await btn.getAttribute("aria-expanded")) === "false" && (await p.evaluate(() => document.activeElement.className)) === "lp-menu-button");
  await btn.click();
  await p.click('#lp-menu a[href="#models"]');
  await p.waitForTimeout(1200);
  const m = await p.evaluate(() => ({ open: document.querySelector(".lp-menu-button").getAttribute("aria-expanded"), top: document.querySelector("#models h2").getBoundingClientRect().top }));
  check("menu link scrolls to section under header and closes", m.open === "false" && m.top >= 60 && m.top < 300, JSON.stringify(m));
  await p.evaluate(axeSrc);
  const axe = await p.evaluate(async () => (await axe.run(document, { runOnly: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "best-practice"] })).violations.map((v) => v.id + ": " + v.nodes.map((n) => n.target.join(" ")).slice(0, 3).join(" | ")));
  check("axe mobile clean", axe.length === 0, JSON.stringify(axe));
  const small = await p.evaluate(() => [...document.querySelectorAll(".lp *")].filter((e) => { const s = getComputedStyle(e); return parseFloat(s.fontSize) < 11 && e.getBoundingClientRect().width && [...e.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim()); }).map((e) => e.className + " " + getComputedStyle(e).fontSize));
  check("no text under 11px", small.length === 0, JSON.stringify(small));
  check("no console errors (mobile)", errors.length === 0, JSON.stringify(errors));
  await ctx.close();
}
await b.close();
console.log(results.every(Boolean) ? "ALL PASS" : `FAILURES: ${results.filter((x) => !x).length}`);
