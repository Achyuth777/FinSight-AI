# FinSight AI — product experience definition

Builds on `baseline.md` (findings) and `tooling.md` (tools). Planning only: no product code changed. The authenticated workspace (`/app/*`) is the core of this repository and is the focus. The marketing page and login are a separate surface, handled last.

## 1. Product brief

**Primary user.** One analyst who owns the data: a fraud or risk analyst evaluating a batch of transactions, who may also be the engineer who built the pipeline. There is one identity, one workspace and no team features. The repo also calls itself "a learning platform"; that stays a *secondary* framing (the persistent "synthetic sample" label) and does not drive the layout.

**Main task.** From a batch of INR transactions, decide which unusual ones deserve investigation, and leave an auditable record of what was decided and why.

**What the analyst needs in order to decide**

| Need | Where it comes from today |
|---|---|
| What happened: amount (INR), time (UTC), merchant, account, device | `Tx` fields |
| How unusual: anomaly percentile against the training window, flagged or not | `risk_score`, `flagged` |
| Why it stands out: the top feature deviations (descriptive, not causal) | `reasons` |
| Context: the account's earlier transactions, shared devices and linked accounts | derived from the run's rows |
| Can the scores be trusted: held-out metrics with sample size, drift, data period | `metrics`, `drift`, run counts |
| State of work: which transactions already have an investigation, and its status | `cases` |

**What the product is not** (and must never imply): a live monitor, a payment blocker, a fraud-probability estimator, or an AI assistant. It is batch analysis with human decisions.

**Shortest useful path today and proposed**

| Starting point | Today | Proposed |
|---|---|---|
| Demo data | 1 click (loads and trains) | unchanged |
| Own CSV | pick file → go to ML laboratory → check dataset → Run experiment (4 steps; nothing is scored after import, and the sidebar still shows the *previous* run) | pick file → **Analyze with defaults** (2 steps), same settings and endpoint the demo already uses |
| Open an investigation | find row → open drawer → scroll to the bottom → Create | find row → open drawer → Create (always visible) |

## 2. What is wrong with the current experience

Evidence is in `baseline.md`; these are the experience-level conclusions.

**Navigation and labels**
- Seven flat, equal-weight items with mixed noun styles. "Transactions" uses an arrow icon.
- **"Monitoring"** shows a one-off batch check (validation, drift, timing). The word promises something live.
- **"Research assistant"** with a sparkle icon promises AI; it is keyword matching.
- **"ML laboratory"** and "Monitoring" both describe the same thing (is this model's evidence trustworthy) but are split with no relationship shown.
- "Case" and "investigation" are used interchangeably (queue says case; button and nav say investigation).
- Page titles are slogans ("A clearer view of risk.", "Evidence, within reach.") rather than task labels, and the eyebrow numbers ("INTELLIGENCE / 03") carry no meaning.

**Competing and misplaced actions**
- "Import CSV" appears top-right on every page, including Network and Assistant where it is irrelevant. "Load demo" appears twice on the empty Overview.
- The primary action in the evidence drawer is below the fold.
- Sidebar chrome that does nothing: a workspace switcher, an "AP" avatar, a "Learning environment" card with a link to the marketing page.

**State handling**
- Only one empty state exists ("no data"). There are really three: no dataset (S0), dataset imported but no run (S1), run ready (S2). After an upload while a run exists, the UI keeps showing the old run's context under a banner telling the user to go train.
- Investigations is hidden unless a run is loaded, even if saved investigations exist.
- Feedback is a single banner at the top of the page, far from where the action happened.

**Freshness and sources**
- The dataset strip shows the *analysis date* ("2026-11-01") next to the row count, which reads as the data date. The demo data is a fixed sample from 2026-10-01 to 2026-10-07 (checked in `demo_data` and the API); the strip never says so. Nothing shows the data period.
- A glowing green status dot beside "Synthetic sandbox" (and "Model run complete") reads as "online". It is static, but status dots conventionally mean live.

## 3. Proposed navigation and screen hierarchy

Routes are unchanged (README and bookmarks keep working); only labels, grouping and order change.

```
WORK
  Overview            /app/overview        what needs attention now
  Transactions        /app/transactions    scan, filter, inspect  (primary workspace)
  Investigations      /app/investigations  open work, notes, decisions
EXPLORE
  Linked accounts     /app/network         was "Entity network": accounts sharing a device
  Evidence search     /app/assistant       was "Research assistant": keyword search with citations
MODEL
  Experiments         /app/laboratory      was "ML laboratory": configure and run, held-out results
  Data checks         /app/monitoring      was "Monitoring": validation, drift, timing for this batch
```

Order follows the journey. "Model" items move to the bottom because they are consulted to *trust* results, not to make decisions.

**Persistent context bar** (replaces the dataset strip and the topbar environment chip), on every workspace screen when a run exists:

> `Payment sandbox (SYNTHETIC SAMPLE)` · data period `2026-10-01 → 2026-10-07 UTC` · `1,200 rows` · `INR` · analysed `2026-11-01 07:54 UTC` · run `97c47264` · Isolation Forest `[Change run]`

Secondary line, always visible: *Batch analysis. Anomaly percentile is a ranking against training data, not a fraud probability. No payments are blocked.*

**Sidebar footer:** Sign out, and one neutral line "Single analyst · batch analysis". Remove the avatar, workspace switcher and "Learning environment" card.

**Page header:** task title (the nav label) plus one sentence on what the screen answers. No slogans, no numbered eyebrows. Page actions only where they apply (Import CSV on Overview and Experiments, not everywhere).

**Per-screen information hierarchy**

| Screen | First | Second | Last |
|---|---|---|---|
| Overview | Needs attention: flagged count, open investigations, flagged value (labelled "review exposure") | Priority queue (top 5) | Charts, run summary |
| Transactions | Table: Transaction, Time (UTC), Account, Merchant, **Amount (INR)** right-aligned, **Anomaly percentile** with band, Status (Flagged / In investigation: status) | Filters with visible active chips and reset | Pagination |
| Drawer | Id, amount, percentile; pinned **Create investigation** (or **Open investigation** when one exists) | Why it stands out; account and device context; account history | Raw fields; provenance (run, dataset, split) |
| Investigations | Case header: id, amount, **status**, percentile | Evidence snapshot; timeline; note and Save together | Decision control with plain-language effect |
| Linked accounts | Graph filling its canvas with legible labels; plain statement that edges mean a shared device | Side summary with correct plurals | Account's transactions (contained table) |
| Evidence search | Search with example queries drawn from the data | Cited results opening the drawer | Method note ("matches text; no AI") |
| Experiments | Settings next to the Run button; elapsed state | Held-out metrics with n and caveat; XGBoost comparison | Run history |
| Data checks | Validation facts actually measured; drift table with the 0.20 threshold labelled | Timing | (no duplicate performance panel) |

## 4. How financial and AI information is communicated

Applies to every screen. These are rules for what exists today; no new data or features.

| Topic | Rule |
|---|---|
| **Currency** | INR only, `₹` with Indian digit grouping and two decimals, `Intl` `en-IN` as today. Column headers say "Amount (INR)". No abbreviations (no "₹3.5L"). The flagged total is labelled "Flagged value: review exposure, not confirmed loss" |
| **Units** | Percentile: 0–100, one decimal, headed "Anomaly percentile (vs training)". Velocity: "transactions in prior hour (as supplied)". Distance: "km (as supplied)". Age: "days at transaction time". Deviations: "IQR from training median; amount, age and distance on log1p scale". Raw anomaly score only in the drawer's detail list |
| **Dates and time** | Always UTC, written `2026-10-03 20:16 UTC`. Tables show date and time. No relative times ("2 hours ago") anywhere, because they imply liveness |
| **Freshness** | Two separate facts, always shown together: **data period** (first to last transaction timestamp) and **analysed** (run time). No "live" or "real-time" wording and no status dots that read as "online". Synthetic data carries a permanent chip "SYNTHETIC SAMPLE · fixed sample, not live" |
| **Sources** | Every figure is traceable to run and dataset (context bar, drawer provenance). Evidence search results keep their numbered citations and open the transaction. Metrics name their split ("held-out, n = 360") |
| **Uncertainty** | The percentile caption is visible on the first screen that shows scores, and in the table header tooltip. "Flagged" means "crossed the model threshold set by the contamination setting", not a verdict. Metrics always show sample size and positives (e.g. "360 held-out rows, 17 positives"; positives = false negatives + true positives, from the existing confusion matrix). No percentage appears without its n. Synthetic caveat sits directly above every metric block (Experiments, XGBoost panel, Data checks) |
| **Unavailable** | Never `0`, never a bare dash. Write "Unavailable: <reason>" using the reason the API already returns (`metrics.reason`, null PSI for constant features). XGBoost on an unlabeled dataset says so *before* running, not as a post-run error |
| **AI and models** | Say "model" and name it (Isolation Forest, XGBoost). XGBoost scores are uncalibrated classifier outputs; SHAP is in raw model-margin units and labelled so. Feature deviations are "descriptive context, not attribution". Evidence search is described as keyword matching. No sparkle icon, no "assistant" or "AI" wording anywhere |

## 5. The three most important journeys

### J1. First analysis: from nothing to a scored dataset
1. Land on Overview, state **S0** (no data): two clear choices, "Load demo data" and "Import CSV", plus the template link. No third duplicate button.
2. *Demo:* one click loads and trains (existing). *Import:* pick the file; validation errors appear next to the import control as a readable list (unchanged rules: 100–20,000 rows, ≤5 MB).
3. State **S1** (dataset saved, no run for it): a single prominent **Analyze with defaults** (contamination 7%, 150 trees, unsupervised; the settings the demo uses), plus "Choose settings in Experiments".
4. Arrive on Transactions filtered to flagged, sorted by percentile, with the context bar populated.

*Feedback:* progress text with elapsed time while training; success names the dataset, row count, flagged count. *Recovery:* a failure keeps the dataset and offers Retry; a validation failure imports nothing (existing atomic behaviour).

### J2. Triage: from flagged transactions to an open investigation
1. Overview "Needs attention" or the Transactions queue, flagged first.
2. Open a row; the drawer shows percentile with its caveat, why it stands out, account and device context.
3. Press **Create investigation** (always visible). The drawer stays open and the button becomes **Open investigation (open)**, with the status. The row in the table now shows "In investigation: open".

*Feedback:* inline in the drawer, not a banner on the page behind it. *Recovery:* if the call fails the error appears in the drawer with Retry; nothing is half-created (case ids are deterministic per run and transaction).

### J3. Decide and verify: from an investigation to a recorded decision
1. Investigations; the selected case always appears in the filtered list.
2. Header shows status. Read the evidence snapshot and timeline.
3. Write a note and Save (adjacent controls); the new timeline entry appears with its UTC time, and "Saved" confirms at the control.
4. Change the decision; the helper text says it affects this investigation only and that nothing is blocked.
5. Reload: note and status are still there (verified by `ui_check.mjs`).

*Recovery:* a failed save keeps the typed note in the text area and shows the error beside it.

## 6. Screen and state inventory

Legend: ✅ exists and fine · ⚠️ exists, needs work · ❌ missing.

| Screen | Loading | Empty S0 (no data) | S1 (dataset, no run) | Ready (S2) | Error | Special states |
|---|---|---|---|---|---|---|
| Overview | ⚠️ banner only | ⚠️ duplicate buttons | ❌ | ⚠️ | ⚠️ banner + Retry | no flagged rows ❌; no investigations ✅ |
| Transactions | ⚠️ | ⚠️ shared empty | ❌ | ⚠️ | ⚠️ | filters match nothing ✅; first page all flagged (info-less badge) ⚠️ |
| Drawer | ⚠️ | n/a | n/a | ⚠️ CTA below fold | ✅ inline | case already exists ❌; keyboard close and focus return ✅ |
| Investigations | ⚠️ | ❌ hidden without a run | ❌ | ⚠️ | ⚠️ | no investigations ✅; filter hides selection ⚠️; failed save keeps note ❌ |
| Linked accounts | ⚠️ | ⚠️ | ❌ | ⚠️ overflow at 1440 px | ⚠️ | account with no links ❌; capped at 8 devices / 10 accounts ✅ (stated) |
| Evidence search | ⚠️ | ⚠️ | ❌ | ✅ | ⚠️ | no match ✅; example "Atlas Travel" may not exist in a user's data ⚠️ |
| Experiments | ⚠️ banner | ✅ | ⚠️ should be the default view here | ⚠️ | ⚠️ | unlabeled data with XGBoost ticked ❌ (error after running); metrics unavailable ✅; no progress/elapsed ❌ |
| Data checks | ⚠️ | ⚠️ | ❌ | ⚠️ hard-coded "Passed" | ⚠️ | drift unavailable (constant feature) ✅ |
| Login | ✅ busy state | n/a | n/a | n/a | ✅ | not configured (503) ⚠️ message only |
| Marketing (separate) | ✅ | n/a | n/a | ⚠️ | n/a | — |

Cross-cutting states to add once, in shared components: the S0/S1/S2 resolver, a context bar, an inline action-feedback pattern, and an "Unavailable: reason" value component.

## 7. Scoped implementation order

Aligned with `baseline.md` §7, re-cut by journey. Each step ends with `node execution/ui_check.mjs` (baseline: 42 of 50) and the existing 40 pytest tests staying green.

| # | Scope | Journeys / screens | Done when |
|---|---|---|---|
| 0 | **Foundations:** Obsidian tokens only (no hard-coded greens), shared components extracted from `workspace.tsx` (`Panel`, `Score`, table, drawer, `Unavailable`), S0/S1/S2 resolver, context bar, nav relabel and grouping, remove fake sidebar chrome | all | no colour literals in `components/*.tsx`; nav matches §3; context bar shows period, analysed time, run, synthetic chip on every screen |
| 1 | **Transactions + drawer** (J2) | Transactions, drawer | right-aligned INR and percentile columns; "In investigation" status; CTA visible at 1024 × 768 in `ui_check`; overflow fixed on this route |
| 2 | **Investigations** (J3) | Investigations | status in header; selection always in list; works with no run; failed save keeps the note |
| 3 | **Onboarding and import** (J1) | Overview, S0/S1 | import → Analyze takes 2 steps; S1 state exists; "Import CSV" only where relevant |
| 4 | **Experiments + Data checks** | Experiments, Data checks | n and positives beside every metric; synthetic caveat on all three metric blocks; XGBoost-on-unlabeled explained before running; no duplicated metrics; threshold labelled |
| 5 | **Linked accounts + Evidence search** | Network, Assistant | no overflow at any width; correct plurals; honest labels and icon; data-driven example queries |
| 6 | **Marketing and login** (separate surface) | `/`, `/login` | positioning reconciled with the product; no unsupported superlative; login not-configured message tells the owner what to set |
| 7 | **Final pass:** axe scan, docs (`README`, `VERIFICATION`, `DESIGN`, `SKILL`) updated to what was verified | all | no serious/critical axe issues; docs match behaviour |

## 8. Business-behaviour changes (explicit and justified)

None touches the backend, the API contracts or the scoring.

| Change | Why it is acceptable |
|---|---|
| UI labels renamed (Monitoring → Data checks, Research assistant → Evidence search, Entity network → Linked accounts, ML laboratory → Experiments); routes unchanged | Labels currently promise live monitoring and AI that do not exist |
| Import offers "Analyze with defaults" | Same endpoint and defaults the demo already uses; still an explicit user action. It removes a 4-step detour |
| Drawer stays open after creating an investigation | UI-only; avoids a silent close and makes the new state visible |
| "In investigation" status in the table | UI-only join of data the page already loads |
| Data period shown | Derived from the run's first and last transaction timestamps |
| Metrics show n and positives | Derived from the existing confusion matrix and counts |
| `GET/POST /api/datasets*` responses gain a read-only `labeled` boolean (true when rows carry `is_fraud`) | Additive and derived from stored rows; lets Experiments explain before running that XGBoost needs labels. No scoring or storage change; covered by a test |
| Sidebar avatar, workspace switcher and "Learning environment" card removed | They imply identity, multi-workspace support and a learning mode that are not implemented. The "no payment actions" statement is kept in the context bar |

**Deliberately not added:** live feeds or alerts, an AI chat, multi-user features, run comparison, export, notifications, themes. None exists in the product, and none is needed for the three journeys.

## 9. Key decisions

1. **The product is a single-analyst batch review tool.** That is what the code does, so the experience is organised around deciding and recording, not around dashboards. Overview is a triage page, not a showcase.
2. **Labels must not promise what does not exist.** Three nav labels did. Renaming costs nothing and removes the biggest honesty risk after the 100% XGBoost panel.
3. **Freshness is two facts, not one.** The analysis date next to the row count is the most likely misreading in the product; showing the data period and the synthetic chip together fixes it without changing any data.
4. **Navigation is grouped by what the analyst is doing** (work, explore, check the model), with routes unchanged so nothing external breaks.
5. **The primary action never hides.** Create investigation and Save note sit next to what they act on.
6. **Three states, not one.** S1 is where a user who just imported a CSV currently lands in a confusing mix of old and new data.
7. **Authentication and authorization stay out of this effort** (see `baseline.md` §8); the experience assumes the existing single-owner login.

**Decided (2026-11-01):** (a) "Analyze with defaults" after a CSV import is accepted as a one-click action (contamination 7%, 150 trees, unsupervised), with "Choose settings in Experiments" beside it.

**Still open, working defaults until you say otherwise:** (b) "Investigations" is the object name everywhere in the UI; the API keeps "case". (c) The context bar's "Change run" opens the run history in Experiments (cheaper than a new in-place switcher, and the history already exists).
