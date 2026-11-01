# Release review: FinSight AI frontend

Reviewed 2026-11-01 on `main` (working tree after `b172e10`, plus the final-pass changes listed below, uncommitted). Nothing has been deployed or merged.

## Verdict

| Scope | Status |
|---|---|
| **Frontend, as agreed** (analyst workspace, login, session and error states, accessibility, motion, responsive layouts) | **Complete and verified locally.** No known defect in scope. Manual and deployed checks are still open (below). |
| **Marketing page `/`** | Honest and accessible, **not restyled** to the new design system. Needs a design decision, outside the agreed scope. |
| **Overall system** | **Not ready to release.** Blockers sit in the backend and infrastructure, not in the frontend. |

## Release blockers

| # | Blocker | Layer | Impact if released as is |
|---|---|---|---|
| 1 | One shared owner password; no user accounts, roles or per-user audit identity; no workspace isolation | Backend + product | Anyone with the password sees and edits everything; investigation notes cannot be attributed to a person. Acceptable only for a single-analyst deployment. |
| 2 | `GET /api/runs/{id}` returns every transaction (614 KB for 1,200 rows, about 10 MB at the 20,000-row limit), uncompressed and unpaged | Backend | Slow first load and high memory on large imports. Fine for the demo dataset; poor for real batches. |
| 3 | Production proxy refuses a non-HTTPS backend, and the full signed-in workspace has not been run against a production HTTPS deployment | Infrastructure | Unknown behaviour until deployed: cold-start 502 messaging, TLS, headers at the edge, real latency. |
| 4 | No migrations, case-creation race (no unique constraint), whole-JSON case updates (lost updates under concurrent edits), generic JSON record table | Backend | Data loss or duplicates if two sessions edit the same case; schema changes are manual. |
| 5 | Deployed-only verification not done: HSTS, a script CSP with nonces, screen-reader pass, real phones, other browsers | Verification | Residual accessibility and security risk not visible in a local Chrome run. |

Not blockers, but known: no ESLint, no arrow-key stepping between rows, the marketing page restyle, native selects clip long labels. See "Known limitations".

## Changes to each core journey

Journeys are defined in `experience.md` (J1 to J3). Baseline screenshots are `screenshots/01` to `23`; final screenshots are `screenshots/final/` with the same numbers.

### J1. First analysis: nothing to a scored dataset (Overview, import)

- Empty state names the cause and gives the two choices: **Load synthetic sample** (one click, trains) or **Import CSV**, plus a template download.
- **Analyze with defaults** after an import: two steps instead of four; the sidebar no longer shows the previous run.
- Overview leads with four labelled stats (flagged for review, flagged value in INR, open investigations, rows analysed), then the priority review queue, then charts. The decorative donut and the fake status dot are gone.
- Headline figures scale with their tile and stay on one line from 360px.

| Before | After |
|---|---|
| ![baseline empty overview, desktop](screenshots/03-overview-empty-desktop.png) | ![final empty overview, desktop](screenshots/final/03-overview-empty-desktop.png) |
| ![baseline populated overview](screenshots/07-overview-populated-desktop.png) | ![final populated overview](screenshots/final/07-overview-populated-desktop.png) |
| ![baseline empty overview, mobile](screenshots/04-overview-empty-mobile.png) | ![final empty overview, mobile](screenshots/final/04-overview-empty-mobile.png) |

### J2. Triage: flagged transactions to an open investigation (Transactions, evidence)

- One transaction table everywhere; right-aligned INR with Indian grouping, anomaly percentile with a ruler, status tag with text (Flagged, Standard, In investigation).
- Search, filters, sort and paging are shared and survive in the URL; `?tx=` reopens the evidence, Back and Forward close and reopen it.
- Evidence docks beside the table at 1100px and wider, opens as a labelled modal sheet below that (right-hand at tablet widths, bottom sheet on phones) and rows become cards under 720px.
- "Create investigation" is always visible (sticky bar flush with the container). Long IDs, accounts and merchants truncate with a tooltip in the table and wrap in the evidence view; zero and negative amounts render.
- Focus moves into evidence on open and returns to the row on close; keyboard opens skip animation.

| Before | After |
|---|---|
| ![baseline transactions](screenshots/08-transactions-desktop.png) | ![final transactions](screenshots/final/08-transactions-desktop.png) |
| ![baseline drawer 1024](screenshots/21-drawer-desktop.png) | ![final sheet 1024](screenshots/final/21-evidence-sheet-1024.png) |
| ![baseline transactions mobile](screenshots/15-transactions-mobile.png) | ![final transactions mobile](screenshots/final/15-transactions-mobile.png) |
| (no docked pane existed) | ![final docked evidence 1440](screenshots/final/24-evidence-docked-1440.png) |
| (sheet below 1100px was a drawer) | ![final phone sheet 390](screenshots/final/25-evidence-sheet-390.png) |

### J3. Decide and verify: investigation to a recorded decision (Investigations)

- Status in the header, selection stays visible through filters, works with no run loaded, `?case=` deep link, link back to the transaction, run id on each case.
- Plain-language effect of each decision; note counter (4,000 characters); a failed save keeps the note and offers Retry.

| Before | After |
|---|---|
| ![baseline investigations](screenshots/09-investigations-desktop.png) | ![final investigations](screenshots/final/09-investigations-desktop.png) |
| ![baseline investigations mobile](screenshots/16-investigations-mobile.png) | ![final investigations mobile](screenshots/final/16-investigations-mobile.png) |

### Supporting routes

| Route | Change | Before | After |
|---|---|---|---|
| Linked accounts | Only devices shared by more than one account count as links; legible graph plus a full table; `?account=`; phones get the table | ![](screenshots/10-network-desktop.png) | ![](screenshots/final/10-network-desktop.png) |
| Experiments | XGBoost-on-unlabelled explained first; synthetic-data caveat above metrics; n and positives shown; dataset label no longer clipped | ![](screenshots/11-laboratory-desktop.png) | ![](screenshots/final/11-laboratory-desktop.png) |
| Data checks | Drift unavailable states state the reason; metrics are not duplicated here | ![](screenshots/12-monitoring-desktop.png) | ![](screenshots/final/12-monitoring-desktop.png) |
| Evidence search | Renamed from "Research assistant"; example queries run the search; `?q=`; states that it is keyword matching with no language model | ![](screenshots/13-assistant-desktop.png) | ![](screenshots/final/13-assistant-desktop.png) |
| Login | Instrument styling; `?next=` return; names the environment variables when sign-in is not configured | ![](screenshots/06-login-desktop.png) | ![](screenshots/final/06-login-desktop.png) |
| Marketing (copy and accessibility only) | Overclaiming copy removed, contrast and heading order fixed, decorative loops and a no-op animation library removed; visual style unchanged | ![](screenshots/01-marketing-desktop.png) | ![](screenshots/final/01-marketing-desktop.png) |

Cross-cutting: a session that ends mid-work shows "Your session ended" with a sign-in link that returns to the page; an unreachable API says so; an expired or forged cookie at page load goes to `/login?next=...`.

## Final-pass changes (this review)

| Area | Change |
|---|---|
| Table headers | One style in every table (11px, weight 500, `--muted`). Data checks and Experiments headers were 9px olive; Linked accounts was 13px. Gate check enforces it. |
| Type floor | Panel subtitles and chart legends were 9px, breadcrumb, metadata, pagination, tags and the footer 7 to 10px. Nothing in the workspace now renders under 11px. Gate check measures every visible text node at 375 and 1440px. |
| Footer | Olive 8px text replaced by `--muted` 11px; wraps cleanly on phones. |
| Copy | "Your evidence stays together" became "No investigation selected"; dataset option reads "Name · 1,200" so it no longer clips. |
| Dead code | 117 unused CSS rules, the `signal` keyframes and the `--amber` token removed (`globals.css` 41.8 KB to 32.5 KB). Unused `SheetClose` export removed. |
| Dependencies | Removed `framer-motion` (its only use was a wrapper with `initial={false}`, so it never animated), `class-variance-authority`, `clsx`, `tailwind-merge` (Button now composes class names directly). Public page JS: 189 KB to 142 KB, CSS 16 KB to 14 KB (compressed, `/` at 375px). |
| Kept on purpose | Tailwind: removing it changed 15 of 18 reference screenshots because its preflight reset is still in effect. `@playwright/cli` and `playwright-core` (documented tooling and the gate). `axe-core` (gate). The `directions/` previews (labelled documentation of the design decision). |
| Documents | `DESIGN.md` rewritten to the shipped state; `README.md` (setup, environment variable names, verification commands, limitations); `docs/DESIGN.md` reduced to a pointer; `skills/frontend-design/SKILL.md` and `directives/frontend_quality.md` brought in line; `docs/VERIFICATION.md` marked historical. |

The cleanup was verified pixel-neutral: 18 reference screenshots (9 routes at 375 and 1440, animations off) were byte-identical before and after removing the dependencies and dead CSS.

## Test and browser verification

All run locally on 2026-11-01 with Chrome (Playwright), Windows, scratch SQLite database.

| Command | Result |
|---|---|
| `node execution/ui_check.mjs` (dev server, API on scratch DB) | **164 of 164 checks pass** |
| `node execution/auth_check.mjs` (production build, `next start`, test credentials) | **23 of 23 pass** |
| `python -m pytest -q` | 41 passed, 2 warnings |
| `npx tsc --noEmit` | clean |
| `npm run build --prefix frontend` | compiled; 8 static pages, no errors |
| Sweep: 9 routes at 375, 768, 1280, 1440 with axe (WCAG 2 A/AA, 2.1 AA, best practice), console and network capture | 36 combinations: 0 console errors, 0 failed requests, 0 axe violations, 0 page-level overflow |
| Lint | **Not run.** No ESLint is configured. |

What the gate covers: overflow at five widths and every route; evidence sheet and docked pane, focus and Escape; the case journey with reload; onboarding and import; filters, URL state, Back and Forward; session, error, empty and slow states; motion (rapid open and close, keyboard versus pointer timing, reduced motion, press scale, no looping animation); axe on routes and states; worst-case data (long, zero, negative, huge values); consistency (type floor, one table-header style). The dialog-name, worst-case (sticky bar, ID versus amount, figure wrapping) and type-floor checks were each seen failing before their fix and passing after. The one-table-header-style check was added after the fix and was not run against the old CSS, so it is unproven as a detector.

Measured on a production build in local Chrome (lab numbers, not a performance budget): public pages load 142 to 148 KB of compressed JavaScript, 3 self-hosted font files (59 KB), no third-party requests, layout shift 0.000 on public pages and 0.045 on the workspace shell.

## Deployment prerequisites

1. **Web app (Node 22+)**: `npm ci --prefix frontend`, `npm run build --prefix frontend`, `next start`. Set `FINSIGHT_OWNER_PASSWORD` (16+ characters), `FINSIGHT_SESSION_SECRET` (32+), `FINSIGHT_API_KEY` (32+) and `API_URL` (HTTPS). Without the first three sign-in is disabled; without HTTPS `API_URL` the proxy answers 503.
2. **Backend (Python 3.11 to 3.12)**: `pip install -r requirements.txt`; set `DATABASE_URL` (PostgreSQL recommended, untested here) and the same `FINSIGHT_API_KEY`. The API must be reachable only from the web app, not directly from browsers.
3. **Edge**: terminate TLS; send `Strict-Transport-Security`; add a script CSP with nonces (the app sends only `frame-ancestors`, `base-uri`, `form-action`, `object-src`); compress API responses; set a request timeout at or above the proxy's 55 seconds.
4. **Secrets** live in the host's secret store, not in the repository. `.env.example` lists names only.
5. **Before go-live, run** the manual checks below against the deployed URL, and `node execution/auth_check.mjs --base <url>` with the same owner password and session secret.

## Rollback considerations

- The frontend is stateless apart from a signed cookie; rolling back the web build needs no data migration. Keep the previous build artifact and redeploy it. Sessions survive a rollback if `FINSIGHT_SESSION_SECRET` is unchanged; rotating it signs everyone out.
- The refinement is a series of commits on `main` (`ed96eef` to this pass). A redesign rollback is `git revert` of the range or redeploying the pre-refinement build; the old build keeps working with the current API because API contracts were not changed.
- The backend is the riskier rollback: the database holds datasets, run snapshots and cases as JSON records without migrations. Take a backup before deploying and before any schema or pipeline change; restoring that backup is the rollback.
- Changed behaviours users may notice: sidebar labels (Experiments, Data checks, Linked accounts, Evidence search), the Linked accounts count (only truly shared devices), and sign-in redirects that now carry the page you asked for.

## Needs manual or deployed verification (not run)

1. Screen reader pass (NVDA, VoiceOver); whether dynamic notices are announced reliably.
2. Real phones: iOS Safari safe areas, the bottom sheet with the on-screen keyboard, touch scrolling inside the sheet.
3. Deployed HTTPS: HSTS, nonce CSP, proxy against a real HTTPS API, cold-start message, field performance (Lighthouse CI or CrUX).
4. Firefox and Safari; forced-colors mode; 200 percent zoom and larger text.

## Known limitations

- No ESLint (Next 16 expects a flat ESLint config; a tooling decision).
- No arrow-key stepping between transaction rows; Tab reaches each row's ID button.
- A table with a very large amount at tablet width scrolls inside its own keyboard-reachable region.
- Closing evidence uses `history.back()`, which is asynchronous; reopening within a few milliseconds is undone (not reachable by a human).
- Native selects clip long option labels.
- The marketing page still uses 8 to 11px text in places and the olive/sage palette; legacy Obsidian rules remain for it.
- `workspace.tsx` is still one large component (about 1,370 lines).
- Import validation reports one message, not a list; Retry was tested for failed requests but not for a failed training run.
- `frontend/AGENTS.md` is untracked and was not created by this work.
