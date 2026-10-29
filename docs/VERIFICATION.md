# Verification record — 26 October 2026

## Completed

- Read the supplied AGENTS.md, CLAUDE.md, GEMINI.md and skill-creation guide. Implemented directives, API orchestration and deterministic Python execution as separate layers.
- Inspected the live Orca Fraud homepage and supplied dashboard screenshot. Used original FinSight branding and code-drawn illustrations.
- Production Next.js build and strict TypeScript checks pass.
- 17 Python tests pass: deterministic scoring, valid feature matrix, eight invalid CSV cases, unavailable unlabeled evaluation, future-feature leakage, real XGBoost/SHAP, equal-time split rejection, uninformative constant-feature PSI, complete case workflow and atomic imports.
- A separate live HTTP smoke test starts an isolated FastAPI server and exercises dataset creation, model training, SHAP, case creation/update/readback and cited evidence search. Results: docs/smoke-results.json. Reproduce with `python execution/smoke.py` from project root.
- Rendered the public homepage and empty workspace in the supplied browser. Inspected screenshots for visual hierarchy and spacing. Found and corrected hidden hero content caused by initial motion opacity.
- Independently reviewed drift-panel and transaction-drawer source using the created frontend design skill. Fixed missing modal error/status feedback, explicit focus restoration, exact currency precision, transformed feature labels, in-drawer provenance, drift scale labeling, constant-feature drift handling, and evidence overflow rules.
- Reviewed CSS breakpoints at 1200, 900 and 640 pixels; semantic labels, focus indicators, reduced-motion behavior, table scrolling, and Radix dialog semantics are present.

## Verification limits

The development preview served HTML but client initialization did not complete. Its logs showed Next development runtime and origin-related errors. The preview was changed to the verified production build. The cloud browser then rejected reopening the preview through its URL security policy, so browser work stopped.

Consequently, populated dashboard screenshots, final visual reinspection, browser click-through of every route, chart tooltip interaction, keyboard focus restoration, CSV file-picker interaction and actual mobile viewport checks remain **unverified**. Source review and API tests do not substitute for those checks. The delivered UI should be checked locally before being described as fully QA-complete.

PostgreSQL connection support and Docker Compose configuration are provided, but PostgreSQL execution was not tested here. SQLite was used for automated verification. No production deployment, external GitHub repository or remote GitHub issues were created.

## Known MVP boundaries

- No actual authentication, role-based authorization or workspace isolation; local single-user only.
- Full datasets and run snapshots use a generic SQLAlchemy JSON-record table. No migrations, concurrent case uniqueness constraint or optimistic locking yet.
- Models train per experiment; fitted artifacts and incremental/online inference are not implemented.
- Velocity and distance are supplied data fields; the application does not claim to derive them from live device telemetry.
- No MLflow, Evidently or semantic/generative RAG runtime integration. The roadmap describes each extension.
- Research is deterministic token matching with source links, not AI-generated reasoning.
- Synthetic data correlations make metrics optimistic and nonrepresentative of production fraud performance.
- Graph view shows at most 8 devices and 10 neighbors while displaying full counts.

## Local browser acceptance pass

1. Start app with README commands. Confirm the landing hero and workflow tabs.
2. Load demo and inspect actual populated chart/table values.
3. Visit all seven sidebar routes and use the mobile menu at 390px width.
4. Filter transactions, sort, paginate, open details, close with Escape, and check focus returns to the opener.
5. Create a case; save a note and decision; reload and confirm persistence.
6. Run XGBoost + SHAP, inspect its metrics, then load an older experiment.
7. Upload valid and invalid CSVs; confirm validation feedback and no partial imports.
8. Test cited research links, graph keyboard navigation and chart tooltips.
9. Run an automated accessibility scanner plus manual keyboard and screen-reader checks.


## 2026-10-29 — Sign-in password visibility

- Added an explicitly labeled show/hide password button, a 44px target, and visible keyboard focus. Passwords remain masked initially; autocomplete, required input, minimum length and authentication behavior are unchanged.
- Production Next.js build and TypeScript checks passed. Started the production server and verified HTTP 200 for landing and login. Inspected rendered login HTML for masked input, native validation, accessible label/control association, and non-submit button type.
- Browser screenshot and interactive keyboard/mobile verification could not run: no browser binary was installed, and Playwright's Chromium download repeatedly returned an invalid archive. No claim of visual or end-to-end verification is made for this change.
