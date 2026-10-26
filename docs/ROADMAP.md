# FinSight AI — 30 days of genuine engineering

The MVP is the starting point. These are future tasks, not completed work. Budget roughly 2 focused hours per day; split larger items across sessions rather than rushing. Each day has a ready-to-create GitHub issue below. No remote repository was supplied, so these are issue drafts, not claims that GitHub issues already exist.

Open one issue when beginning a task. Implement, verify, explain what changed, then make a meaningful commit. Never backdate or automate activity for a contribution graph.

# Day 01: Make setup reproducible

## Task
Add a clean-machine setup check for Python, Node and PostgreSQL.

## Acceptance criteria
- [ ] A fresh clone starts both services using README commands.
- [ ] Document observed limits and assumptions.

## Verification
Run installation in a clean virtual environment and execute health check.

## Suggested commit
`docs: verify clean-machine setup`

## Concept learned
Dependency isolation and reproducibility. Explain the implementation aloud before closing the issue.

---

# Day 02: Document the transaction contract

## Task
Publish field definitions, units and three valid/invalid CSV examples.

## Acceptance criteria
- [ ] Every column has type, range, null policy and temporal meaning.
- [ ] Document observed limits and assumptions.

## Verification
Validate fixtures against validate_csv.

## Suggested commit
`docs: define transaction data contract`

## Concept learned
Data contracts. Explain the implementation aloud before closing the issue.

---

# Day 03: Expand CSV validation coverage

## Task
Add encoding, boundary-size, timestamp and malformed-quote cases.

## Acceptance criteria
- [ ] Invalid imports never create dataset records.
- [ ] Document observed limits and assumptions.

## Verification
Run parameterized validation and API tests.

## Suggested commit
`test: cover CSV ingestion edge cases`

## Concept learned
Atomic validation. Explain the implementation aloud before closing the issue.

---

# Day 04: Add dataset provenance

## Task
Store SHA-256, original filename, schema version and row count.

## Acceptance criteria
- [ ] Every dataset is traceable and identical file hashes are detected.
- [ ] Document observed limits and assumptions.

## Verification
Import identical bytes twice and verify dedup behavior.

## Suggested commit
`feat: track dataset provenance`

## Concept learned
Reproducible data lineage. Explain the implementation aloud before closing the issue.

---

# Day 05: Introduce database migrations

## Task
Replace create_all bootstrapping with Alembic migrations.

## Acceptance criteria
- [ ] An empty PostgreSQL database migrates forward; schema version is visible.
- [ ] Document observed limits and assumptions.

## Verification
Migrate a fresh DB and an existing fixture DB.

## Suggested commit
`feat: introduce database migrations`

## Concept learned
Schema evolution. Explain the implementation aloud before closing the issue.

---

# Day 06: Enforce concurrent case uniqueness

## Task
Add typed case table and unique run/transaction constraint.

## Acceptance criteria
- [ ] Concurrent create requests produce a single case.
- [ ] Document observed limits and assumptions.

## Verification
Run parallel create requests against PostgreSQL.

## Suggested commit
`fix: prevent duplicate concurrent investigations`

## Concept learned
Database constraints and race conditions. Explain the implementation aloud before closing the issue.

---

# Day 07: Build a data-quality report

## Task
Report distributions, nulls, cardinality and suspected duplicate entities before modeling.

## Acceptance criteria
- [ ] Report is persisted and shown in the dataset view.
- [ ] Document observed limits and assumptions.

## Verification
Compare report counts with fixture ground truth.

## Suggested commit
`feat: add dataset quality report`

## Concept learned
Exploratory data analysis. Explain the implementation aloud before closing the issue.

---

# Day 08: Learn causal velocity features

## Task
Derive rolling transaction velocity from prior events only.

## Acceptance criteria
- [ ] No event sees later rows or its own transaction.
- [ ] Document observed limits and assumptions.

## Verification
Add time-boundary and ordering leakage tests.

## Suggested commit
`feat: derive past-only velocity features`

## Concept learned
Point-in-time feature engineering. Explain the implementation aloud before closing the issue.

---

# Day 09: Add train-validation-test splits

## Task
Introduce a validation window for threshold selection.

## Acceptance criteria
- [ ] Test rows are never used for tuning thresholds.
- [ ] Document observed limits and assumptions.

## Verification
Change test labels and confirm selected threshold is unchanged.

## Suggested commit
`feat: isolate validation and test windows`

## Concept learned
Evaluation design. Explain the implementation aloud before closing the issue.

---

# Day 10: Persist fitted pipelines

## Task
Save trusted local model artifacts with version and feature schema.

## Acceptance criteria
- [ ] A reloaded artifact reproduces inference on a fixed fixture.
- [ ] Document observed limits and assumptions.

## Verification
Compare pre/post reload predictions exactly within tolerance.

## Suggested commit
`feat: persist versioned model artifacts`

## Concept learned
Model serialization. Explain the implementation aloud before closing the issue.

---

# Day 11: Add single-transaction inference

## Task
Create a validated inference endpoint using a selected saved model.

## Acceptance criteria
- [ ] New transactions are scored without model refitting.
- [ ] Document observed limits and assumptions.

## Verification
Test schema mismatch, missing model and reproducible scoring.

## Suggested commit
`feat: expose saved-model inference`

## Concept learned
Training-serving separation. Explain the implementation aloud before closing the issue.

---

# Day 12: Measure calibration

## Task
Add calibration curves and Brier score on independent validation/test windows.

## Acceptance criteria
- [ ] Only calibrated outputs use probability language, with evidence.
- [ ] Document observed limits and assumptions.

## Verification
Use reliability bins and out-of-sample Brier comparisons.

## Suggested commit
`feat: evaluate classifier calibration`

## Concept learned
Calibration versus ranking. Explain the implementation aloud before closing the issue.

---

# Day 13: Compare imbalance strategies

## Task
Compare class-weighted XGBoost with the baseline.

## Acceptance criteria
- [ ] Report PR metrics and costs without choosing on the test set.
- [ ] Document observed limits and assumptions.

## Verification
Reproduce both configurations with fixed seeds.

## Suggested commit
`feat: compare imbalance strategies`

## Concept learned
Imbalanced classification. Explain the implementation aloud before closing the issue.

---

# Day 14: Add precision-recall curves

## Task
Render full held-out PR curve and analyst threshold explorer.

## Acceptance criteria
- [ ] Tooltip thresholds update confusion counts correctly.
- [ ] Document observed limits and assumptions.

## Verification
Verify selected thresholds against sklearn predictions.

## Suggested commit
`feat: add threshold analysis workspace`

## Concept learned
Decision thresholds and tradeoffs. Explain the implementation aloud before closing the issue.

---

# Day 15: Explain individual classifier outputs

## Task
Add local SHAP with baseline, sum and output scale.

## Acceptance criteria
- [ ] Contributions reconcile with raw classifier margin.
- [ ] Document observed limits and assumptions.

## Verification
Assert SHAP additivity for multiple transactions.

## Suggested commit
`feat: explain individual classifier decisions`

## Concept learned
Local explainability. Explain the implementation aloud before closing the issue.

---

# Day 16: Track experiments with MLflow

## Task
Log parameters, metrics, data hash and trusted artifact to local MLflow.

## Acceptance criteria
- [ ] Run IDs connect UI, database and tracking store.
- [ ] Document observed limits and assumptions.

## Verification
Compare logged values with API result snapshot.

## Suggested commit
`feat: integrate local MLflow tracking`

## Concept learned
Experiment tracking. Explain the implementation aloud before closing the issue.

---

# Day 17: Add Evidently reports

## Task
Generate versioned dataset drift reports alongside PSI.

## Acceptance criteria
- [ ] Reports explain reference/current windows and test definitions.
- [ ] Document observed limits and assumptions.

## Verification
Use a deliberately shifted fixture and a stable fixture.

## Suggested commit
`feat: integrate Evidently drift reports`

## Concept learned
Distribution monitoring. Explain the implementation aloud before closing the issue.

---

# Day 18: Add latency benchmarking

## Task
Measure warm/cold p50/p95 latency with repeated inference batches.

## Acceptance criteria
- [ ] UI distinguishes benchmark distributions from one-run timing.
- [ ] Document observed limits and assumptions.

## Verification
Run fixed-size benchmark and save machine/config metadata.

## Suggested commit
`perf: benchmark inference latency`

## Concept learned
Performance measurement. Explain the implementation aloud before closing the issue.

---

# Day 19: Improve network navigation

## Task
Add graph search, zoom, edge filtering and full neighbor pagination.

## Acceptance criteria
- [ ] All dataset relationships remain reachable and keyboard accessible.
- [ ] Document observed limits and assumptions.

## Verification
Test a high-degree account and an isolated account.

## Suggested commit
`feat: expand entity graph navigation`

## Concept learned
Graph modeling and interaction. Explain the implementation aloud before closing the issue.

---

# Day 20: Add temporal account profiles

## Task
Show prior-only spend and device changes over time.

## Acceptance criteria
- [ ] Profile changes are derived from original transaction events.
- [ ] Document observed limits and assumptions.

## Verification
Verify aggregates against hand-computed fixtures.

## Suggested commit
`feat: add temporal account profiles`

## Concept learned
Time-series aggregation. Explain the implementation aloud before closing the issue.

---

# Day 21: Add case event concurrency control

## Task
Version cases and reject stale edits.

## Acceptance criteria
- [ ] Concurrent note saves do not overwrite one another.
- [ ] Document observed limits and assumptions.

## Verification
Test two clients updating the same case revision.

## Suggested commit
`fix: protect investigation updates from lost writes`

## Concept learned
Optimistic locking. Explain the implementation aloud before closing the issue.

---

# Day 22: Add audit export

## Task
Export case evidence and event history with dataset/run provenance.

## Acceptance criteria
- [ ] Export contains full trace and safely escapes spreadsheet formulas.
- [ ] Document observed limits and assumptions.

## Verification
Verify content, quoting and formula injection protection.

## Suggested commit
`feat: export investigation audit records`

## Concept learned
Portable auditability. Explain the implementation aloud before closing the issue.

---

# Day 23: Add analyst authentication

## Task
Implement a real session provider with CSRF protection.

## Acceptance criteria
- [ ] Anonymous API calls are rejected and sessions expire.
- [ ] Document observed limits and assumptions.

## Verification
Test anonymous, expired and valid session requests.

## Suggested commit
`feat: secure analyst sessions`

## Concept learned
Authentication boundaries. Explain the implementation aloud before closing the issue.

---

# Day 24: Enforce per-workspace access

## Task
Scope datasets, runs and cases to explicit workspace membership.

## Acceptance criteria
- [ ] Cross-workspace IDs cannot expose records.
- [ ] Document observed limits and assumptions.

## Verification
Run negative IDOR authorization tests.

## Suggested commit
`feat: isolate workspace data access`

## Concept learned
Authorization and data isolation. Explain the implementation aloud before closing the issue.

---

# Day 25: Add semantic retrieval

## Task
Index approved investigation text using sentence-transformers and LanceDB.

## Acceptance criteria
- [ ] Returned evidence retains immutable source IDs and scores.
- [ ] Document observed limits and assumptions.

## Verification
Evaluate retrieval recall on a small human-written query set.

## Suggested commit
`feat: add semantic evidence retrieval`

## Concept learned
Embeddings and retrieval evaluation. Explain the implementation aloud before closing the issue.

---

# Day 26: Add cited generation behind a switch

## Task
Generate summaries only from retrieved evidence, with abstention.

## Acceptance criteria
- [ ] Unsupported questions abstain; every factual claim has source support.
- [ ] Document observed limits and assumptions.

## Verification
Test missing evidence, prompt injection and fabricated citation attempts.

## Suggested commit
`feat: add optional grounded investigation summaries`

## Concept learned
Grounding and LLM evaluation. Explain the implementation aloud before closing the issue.

---

# Day 27: Complete accessibility audit

## Task
Check keyboard journeys, touch targets, contrast and screen-reader chart summaries.

## Acceptance criteria
- [ ] Document and resolve critical WCAG issues across every route.
- [ ] Document observed limits and assumptions.

## Verification
Run axe plus manual keyboard and mobile checks.

## Suggested commit
`fix: improve workspace accessibility`

## Concept learned
Inclusive interaction design. Explain the implementation aloud before closing the issue.

---

# Day 28: Optimize large-dataset interaction

## Task
Add server pagination and indexed search with bounded payloads.

## Acceptance criteria
- [ ] 20,000 rows remain usable without shipping all rows per navigation.
- [ ] Document observed limits and assumptions.

## Verification
Measure payload size and filter parity across page boundaries.

## Suggested commit
`perf: paginate transaction queries on the server`

## Concept learned
API pagination and query planning. Explain the implementation aloud before closing the issue.

---

# Day 29: Add CI and reproducible regression fixtures

## Task
Run Python tests, frontend build and browser smoke tests in CI.

## Acceptance criteria
- [ ] Pull requests fail on broken imports, routes and case workflows.
- [ ] Document observed limits and assumptions.

## Verification
Introduce a deliberate failure on a disposable branch and confirm CI fails.

## Suggested commit
`ci: automate end-to-end quality checks`

## Concept learned
Continuous integration. Explain the implementation aloud before closing the issue.

---

# Day 30: Publish a model card and project walkthrough

## Task
Document data limitations, evaluation methodology, threats and architectural tradeoffs.

## Acceptance criteria
- [ ] A reader can reproduce metrics and understand what is not production-ready.
- [ ] Document observed limits and assumptions.

## Verification
Follow the walkthrough from a clean checkout and reconcile all reported metrics.

## Suggested commit
`docs: publish model card and engineering walkthrough`

## Concept learned
Technical communication and responsible claims. Explain the implementation aloud before closing the issue.

---
