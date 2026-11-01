# Frontend quality gate

Goal: preserve FinSight's evidence-first design (see `DESIGN.md`) and working interactions.
Input: requested page and backend response contract.

Steps:

1. Read `DESIGN.md` and `skills/frontend-design/SKILL.md`. Implement semantic controls and real data states (loading, empty, error with Retry, session ended).
2. Run `npm run typecheck --prefix frontend` and `npm run build --prefix frontend`.
3. Start the API on a scratch SQLite database with `FINSIGHT_INSECURE_DEV=1` (the API answers 503 without a key otherwise) and `npm run dev --prefix frontend`, then run `node execution/ui_check.mjs` (about 3 minutes). It covers overflow at five widths, evidence sheet and docked pane, the core journey, onboarding, filters and URL state, session and error states, motion, axe accessibility scans, worst-case data and consistency (type floor, one table-header style). Use `--only <group>` while iterating.
4. For anything touching sign-in, cookies, headers or redirects, build, start `next start` with `FINSIGHT_OWNER_PASSWORD`, `FINSIGHT_SESSION_SECRET` and `FINSIGHT_API_KEY` set, and run `node execution/auth_check.mjs` with the same owner password and session secret.
5. When a defect is fixed, add or extend a gate check that fails without the fix (stash the fix, run the check, restore it).
6. Record results and limitations honestly in `docs/refinement/` (never mark an unrun check as passing).

Learnings:

- A scratch database is mandatory: the gate imports files and creates cases, and the latest run is what the workspace shows.
- Production mode needs an HTTPS backend; use the dev server for populated states and `auth_check.mjs` for the web layer.
- Do not delete Tailwind without a pixel comparison: its preflight reset is still in use.
- Capture comparison screenshots with animations disabled and wait for dev hot reload to finish, or identical builds will differ.
