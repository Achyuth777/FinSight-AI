# Refinement backlog

Updated 2026-11-01. Evidence is `node execution/ui_check.mjs` (108 of 108 checks pass), `pytest` (41 pass), `next build`, and screenshots in `docs/refinement/screenshots/`. The design system is `DESIGN.md`.

## Completed

| Journey / route | What changed | Evidence |
|---|---|---|
| Transactions (J2 triage) | Docked evidence pane, sheet below 1100px, cards on phones, shared filters, all states | gate `transactions`; `screenshots/transactions/` |
| Overview (J1 entry, J2 start) | Stats replace decorative tiles; "Flagged for review" and "Open investigations" are real links; priority queue before charts; donut and fake status dot removed; share bars; no-flag and zero-row cases stated; skeleton while loading | gate `routes`, `states`; `screenshots/routes/overview-*` |
| Investigations (J3) | Shared tags, fields and notice; run id on each case; deep link `?case=`; link back to the transaction; plain-language decision effects; note counter; Retry on failed save keeps the note | gate `investigations`, `journey` |
| Experiments, Data checks | Shared fields and stats; XGBoost-on-unlabeled explained first; drift unavailable states with reason | gate `models` |
| Linked accounts | Only devices used by more than one account count as links (the old "shared" count included unshared devices); legible graph; full table of linked accounts; `?account=`; phones get the table instead of an unreadable graph | gate `explore` |
| Evidence search | Renamed from "Research assistant"; data-driven example queries that run the search; `?q=` deep link; roadmap text and sparkle icon removed | gate `explore` |
| Login | Instrument styling; `?next=` return after an ended session; not-configured message names the environment variables | gate `states` |
| Cross-cutting | One transaction table everywhere; 401 shows "Your session ended" with a sign-in link; unreachable API says so; `?tx=` reopens evidence, Back and Forward work | gate `routes` |
| Marketing copy | Removed "new standard", the live-looking status dots, "explainable", "learning platform", "ML laboratory" | tsc, build |
| Motion pass | Press scale, sheet and overlay enter/exit by `data-state`, keyboard opens skip animation, reduced motion keeps fades, hover lifts and decorative loops removed, instant in-app scroll, chart tooltip no longer travels | gate `motion` (16 checks) |

## Blockers and decisions needed

1. **Marketing visual redesign** (`/`). Only the overclaiming copy was fixed. Restyling it needs a decision on a Persuade-mode direction; Instrument is approved for the workspace only. The page still uses olive/sage literals.
2. **Session expiry with a real password**: tested by simulating a 401 at the network layer. A real expired cookie was not exercised because the dev server runs with the owner password unset.
3. **Axe scan** (experience step 7) not run; focus, labels and ARIA were checked by hand and by gate only.
4. **README, VERIFICATION, SKILL** still describe old labels and need reconciling with this behaviour.

## Remaining gaps

- No arrow-key stepping between transaction rows.
- Closing evidence uses `history.back()`, which is asynchronous: reopening within a few milliseconds of Escape (faster than a human) is undone by the pending back.
- Phone first screen still shows the context bar before the table.
- Import validation errors are still one message, not a list.
- Retry was tested for a failed request but not for a failed training run.
- Unused legacy CSS (`.metric*`, `.donut*`, `.network-grid`, `.activity-rail`) remains in `globals.css`.
- Open backend audit items: list endpoints decode payloads, `workspace.tsx` is still one large component, no eslint, `dev.mjs` Windows fix, `requirements.lock.txt`.
- `frontend/AGENTS.md` is untracked and was not created by this work.
