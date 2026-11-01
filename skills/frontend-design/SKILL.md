---
name: frontend-design
description: Design, extend and visually verify FinSight AI marketing pages and fraud investigation interfaces. Use when changing FinSight typography, layouts, charts, forms, responsive behavior or accessibility, including new dashboard modules.
---

# FinSight frontend design

Build an evidence-first financial investigation product. Read the affected page and its data contract before changing presentation. Keep the marketing site spacious and the analyst application compact; share colors, borders, controls and language across both.

## Design tokens

The root `DESIGN.md` (Instrument) is the source of truth for tokens, type, spacing, components, responsive rules, charts and motion; `frontend/app/globals.css` holds the `:root` tokens and `frontend/app/instrument.css` the workspace styles. Do not copy values into this file. Lime is for data marks, the selection line and the primary button only; never imply that colour means confirmed fraud. No text under 11px in the workspace, tabular numerals for figures, no gradients, glows, emoji or invented customer logos.

## Workflow

1. Identify the analyst action and data source. Use actual backend results. Label synthetic data, model runs and unavailable results explicitly.
2. Reuse the Button, Panel, chart, status and form patterns before creating another variant. Use semantic links for navigation and buttons for actions.
3. Keep the 240px grouped sidebar and bounded content column (see DESIGN.md). Collapse the sidebar behind a labeled mobile control; stack panels at narrow widths. Contain horizontal scrolling within tables.
4. Give each chart a title, units, legend, readable tooltip and accessible textual summary. Never plot decorative numbers as measured results.
5. Label anomaly percentiles distinctly from fraud probabilities. Feature deviations are descriptive context, not SHAP. Label SHAP with its model and output scale. Do not render unavailable metrics as zero.
6. Implement loading, empty, error and success states. Every primary control needs a real action and observable result. Keep dialog focus trapped, Escape-close enabled and focus restored using Radix.
7. Run TypeScript/build and `node execution/ui_check.mjs` (see README, Verification). Inspect actual rendered marketing, populated dashboard and transaction dialog. Review a narrow viewport when the environment supports it. Check keyboard reachability, text contrast and overflow.
8. Fix observed problems and repeat only affected checks. Record evidence and remaining limitations in docs/refinement/.

## Concrete evaluations

- Add a feature-drift panel: show measured feature names, PSI values and a labeled heuristic threshold, an empty state and mobile layout.
- Add an investigation drawer: preserve original evidence, display non-probabilistic scores, support keyboard close and explicit case creation.
- Add a public capabilities section: communicate the real MVP without performance claims, customer logos or production guarantees.

Compare results against data correctness, semantic controls, consistent tokens, readable information hierarchy and responsive containment. Prefer honest partial functionality over simulated production behavior.
