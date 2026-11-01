# Production-readiness review: frontend

Reviewed 2026-11-01 against the working tree after the motion pass (`bb792fb`). Skills used: Impeccable (critique lens), Vercel Web Interface Guidelines (fetched from the source URL), Playwright, axe-core 4.x.

## Commands run and results

| Command | Result |
|---|---|
| `node execution/ui_check.mjs` (dev server, scratch SQLite, seeded demo run) | **160 of 160 checks pass** (was 108 before this review; 52 added) |
| `node execution/auth_check.mjs` (production build, `next start`, test owner password and session secret) | **23 of 23 pass** |
| `pytest -q` | 41 passed, 2 warnings |
| `npx tsc --noEmit` | clean |
| `next build` | compiled, TypeScript finished, 8 static pages, no errors |
| Route sweep: 9 routes x 375, 768, 1280, 1440 with axe (WCAG 2 A/AA, 2.1 AA, best practice), console and network capture | 36 combinations: 0 console errors, 0 failed requests, 0 axe violations, 0 page-level horizontal overflow |
| Lint | **Not run: the project has no ESLint and Next 16 no longer ships `next lint`.** Not added without a decision (see below). |

The first sweep ran against a production server and rendered the signed-out state on every workspace route, so its clean axe result for those routes was not meaningful. Populated states were re-tested against the dev server, which the gate uses because production sign-in needs an HTTPS backend.

## Fixed in this review

| Route | Defect | Evidence | Fix |
|---|---|---|---|
| Transactions (docked and sheet) | Evidence dialog had no accessible name: Radix pointed `aria-labelledby` at an id the title no longer carried (axe `aria-dialog-name`, 768 and 390) | gate `a11y` failed, then passed | `Sheet` takes explicit `labelledBy` and `describedBy` ids |
| Transactions | Long unbroken IDs, accounts and merchants ran under the amount column; at 768 the table scrolled sideways with ordinary data | screenshot `worst-evidence-1440` before/after; gate `worst` | cell content truncates with ellipsis and a title; merchant folds into the ID cell below 1100px; tighter tablet padding. Ordinary data now fits at 768 |
| Transactions evidence | Sticky "Create investigation" bar left a 20px strip where scrolled content showed through | gate `worst` (3 failures before the fix) | bottom padding moved into the bar, which is flush with its container |
| Overview @360, 375 | "Flagged value" broke mid-number (`₹3,50,471.1` / `6`) | gate `overview: every headline figure stays on one line` failed at 360 and 375 | figures scale with their tile width (container query) |
| Data checks, Linked accounts, Experiments, Transactions @375, 768 | Scrollable tables could not be reached by keyboard (axe `scrollable-region-focusable`) | sweep | tables are focusable labelled regions |
| `/` | Contrast failure on the closing call to action; heading order skipped levels (h1 to h3, h2 to h4); `/favicon.ico` returned 404 | sweep | text colour and size, heading levels, `app/icon.svg` |
| Login | Redirect for an expired or missing session dropped the return path, and the notice claimed "Your session ended" even for a first visit | `auth_check.mjs` | redirect carries `?next=`; notice reads "Sign in to continue to /app/..." |
| All | No security headers | `auth_check.mjs` | `nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy`, `Permissions-Policy`, and a CSP limited to `frame-ancestors`, `base-uri`, `form-action`, `object-src`; `X-Powered-By` removed |
| Evidence panel | "1 days" | gate `worst` | singular form |
| Search inputs | No `autocomplete="off"`, `spellcheck=false`, or `type="search"` on identifier searches | guideline review | added |
| Formatting | `toLocaleString()` used the browser locale while money used `en-IN` | code review | counts use `en-IN` |
| Linked accounts graph | Keyboard focus on a node changed only the stroke colour | code review | focused nodes also get a thicker stroke |

## Regression tests added

- `execution/ui_check.mjs --only a11y`: axe on all workspace routes, the docked pane, both sheets, evidence results, error, session-ended and empty states, `/`, `/login`, and a 290-character search query; the first 14 Tab stops on Transactions all show a focus indicator.
- `--only worst`: long, zero and negative rows from the live API response with values rewritten in the browser; overflow, containment, ID cell versus amount, sticky bar, singular "1 day" at four widths; table fit at 768; single-line headline figures at five widths.
- `--only motion` (earlier commit) still passes inside the 160.
- `execution/auth_check.mjs`: sign-in, wrong password, return path, cookie flags, expired and forged cookies, API 401 for each, security headers, third-party requests, console errors and layout shift on public pages. It needs a production server and the two environment variables, and prints no secrets.
- The new `worst` checks were run against the pre-fix CSS and failed there (sticky bar at three widths, ID-versus-amount at 768, figure wrapping at 360 and 375), so they do detect the defects.

## Measured

Production build, Chrome, no throttling, this machine only:

| Page | JS (compressed) | CSS | Fonts | Third-party requests | LCP | CLS |
|---|---|---|---|---|---|---|
| `/` @375 | 189 KB | 16 KB | 59 KB, 3 files, self-hosted | 0 | 316 ms | 0.000 |
| `/` @1440 | 189 KB | 16 KB | 59 KB | 0 | 192 ms | 0.000 |
| `/login` @375 | 195 KB | 16 KB | 59 KB | 0 | 112 ms | 0.000 |
| `/app/transactions` @1280 (signed in, API unavailable) | 321 KB | 16 KB | 59 KB | 0 | 176 ms | 0.045 |

These are lab numbers on a fast local machine, not a performance budget. No Lighthouse was run.

## Checked by reading code

- No `dangerouslySetInnerHTML`, `innerHTML`, `eval`, `target=_blank` or external links. Dynamic hrefs are same-site: the marketing links are built from a fixed list, and the login `next` value must match `^/app/[a-z]+$`.
- No `NEXT_PUBLIC_*` variables and no `process.env` in client code; secrets are read only in route handlers and `lib/session.ts`.
- Evidence search is keyword matching with no language model, so there is no generated text, citation rendering or "unavailable result" state beyond the no-match message, which the gate covers.
- The API proxy checks origin on writes, limits path characters and body size, and requires an HTTPS backend in production.

## Needs manual or deployed verification (not run)

1. **Screen reader pass** (NVDA, VoiceOver). Notices use `role=status` and `role=alert` and axe finds no problems, but whether dynamic notices are announced reliably was not tested.
2. **Real phones**: iOS Safari safe areas, the bottom sheet with the on-screen keyboard, touch scrolling inside the sheet. Emulated viewports only.
3. **Deployed HTTPS environment**: Strict-Transport-Security, a nonce-based script CSP, proxy behaviour against a real HTTPS API, cold-start 502 message, and field performance (CrUX or Lighthouse CI). Local production mode cannot reach the plain-HTTP API, so the signed-in workspace was exercised only against the dev server.
4. **Forced-colors and high-contrast modes**; browsers other than Chrome (Firefox, Safari).
5. **Dynamic text size and zoom to 200 percent** beyond the widths above.

## Blockers outside the frontend

- `GET /api/runs/{id}` returns every transaction: 614 KB for 1,200 rows (about 10 MB at the 20,000-row limit) with no pagination and no compression at the API. Server-side paging is needed before large datasets are comfortable.
- The proxy refuses an HTTP backend in production, so a local end-to-end production run needs a TLS-terminated API.
- Closing evidence uses `history.back()`, which is asynchronous; reopening within a few milliseconds is undone (frontend, left as-is, recorded in the backlog).
- Backend items already in the backlog remain open (list endpoints decode payloads, no lockfile, no ESLint).

## Remaining frontend gaps

- No ESLint. Adding it is a tooling decision (Next 16 expects a flat ESLint config); not done here.
- The marketing page still uses 8 to 11px text in several places and an olive/sage palette; it passes axe contrast but a legibility pass belongs to the Persuade redesign.
- No arrow-key stepping between transaction rows.
- A table that is wider than its container (very large amounts at 768) scrolls inside its own region, which is now keyboard-reachable, rather than reflowing.

Screenshots: `docs/refinement/screenshots/review/`.
