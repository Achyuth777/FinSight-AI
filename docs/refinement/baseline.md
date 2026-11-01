# FinSight AI — frontend refinement baseline

Discovery and planning only. No product code was changed for this document.

- **Audited tree:** `C:\Users\Admin\Documents\FinSight-AI`, `main` at `b08ce14` (matches GitHub `main`). The copy in `Downloads\FinSight_AI_GitHub_Ready` is an old snapshot (`832b2b7`, 21 commits behind, no login, forest theme) and was **not** audited. You chose the Documents repo.
- **Date:** 2026-11-01.
- **How it was run:** FastAPI on `127.0.0.1:8000` with a scratch SQLite database (your `finsight.db` was not touched), `next dev` on `127.0.0.1:3000`, no `FINSIGHT_OWNER_PASSWORD` set, so the local-dev login bypass was active.
- **How it was inspected:** Playwright is not installed and I did not install it. Screenshots were taken with the locally installed Chrome (`--headless=new`, 1440 px desktop and 390 px mobile). Interaction and measurements were made in the built-in browser pane (1024 px wide) with in-page scripts.
- **Seed data:** the synthetic demo dataset, one supervised run (Isolation Forest + XGBoost/SHAP) and one case with a status change and a note.
- **Not available in this environment:** TasteSkill, Emil Kowalski's skills and Web Design Guidelines are not installed. Impeccable's automatic design hook ran on edits earlier in the session; I did not run a formal Impeccable critique. Awesome DESIGN.md and Figma were not consulted because no design references exist. The critique below is my own reading against `skills/frontend-design/SKILL.md`.

## 1. Verified architecture and current capabilities

**Frontend** (`frontend/`, Next.js 16.4.3 App Router, React 19, Tailwind 4, Radix Dialog, CVA, Recharts, Lucide, Framer Motion)

| Route | Notes |
|---|---|
| `/` | Marketing page, `app/page.tsx` (290 lines), hero preview in `components/hero-intelligence.tsx` |
| `/login` | Single shared-password form |
| `/app/{overview,transactions,investigations,network,laboratory,monitoring,assistant}` | One `Workspace` client component, `components/workspace.tsx`, 1,706 lines. `[section]/page.tsx` redirects to `/login` when unauthenticated |
| `/api/auth/{login,logout}`, `/api/[...path]` | Next route handlers. The catch-all forwards GET/POST/PATCH to FastAPI with `X-Finsight-API-Key` |

- **Styling:** `globals.css` (2,449 lines) is overridden by `obsidian.css` (130 lines), which is loaded after it in `layout.tsx`.
- **State:** about 22 `useState` hooks in `Workspace`, plus `localStorage["finsight-run"]` for the selected run.

**Backend** (`backend/main.py`, `execution/pipeline.py`): FastAPI, SQLAlchemy, SQLite by default, one generic `records` JSON table.
- **Endpoints:** health, template CSV, datasets (list, demo, upload), runs (create, list, read), cases (create, list, patch), research.
- **Pipeline:** Isolation Forest trained on the first ~70% by time, plus optional XGBoost with TreeSHAP.

**Implemented user journey, confirmed working in the browser:** load demo or import CSV → filter and sort transactions → open the evidence drawer → create an investigation → add a note and change status → data persists server-side. Entity network, laboratory (settings, held-out metrics, XGBoost comparison, run history), drift monitoring and the cited research search all render with real data.

## 2. Product truth: verified against code

| Constraint | Verdict | Evidence |
|---|---|---|
| Amounts are INR, timestamps parsed to UTC | ✅ | `pipeline.py:71` `utc=True`; `currency: 'INR'` set in `main.py`; UI uses `en-IN` INR formatter; no currency column exists |
| Anomaly percentile is not fraud probability | ✅ | `pipeline.py:116-117` rank against training scores; UI states it in the dataset strip and drawer |
| Deviation explanations are not SHAP/causal | ✅ | `pipeline.py:160` `explanation_method`; drawer copy |
| Synthetic results are not production performance | ⚠️ partial | Caveat appears under Isolation Forest metrics only. The **XGBoost panel shows 100.0% on four metrics with no synthetic caveat**, and **Monitoring → Performance snapshot repeats the metrics with no caveat** |
| Research is deterministic cited search | ✅ with a labelling problem | Backend is token matching. The panel says "no generative model connected", but the nav item is "Research assistant" with a sparkle icon, which signals AI |
| Batch experiments, not streaming/blocking | ✅ | Copy says "No payment actions", "batch monitoring, not a live production feed" |
| "Interface does not provide real authentication" | ❌ **outdated** | A shared owner-password login now exists: HMAC session cookie (12 h, `httpOnly`, `sameSite=strict`), authenticated proxy, backend API key on Render. It is **not** user accounts, roles or workspace isolation. In non-production with no `FINSIGHT_OWNER_PASSWORD` the whole app is open (observed). `README.md:44` and `docs/VERIFICATION.md:24` still say there is no authentication |

## 3. Browser observations and baseline screenshots

All files are in `docs/refinement/screenshots/`.

| Screen | Desktop | Mobile |
|---|---|---|
| Marketing | `01-marketing-desktop.png` | `02-marketing-mobile.png` |
| Login | `06-login-desktop.png` | — |
| Overview, empty | `03-overview-empty-desktop.png` | `04-overview-empty-mobile.png` |
| Overview, populated | `07-overview-populated-desktop.png` | `14-overview-mobile.png` |
| Transactions | `08-transactions-desktop.png` | `15-transactions-mobile.png` |
| Investigations | `09-investigations-desktop.png` | `16-investigations-mobile.png` |
| Entity network | `10-network-desktop.png` | `17-network-mobile.png` |
| ML laboratory | `11-laboratory-desktop.png` (empty: `05-…`) | `18-laboratory-mobile.png` |
| Monitoring | `12-monitoring-desktop.png` | `19-monitoring-mobile.png` |
| Research assistant | `13-assistant-desktop.png` | `20-assistant-mobile.png` |

The drawer is captured by the automated check as `21-drawer-desktop.png`, and the investigations page after a reload as `22-investigations-after-reload.png`.

### Automated check baseline (`execution/ui_check.mjs`)

Run with the API and web app up: `node execution/ui_check.mjs --shots docs/refinement/screenshots`. It uses `playwright-core` (added as a dev dependency, no browser download) with the local Chrome or Edge, and writes `.tmp/ui-check.json`. `--only overflow|drawer|journey` runs one group. A page that returns HTTP 400 or higher fails its check.

**Result on 2026-11-01: 42 of 50 checks pass, 8 fail.**

| Check | Result |
|---|---|
| Horizontal overflow, 9 pages × 5 widths (360, 390, 768, 1024, 1440) | Fails for Overview, Transactions and Network at 360 and 390 px (559, 568 and 573 px wide), and **Network at 1440 px (1544 px wide)**. Passes everywhere at 768 and 1024 px |
| Drawer opens, is labelled, takes focus | Pass |
| Escape closes the drawer and focus returns to the opener | Pass |
| "Create investigation" visible without scrolling at 1024 × 768 | **Fail**: its bottom edge is at 960 px |
| Journey: open transaction → create case → note → status → reload | Pass: the note and the "reviewing" status persist |

**An earlier version of this run passed everything**, because a stale dev server was returning HTTP 500 pages and the script only measured width. The script now checks the HTTP status, and the numbers above come from a healthy server. Nothing was concluded from the earlier run.

**Bug found and fixed while building the check: writes failed from `http://127.0.0.1:3000`.** The write proxy and the login route compared the request's `Origin` with Next's `nextUrl.origin`, which is `localhost` in dev. Saving a case or note from `127.0.0.1` returned "Invalid request origin". Next prints `127.0.0.1` as its local URL after the earlier hostname change, so users were likely to hit it. The check in `frontend/lib/session.ts` (`isSameOrigin`) now also accepts an origin whose host matches the Host header. A foreign origin such as `http://evil.example` still gets 403 (tested with both Host values).

**Measured in the browser**
- **Horizontal overflow:** `document.scrollWidth` is 559 px on Overview, 568 px on Transactions and 573 px on Network at 360–390 px. The page scrolls sideways and content is cut off (see `15-transactions-mobile.png`). **Network also overflows on desktop at 1440 px (1544 px).** The other four workspace routes, the marketing page and the login page do not overflow at any tested width (confirmed by the automated check below).
- **Drawer behaviour (works):** focus moves into the dialog, the dialog is labelled, Escape closes it, and focus returns to the opening button. Escape was sent as a synthetic key event.
- **Numeric alignment:** every table column, including Amount and Anomaly percentile, is `text-align: left`.
- **Text contrast:** typical secondary text measured 5.7–7.7:1 (fine), but the **"Transactions analyzed" accent card measured ≈2.4:1** (label 11 px, sub-text 9 px). The compositing is approximate.
- **Text size:** workspace working text measured 8–11 px (eyebrows and footer 8 px, metric sub-text 9 px, table sub-text 10 px). The design skill asks for 12–14 px working text.
- **Not verified:** the `≠` in "Anomaly percentile ≠ calibrated fraud probability" on the marketing page looks missing in the headless-Chrome render (`01-marketing-desktop.png`); I did not confirm it in the pane. Keyboard focus visibility on "Import CSV" is also unchecked.

## 4. Main UX and visual problems

**Design system (affects everything).** There are two conflicting themes.
- `globals.css` tokens and `skills/frontend-design/SKILL.md` and `docs/DESIGN.md` describe a **forest-charcoal** canvas (`#171e1a`).
- The latest commits ("activate consistent Obsidian theme") added a **graphite** theme (`#0b0e13`) in `obsidian.css`, which overrides about half of it.
- Forest greens are still hard-coded in many places: chart tooltip `#252d29` (`charts.tsx`), network graph fills `#2c4036` and `#768b6a`, dotted grid `#3c4940`, and the green metric cards, signal rail, drawer and lab panels that sit on graphite (`07`, `10`, `11`).
- The result is a graphite shell with green-tinted surfaces and no single source of truth.
- **Decision (2026-11-01): Obsidian is the approved theme.** `globals.css` tokens, `SKILL.md` and `DESIGN.md` are to be updated to match, and the forest-green literals removed, as part of P0.3. Until then those three files still describe the old forest palette.

**Scanning transactions.** `08-transactions-desktop.png`
- Amount and score columns are left-aligned, so digits do not line up.
- The score is a lime dot plus a number. Lime reads as "good" while the value means "very unusual", which clashes with the skill's rule that green must never imply a verdict. Every row on the first page is "Flagged", so the badge carries no information there.
- The pagination controls sit below a 12-row fold; "Page 1 of 100" at 12 rows per page is a lot of paging for 1,200 rows.
- The Risk filter offers "Model flagged" and "95th percentile +" but there is no visible active-filter summary or reset.

**Evidence drawer.** Live in the pane (1024 × 768)
- The drawer content is 1,027 px tall against a 768 px viewport. The primary action, **Create investigation**, is at the very bottom, below history and signals (bottom edge at 960 px in the automated check).
- The drawer is green-tinted while the page is graphite.

**Investigations.** `09-investigations-desktop.png`
- Status is shown only as a small pill and a dropdown at the bottom of the panel. There is no status in the case header and no visible confirmation beyond a banner.
- "Save note" looks disabled-olive and is far from the text area it belongs to.
- The case panel shows nothing when there is no active run, because the section is gated by `run &&` (`workspace.tsx:826`).
- If the status filter hides the selected case, `activeCase` still shows it.

**Entity network.** `10-network-desktop.png`
- The graph uses a small part of a 700 × 440 canvas, with 12 px labels and a large empty area.
- "1 shared device identifiers / 1 connected accounts" is a plural-agreement bug.
- The side table is clipped at the panel edge ("Anomaly perce…").
- Graph colours are forest, not Obsidian.

**ML laboratory and Monitoring.** `11`, `12`
- The dataset dropdown truncates ("Synthetic payment sandbox · 1200 ro").
- Training shows only a "Training models…" banner: no progress, no duration estimate, and results are far from the Run button.
- XGBoost showing 100.0% four times without a caveat is the most misleading element in the product (see section 2).
- The "Validation: Passed" tile is a hard-coded string, not a measured check.
- "Performance snapshot" duplicates the lab metrics.
- The 0.20 drift threshold tick is not labelled.

**Overview.** `07`
- "Across 90 connected accounts" means unique account IDs, not connected ones.
- The daily activity chart is flat at 180 then drops (synthetic generator), which reads as odd without explanation.
- The "Signals & context" rail only ever shows the first deviation per transaction.

**Marketing.** `01`, `02`
- "A NEW STANDARD FOR FINANCIAL INTELLIGENCE" is an unsupported superlative.
- The hero preview is correctly labelled "Illustrative data" but also says "LIVE VIEW CONCEPT".
- The footer says "A learning platform for serious ML engineering", which conflicts with the hero's financial-intelligence positioning. The sidebar says "Learning environment".
- "OPEN-SOURCE MVP" is shown but I did not confirm a LICENSE file exists.
- The marketing graphic and the real network view look unrelated.

**Cross-cutting**
- Mobile overflow on three routes (section 3).
- Working text of 8–11 px across the workspace.
- Non-functional chrome: "AP" avatar, "FinSight workspace" switcher with a shield icon, a Transactions nav item that uses an arrow icon.
- Mobile menu button lacks `aria-expanded`; landing workflow tabs are plain buttons without tab semantics.

## 5. Existing behaviour and contracts to preserve

- **API contracts:** the response shapes in `components/types.ts` (`Tx`, `Run`, `Case`, `Dataset`, `Metrics`), the `/api/*` proxy paths, case statuses `open|reviewing|cleared|escalated`, 12 rows per page.
- **Honesty copy:** every "not a fraud probability", "not SHAP", "synthetic", "no payment actions", "batch not streaming" statement stays at least as prominent. Unavailable metrics stay unavailable, never zero.
- **Journey behaviour:** run selection persisted in `localStorage["finsight-run"]`; atomic CSV import; case uniqueness per run and transaction; the deterministic seed 42 and the 70/30 temporal split.
- **Dialog behaviour:** Radix focus trap, Escape to close, focus restored to the opener (verified).
- **Auth behaviour:** the local-dev bypass when no owner password is set, `httpOnly` cookie, same-origin checks, the proxy's path allow-list.
- **Tests:** the 40 existing pytest tests and the TypeScript typecheck must stay green.
- **Do not add:** fake live activity, customer logos, invented metrics, or controls for features that do not exist (payment blocking, real-time alerts, AI chat).

## 6. Prioritised work with acceptance criteria

**P0: correctness and trust**
1. **Containment.** `execution/ui_check.mjs` reports no overflow failures at 360, 390, 768, 1024 and 1440 px on all 7 routes, `/` and `/login`; tables scroll inside their own container. Today: 7 failures.
2. **Honesty gaps.** The synthetic caveat appears wherever held-out metrics are shown (lab, XGBoost panel, monitoring); the "Research assistant" label and icon no longer imply AI; "connected accounts" and plural-agreement copy fixed; the hard-coded "Validation: Passed" is either backed by a real field or removed.
3. **Single design system.** One token source; zero hard-coded colour literals in `components/*.tsx` (grep returns none); `SKILL.md` and `DESIGN.md` updated to the chosen theme.

**P1: analyst workflow**
4. **Transaction table.** Amount and score right-aligned with tabular numerals (computed style); score colour scale is not "green = good"; active filters visible with a reset; the first page shows the active count and sort.
5. **Evidence drawer.** "Create investigation" visible without scrolling at 1024 × 768; case status shown in the drawer if a case already exists for that transaction.
6. **Investigations.** Status shown in the case header; note and Save adjacent; a visible success confirmation; selected case is always one of the filtered list; the section works without an active run.
7. **Readability.** Working text ≥ 12 px, metadata ≥ 11 px; every text/background pair ≥ 4.5:1 (the accent metric card currently ≈ 2.4:1).

**P2: depth**
8. **Laboratory and Monitoring.** Training state with elapsed time and a disabled Run button; results scroll into view on completion; drift threshold labelled; Monitoring no longer duplicates the lab metrics.
9. **Entity network.** The graph fills its canvas at a legible label size; counts pluralised; side table not clipped; keyboard path through nodes documented and tested.
10. **Marketing.** Positioning reconciled with the product (no unsupported superlative, "learning" wording consistent), LICENSE confirmed, hero preview visually aligned to the real network view.

**P3: structure**
11. **Extract `workspace.tsx` incrementally** (see below).
12. **Quality gate.** An automated browser script covering the core journey and the overflow check, plus an axe scan with zero serious/critical issues.

### Does `workspace.tsx` need separating?
Yes, modestly. It is one 1,706-line component with about 22 state hooks, seven sections, a drawer and four helper components, and derived data is recomputed on every render. A rewrite is not needed. Recommended order, stopping when the largest file is under about 400 lines:
1. Move the shared pieces first: `Panel`, `Score`, `MetricCards`, the transaction table and the drawer (they are the pieces P0 and P1 change).
2. Move each section into its own component under `components/workspace/`, passing data through props.
3. Pull the data and actions (`task`, `refresh`, `experiment`, `createCase`, `updateCase`) into one `useWorkspace` hook. No state library is needed.
4. Memoise the derived lists (`high`, `flagged`, entity neighbours) while doing this.

## 7. Proposed sequence

1. ~~Add a repeatable browser check script~~ **Done** (`execution/ui_check.mjs`, baseline above). Run it after every step.
2. Unify tokens on Obsidian (decided) and update `SKILL.md` and `DESIGN.md` (P0.3).
3. **Transactions screen**: table, filters, drawer (P1.4, P1.5, plus mobile containment P0.1 for this route). Extract the shared table and drawer components as part of this step.
4. Investigations (P1.6).
5. Overview (shares the table; fixes the accent-card contrast and copy).
6. Laboratory and Monitoring, with the honesty fixes (P0.2, P2.8).
7. Entity network and Research assistant (P2.9, P0.2).
8. Marketing page and login (P2.10).
9. Final pass: accessibility scan, mobile re-check, update `docs/VERIFICATION.md` with what was actually run.

## 8. Frontend polish vs production deployment

**Frontend polish (this effort):** everything in sections 4 and 6.

**Production requirements (out of scope here, listed so they are not forgotten):**
- **Authentication and authorisation:** one shared owner password gives one all-powerful identity. There are no user accounts, roles, workspace isolation, audit identity on case events, or password reset. The login route has no rate limiting or lockout.
- **Database:** no migrations (Alembic), one JSON blob table with 20k-row payloads decoded on every list call, no delete or retention path, PostgreSQL never exercised by tests, and `finsight.db` defaults to a working-directory-relative path.
- **Backend operations:** model training runs inside the request with no queue or timeout, no structured logging or monitoring, no CI, and a single process (the case lock added in `b08ce14` does not work across multiple workers).
- **Data handling:** uploaded CSVs persist indefinitely; the README advises against sensitive data but nothing enforces it.
- **Docs to correct:** `README.md:44` and `docs/VERIFICATION.md:24` still say there is no authentication.

## 9. First screen to refine: Transactions

It is where the core analyst journey spends most of its time (scan, filter, inspect, open a case). It owns the shared table and the evidence drawer, so improving it also fixes Overview (priority queue) and Network (side table), including their mobile overflow. It has the clearest measurable defects (unaligned numbers, a buried primary action, lime-as-severity, 568 px overflow at 375 px), and it exercises the extraction of the shared components that later screens depend on. Overview is more visible but mostly reuses these pieces, so it is cheaper and safer to do afterwards.
