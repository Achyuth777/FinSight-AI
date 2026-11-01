// Landing page behaviour checks: the pinned film (hero and product scene), its scroll engine, offscreen listener
// removal, reduced motion, the flow layout, nav, anchors, links, axe, overflow and the mobile menu.
// Needs the production build served (npm run build && npm run start -- --port N, in frontend/).
// Usage: node execution/landing_check.mjs [--base http://127.0.0.1:3000/]
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
const require = createRequire(import.meta.url);
const { chromium } = require("../frontend/node_modules/playwright-core");
const axeSrc = readFileSync(require.resolve("../frontend/node_modules/axe-core/axe.min.js"), "utf8");
const args = process.argv.slice(2);
const URL = (args.includes("--base") ? args[args.indexOf("--base") + 1] : "http://127.0.0.1:3000").replace(/\/?$/, "/");
const results = [];
const check = (name, ok, extra = "") => { results.push(ok); console.log(ok ? "PASS" : "FAIL", name, extra); };
const axeRun = () => window.axe.run(document, { runOnly: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "best-practice"] }).then((r) => r.violations.map((x) => x.id + ": " + x.nodes.map((n) => n.target.join(" ")).slice(0, 3).join(" | ")));
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
  const flow = await p.evaluate(() => { const r = document.querySelector("#hero"); return { top: r.getBoundingClientRect().top + scrollY, h: r.offsetHeight, mode: document.documentElement.dataset.lp }; });
  const range = flow.h - 800;
  const jump = (y) => p.evaluate((v) => scrollTo({ top: v, behavior: "instant" }), y);
  const read = () => p.evaluate(() => { const s = document.querySelector("#hero"); return { reach: s.dataset.reach, pv: parseFloat(s.dataset.p || "NaN"), listeners: window.__scroll }; });
  check("pinned layout chosen before first paint on a wide screen", flow.mode === "pin" && range > 1600, JSON.stringify(flow));

  // The first screen already holds the product, framed, with the headline and one action
  const first = await p.evaluate(() => {
    const d = document.querySelector(".lp-device").getBoundingClientRect();
    const h = document.querySelector("#hero-title").getBoundingClientRect();
    const cta = document.querySelector(".lp-pill .lp-btn").getBoundingClientRect();
    return { deviceTop: d.top, deviceW: d.width, h1Bottom: h.bottom, ctaInView: cta.bottom <= innerHeight && cta.top >= 0, tf: getComputedStyle(document.querySelector(".lp-device")).transform, copy: +getComputedStyle(document.querySelector(".lp-hero-copy")).opacity };
  });
  check("first screen: headline, large tilted product and CTA together", first.deviceTop < 560 && first.deviceW > 800 && first.h1Bottom < first.deviceTop + 40 && first.ctaInView && first.tf.startsWith("matrix3d") && first.copy === 1, JSON.stringify(first));

  check("scroll listener active while the film is in view", (await read()).listeners === 1);
  const far = await p.evaluate(() => document.querySelector("#evidence").getBoundingClientRect().top + scrollY);
  await jump(far); await p.waitForTimeout(300);
  check("scroll listener inactive when the film is far away", (await read()).listeners === 0, String((await read()).listeners));
  await jump(flow.top + 200); await p.waitForTimeout(300);

  // DOM mutations during a scrub: only attribute changes (no React re-render of children)
  await p.evaluate(() => {
    window.__mut = { child: 0, attr: 0 };
    new MutationObserver((l) => l.forEach((m) => { if (m.type === "childList") window.__mut.child++; else window.__mut.attr++; }))
      .observe(document.querySelector("#hero"), { subtree: true, childList: true, attributes: true, attributeFilter: ["data-reach", "style"] });
  });
  const seq = [];
  for (let i = 0; i <= 20; i++) { await jump(flow.top + range * (i / 20)); await p.waitForTimeout(40); seq.push(await read()); }
  const down = seq.map((s) => s.reach).join("");
  check("progress monotonic scrolling down", seq.every((s, i) => i === 0 || s.pv >= seq[i - 1].pv - 1e-6), down);
  check("reach reaches 1..4 in order", /^1+2+3+4+$/.test(down), down);
  const up = [];
  for (let i = 20; i >= 0; i--) { await jump(flow.top + range * (i / 20)); await p.waitForTimeout(40); up.push(await read()); }
  const upReach = up.map((s) => s.reach).join("");
  check("scrolling back reverses exactly", /^4+3+2+1+$/.test(upReach) && upReach === [...down].reverse().join(""), upReach);
  check("progress at the same position is equal in both directions", Math.abs(up[10].pv - seq[10].pv) < 0.002, `${up[10].pv} vs ${seq[10].pv}`);
  const mut = await p.evaluate(() => window.__mut);
  check("no child DOM changes while scrubbing (no per-frame React renders)", mut.child === 0, JSON.stringify(mut));

  // Expansion: the product settles flat and the headline leaves, continuously with scroll
  const at = async (f) => { await jump(flow.top + range * f); await p.waitForTimeout(700); return p.evaluate(() => ({
    tf: getComputedStyle(document.querySelector(".lp-device")).transform,
    copy: +getComputedStyle(document.querySelector(".lp-hero-copy")).opacity,
    pill: getComputedStyle(document.querySelector(".lp-pill-wrap")).visibility,
    rail: +getComputedStyle(document.querySelector(".lp-rail")).opacity,
    top: document.querySelector(".lp-device").getBoundingClientRect().top,
  })); };
  const e0 = await at(0), e1 = await at(0.1), e2 = await at(0.45);
  // Settled means an identity placement (scale 1, no rotation, no offset); the 3D perspective term may remain.
  const flat = (t) => { if (t === "none") return true; const v = t.replace(/^matrix3?d?\(|\)$/g, "").split(",").map(Number); return t.startsWith("matrix3d") ? v[0] === 1 && v[5] === 1 && v[6] === 0 && v[4] === 0 && v[1] === 0 && v[12] === 0 && v[13] === 0 : v[0] === 1 && v[3] === 1 && v[4] === 0 && v[5] === 0; };
  check("device tilts back at the start and sits flat once settled", e0.tf.startsWith("matrix3d") && !flat(e0.tf) && !flat(e1.tf) && e1.tf !== e0.tf && flat(e2.tf), `${e0.tf.slice(0, 30)} | ${e1.tf.slice(0, 30)} | ${e2.tf}`);
  check("headline and hero action leave as the product settles", e0.copy === 1 && e2.copy === 0 && e0.pill === "visible" && e2.pill === "hidden" && e0.rail === 0 && e2.rail === 1, JSON.stringify([e0.copy, e2.copy, e0.pill, e2.pill, e0.rail, e2.rail]));
  check("settled product sits fully below the nav", e2.top >= 60, String(e2.top));

  // Scene states follow reach
  const scene = async (f) => { await jump(flow.top + range * f); await p.waitForTimeout(900); return p.evaluate(() => {
    const q = (sel) => document.querySelector(sel);
    const op = (sel) => +getComputedStyle(q(sel)).opacity;
    const rows = [...document.querySelectorAll(".lp-row")].map((r) => getComputedStyle(r.querySelector("td")).color);
    return { reach: q("#hero").dataset.reach, idle: op(".lp-layer-idle"), evidence: op(".lp-layer-evidence"), kase: op(".lp-layer-case"), link: op(".lp-link"), linkTf: getComputedStyle(q(".lp-link")).transform,
      sel: getComputedStyle(q(".lp-row td")).backgroundColor, other: rows[1], first: rows[0], rail: [...document.querySelectorAll(".lp-rail-t")].map((e) => getComputedStyle(e).color).join("|") };
  }); };
  const s1 = await scene(0.1), s2 = await scene(0.35), s3 = await scene(0.6), s4 = await scene(0.9);
  check("scene 1: queue only, inspector idle", s1.reach === "1" && s1.idle === 1 && s1.evidence === 0 && s1.link === 0 && s1.sel === "rgba(0, 0, 0, 0)", JSON.stringify(s1));
  check("scene 2: row selected, others recede in colour, context shown", s2.reach === "2" && s2.idle === 0 && s2.evidence === 1 && s2.link === 0 && s2.sel !== "rgba(0, 0, 0, 0)" && s2.first !== s2.other, JSON.stringify(s2));
  check("scene 3: linked accounts over the queue, evidence kept", s3.reach === "3" && s3.link === 1 && s3.linkTf === "none" && s3.evidence === 1 && s3.kase === 0, JSON.stringify(s3));
  check("scene 4: investigation resolves in the same product", s4.reach === "4" && s4.kase === 1 && s4.link === 1 && s4.evidence === 0, JSON.stringify(s4));
  check("rail marks the current stage", new Set(s3.rail.split("|")).size >= 3, s3.rail);

  // axe in every state (hero, settled, connect, document)
  await p.evaluate(axeSrc);
  for (const f of [0.02, 0.35, 0.6, 0.95]) {
    await jump(flow.top + range * f); await p.waitForTimeout(700);
    const v = await p.evaluate(axeRun);
    check(`axe clean at film progress ${f}`, v.length === 0, JSON.stringify(v));
  }
  await jump(flow.top + flow.h + 400); await p.waitForTimeout(400);
  check("scroll listener removed after leaving the film", (await read()).listeners === 0, String((await read()).listeners));

  // Resize while mid-film: positions are re-measured and the state stays a pure function of scroll
  await jump(flow.top + range * 0.6); await p.waitForTimeout(400);
  await p.setViewportSize({ width: 1100, height: 760 }); await p.waitForTimeout(600);
  const r2 = await p.evaluate(() => { const s = document.querySelector("#hero"); const top = s.getBoundingClientRect().top + scrollY; return { p: parseFloat(s.dataset.p), expected: (scrollY - top) / (s.offsetHeight - innerHeight) }; });
  check("after a resize the progress matches the new layout", Math.abs(r2.p - Math.min(1, Math.max(0, r2.expected))) < 0.01, JSON.stringify(r2));
  await p.setViewportSize({ width: 1280, height: 800 }); await p.waitForTimeout(400);

  // Nav gains a solid state on scroll
  await jump(0); await p.waitForTimeout(400);
  const navTop = await p.evaluate(() => document.querySelector(".lp-nav").dataset.scrolled);
  await jump(900); await p.waitForTimeout(400);
  const navScrolled = await p.evaluate(() => document.querySelector(".lp-nav").dataset.scrolled);
  check("nav treatment changes on scroll", navTop === "false" && navScrolled === "true", `${navTop} -> ${navScrolled}`);

  // Anchors land clear of the sticky nav (and the product anchor lands on the settled product)
  for (const id of ["product", "trace", "models", "evidence"]) {
    await jump(0);
    await p.click(`.lp-nav-links a[href="#${id}"]`);
    await p.waitForTimeout(2200);
    const r = await p.evaluate((i) => {
      const el = i === "product" ? document.querySelector(".lp-device") : document.querySelector(`#${i} h2`);
      return { top: el.getBoundingClientRect().top, nav: document.querySelector(".lp-nav").offsetHeight, reach: document.querySelector("#hero").dataset.reach };
    }, id);
    check(`anchor #${id} lands below the sticky nav`, r.top >= r.nav - 1 && r.top < 480 && (id !== "product" || r.reach === "2"), JSON.stringify(r));
  }

  // Load at an anchor below the film: the film must be in its final state
  await p.goto(URL + "#models", { waitUntil: "networkidle" }); await p.waitForTimeout(900);
  const deep = await p.evaluate(() => ({ reach: document.querySelector("#hero").dataset.reach, p: document.querySelector("#hero").dataset.p, scrollY }));
  check("loading at #models leaves the film complete", deep.reach === "4" && deep.p === "1.0000" && deep.scrollY > 3000, JSON.stringify(deep));

  // Navigate away and back keeps state correct
  await p.goto(URL, { waitUntil: "networkidle" }); await p.waitForTimeout(500);
  await jump(flow.top + range * 0.6); await p.waitForTimeout(400);
  await p.goto(URL + "login").catch(() => {}); await p.goBack({ waitUntil: "load" }); await p.waitForTimeout(900);
  const back = await p.evaluate(() => ({ reach: document.querySelector("#hero").dataset.reach, p: parseFloat(document.querySelector("#hero").dataset.p), y: scrollY, mode: document.documentElement.dataset.lp }));
  check("back navigation restores a consistent film state", back.mode === "pin" && (back.y < 50 ? back.reach === "1" : ["2", "3", "4"].includes(back.reach)) && !Number.isNaN(back.p), JSON.stringify(back));

  // Keyboard: skip link first, focus ring visible on the first stops
  await p.goto(URL, { waitUntil: "networkidle" });
  await p.keyboard.press("Tab");
  const firstStop = await p.evaluate(() => document.activeElement.textContent.trim());
  check("first tab stop is Skip to content", firstStop === "Skip to content", firstStop);
  let ring = true; const stops = [];
  for (let i = 0; i < 8; i++) { await p.keyboard.press("Tab"); const o = await p.evaluate(() => { const e = document.activeElement; const s = getComputedStyle(e); return { text: (e.textContent || "").trim().slice(0, 18), ok: s.outlineStyle !== "none" && parseFloat(s.outlineWidth) >= 2 }; }); stops.push(o.text); ring = ring && o.ok; }
  check("focus ring visible on the first 8 tab stops", ring, stops.join(" | "));
  check("hero action is reachable by keyboard", stops.filter((t) => t.startsWith("Open workspace")).length >= 2, stops.join(" | "));

  // Axe on the settled page and links
  await p.evaluate(axeSrc);
  const ax = await p.evaluate(axeRun);
  check("axe desktop clean", ax.length === 0, JSON.stringify(ax));
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

// ---------- Reduced motion: the same product, everything visible, nothing pinned or animated ----------
{
  const ctx = await b.newContext({ viewport: { width: 1280, height: 800 }, reducedMotion: "reduce" });
  const p = await ctx.newPage();
  await p.goto(URL, { waitUntil: "networkidle" });
  await p.waitForTimeout(900);
  const r = await p.evaluate(() => {
    const op = (s) => +getComputedStyle(document.querySelector(s)).opacity;
    return {
      mode: document.documentElement.dataset.lp,
      filmH: document.querySelector("#hero").offsetHeight,
      sticky: getComputedStyle(document.querySelector(".lp-film-pin")).position,
      layers: [op(".lp-layer-evidence"), op(".lp-layer-case"), op(".lp-link"), op(".lp-hero-copy"), op(".lp-rail")],
      pill: getComputedStyle(document.querySelector(".lp-pill-wrap")).visibility,
      idle: getComputedStyle(document.querySelector(".lp-layer-idle")).display,
      tf: getComputedStyle(document.querySelector(".lp-device")).transform,
      hidden: document.querySelectorAll("[data-reveal][data-ready]:not([data-in])").length,
      anim: document.getAnimations().filter((a) => a.playState === "running").length,
      bars: [...document.querySelectorAll(".lp-bar i")].map((e) => getComputedStyle(e).transform),
      wire: getComputedStyle(document.querySelector(".lp-wire i")).transform,
      rows: [...document.querySelectorAll(".lp-row td")].map((e) => getComputedStyle(e).color).filter((c, i, a) => c !== a[0]).length,
    };
  });
  check("reduced motion: flow layout, not pinned, nothing tilted", r.mode === "flow" && r.sticky !== "sticky" && r.filmH < 2400 && r.tf === "none", JSON.stringify({ mode: r.mode, sticky: r.sticky, filmH: r.filmH, tf: r.tf }));
  check("reduced motion: every scene visible at once", r.layers.every((o) => o === 1) && r.idle === "none" && r.pill === "visible" && r.hidden === 0, JSON.stringify(r.layers));
  check("reduced motion: no running animations, full bars and wire, rows not dimmed", r.anim === 0 && r.bars.every((t) => t === "none") && r.wire === "none" && r.rows === 0, JSON.stringify({ anim: r.anim, bars: r.bars, wire: r.wire, rows: r.rows }));
  await p.evaluate(axeSrc);
  const ax = await p.evaluate(axeRun);
  check("axe reduced motion clean", ax.length === 0, JSON.stringify(ax));
  await ctx.close();
}

// ---------- Short desktop window falls back to the flow layout ----------
{
  const ctx = await b.newContext({ viewport: { width: 1280, height: 600 } });
  const p = await ctx.newPage();
  await p.goto(URL, { waitUntil: "networkidle" });
  const r = await p.evaluate(() => ({ mode: document.documentElement.dataset.lp, sticky: getComputedStyle(document.querySelector(".lp-film-pin")).position, ov: document.documentElement.scrollWidth - innerWidth }));
  check("short window: flow layout, no overflow", r.mode === "flow" && r.sticky !== "sticky" && r.ov === 0, JSON.stringify(r));
  await ctx.close();
}

// ---------- Overflow at common widths ----------
for (const [w, h] of [[320, 640], [390, 844], [768, 1024], [1024, 768], [1440, 900], [1920, 1080]]) {
  const ctx = await b.newContext({ viewport: { width: w, height: h } });
  const p = await ctx.newPage();
  await p.goto(URL, { waitUntil: "networkidle" });
  await p.waitForTimeout(500);
  const H = await p.evaluate(() => document.documentElement.scrollHeight);
  let worst = 0;
  for (let y = 0; y < H; y += Math.max(300, h - 100)) { await p.evaluate((v) => scrollTo({ top: v, behavior: "instant" }), y); await p.waitForTimeout(60); worst = Math.max(worst, await p.evaluate(() => document.documentElement.scrollWidth - innerWidth)); }
  check(`no horizontal overflow at ${w}x${h}`, worst === 0, String(worst));
  await ctx.close();
}

// ---------- Mobile: menu + axe ----------
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
  const cta = await p.locator(".lp-film .lp-pill .lp-btn").boundingBox();
  check("mobile: the hero action is on the first screen and a full-size target", cta.y + cta.height <= 812 && cta.height >= 44 && cta.width >= 280, JSON.stringify(cta));
  await btn.click();
  check("mobile menu opens", (await btn.getAttribute("aria-expanded")) === "true" && (await p.locator("#lp-menu").isVisible()));
  await p.keyboard.press("Escape");
  check("Escape closes menu and returns focus to button", (await btn.getAttribute("aria-expanded")) === "false" && (await p.evaluate(() => document.activeElement.className)) === "lp-menu-button");
  await btn.click();
  await p.click('#lp-menu a[href="#models"]');
  await p.waitForTimeout(1500);
  const m = await p.evaluate(() => ({ open: document.querySelector(".lp-menu-button").getAttribute("aria-expanded"), top: document.querySelector("#models h2").getBoundingClientRect().top }));
  check("menu link scrolls to section under header and closes", m.open === "false" && m.top >= 60 && m.top < 360, JSON.stringify(m));
  await p.evaluate(axeSrc);
  const ax = await p.evaluate(axeRun);
  check("axe mobile clean", ax.length === 0, JSON.stringify(ax));
  const small = await p.evaluate(() => [...document.querySelectorAll(".lp *")].filter((e) => { const s = getComputedStyle(e); return parseFloat(s.fontSize) < 11 && e.getBoundingClientRect().width && [...e.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim()); }).map((e) => e.className + " " + getComputedStyle(e).fontSize));
  check("no text under 11px", small.length === 0, JSON.stringify(small));
  check("no console errors (mobile)", errors.length === 0, JSON.stringify(errors));
  await ctx.close();
}
await b.close();
console.log(results.every(Boolean) ? "ALL PASS" : `FAILURES: ${results.filter((x) => !x).length}`);
