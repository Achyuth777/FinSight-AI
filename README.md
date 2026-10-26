# FinSight AI

A local, single-analyst fraud investigation MVP with a separate marketing site. Inspired by Orca Fraud's restrained dark presentation and the supplied dashboard reference; original identity and interface assets.

## Run locally

Requires Python 3.11–3.12 and Node 22+. From the project root:

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
npm ci --prefix frontend
npm run build --prefix frontend
npm run dev
```

Open http://localhost:3000. The root launcher starts FastAPI on 127.0.0.1:8000 and the built Next.js app on port 3000. Despite its conventional `dev` name, this launcher serves the verified production frontend build. For frontend hot reload, run the two services separately below.

Windows PowerShell:

```powershell
py -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
npm ci --prefix frontend
python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000
```

In a second terminal: `npm run dev --prefix frontend`, then open http://localhost:3000.

For macOS/Linux hot reload use `python -m uvicorn backend.main:app --reload` and, in a second terminal, `npm run dev --prefix frontend`.

### PostgreSQL

The default quick-start uses a durable SQLite file, `finsight.db`, to avoid requiring infrastructure. PostgreSQL is supported through the same SQLAlchemy code. To use it, start the included database:

```bash
docker compose up -d db
export DATABASE_URL='postgresql+psycopg://finsight:local_only_change_me@localhost:5432/finsight'
npm run dev
```

On PowerShell set `$env:DATABASE_URL` instead of `export`. PostgreSQL configuration is supplied; the test suite in this build was run against SQLite. Never expose this MVP or its database to the internet without adding authentication, workspace authorization, rate limits and migrations. The UI is authenticated-style, not an authentication system.

## First investigation

1. Open the workspace and choose **Load demo**. This creates 1,200 seeded synthetic transactions and trains an actual Isolation Forest.
2. Open **Transactions**, filter by model flagged, inspect a transaction, and choose **Create investigation**.
3. Open **Investigations**, add a note and change the status. Reload to verify persistence.
4. In **ML laboratory**, choose a dataset and experiment settings. Enable XGBoost + SHAP to compare the supervised model.
5. Inspect **Monitoring**, **Entity network**, and **Research assistant**. Research currently provides deterministic, cited evidence search, not an LLM.

## CSV schema

UTF-8 CSV, 100–20,000 rows, 5 MB maximum. All amounts are interpreted as INR; convert mixed currencies before import. Use `/api/template` or `data/synthetic-template.csv` for a valid example.

| Column | Meaning / constraints |
|---|---|
| transaction_id | Unique nonempty string, ≤160 characters |
| timestamp | Valid ISO timestamp; parsed into UTC |
| account_id | Nonempty account identifier |
| device_id | Nonempty device identifier |
| merchant | Nonempty merchant name |
| amount | Finite nonnegative INR value |
| velocity_1h | Prior-hour transaction count supplied by source |
| account_age_days | Nonnegative account age at transaction time |
| distance_km | Nonnegative distance measure supplied by source |
| is_fraud | Optional complete 0/1 labels for evaluation |

Numeric inputs are limited to 1e12. Blank fields, duplicate transaction IDs, invalid timestamps and invalid labels reject the entire import. Extra columns are discarded. Avoid uploading sensitive personal data; opaque synthetic identifiers are sufficient for development.

## Actual ML behavior

- Stable timestamp sort; first approximately 70% train, remaining 30% test. Equal boundary timestamps stay together. At least 50 train and 20 test rows required.
- UTC hour plus amount, velocity, age and distance. Log1p transforms amount, age and distance. No label or account identifiers enter training.
- Isolation Forest fits only training rows with fixed seed 42. Contamination sets a raw-score threshold. **Anomaly percentile is a ranking against the training score distribution, not a fraud probability.** Held-out percentiles may exceed training maximum and become 100.
- Precision, recall, ROC-AUC and average precision use held-out labels only. They remain unavailable without both classes. Average precision is the sklearn AP summary, not trapezoidal PR area.
- Feature-deviation explanations compare transformed features to training median/IQR. They are descriptive context, not causal explanations or SHAP.
- Optional XGBoost fits on the training window and computes actual mean absolute TreeSHAP values on held-out rows. Classifier probabilities are uncalibrated; SHAP is in raw-margin units.
- PSI uses training quantile bins and a 0.20 review heuristic. Timing is measured for a single batch/run, not a latency SLA.
- Synthetic labels intentionally correlate with abnormal features. Strong synthetic results must not be described as production performance.

## Three-layer structure

- `directives/`: documented workflows and edge cases.
- `backend/main.py`: API orchestration, request schemas and persistence.
- `execution/pipeline.py`: deterministic generation, validation, preprocessing, training and evaluation.
- `frontend/`: Next.js App Router, React, TypeScript, Tailwind, shadcn-style Radix/CVA controls, Recharts, Lucide and Framer Motion.
- `skills/frontend-design/SKILL.md`: reusable design standards and review workflow.
- `tests/`: validation, temporal leakage, ML and API integration tests.

SQLAlchemy stores datasets, immutable result snapshots and mutable cases with event histories. The MVP uses a generic JSON record table; typed migrations, concurrency control and real model artifact storage are intentionally future issues. Models currently retrain per experiment; this is a batch experiment product, not a streaming payment gate.

## Verification

```bash
python -m pytest tests -q
npm run build --prefix frontend
```

See `docs/VERIFICATION.md` for checks actually completed and limitations. API reference: http://localhost:8000/docs.

## Incremental development

Read `docs/ROADMAP.md`: 30 meaningful tasks, acceptance criteria, checks, suggested commit messages and learning goals. `docs/issues/day-01.md` through `day-30.md` are GitHub-ready issue bodies. With your repository selected, create an issue when starting it:

```bash
gh issue create --repo OWNER/REPO --title 'Day 01: Make setup reproducible' --body-file docs/issues/day-01.md
```

No remote issues or fake daily commits have been created. MLflow, Evidently, semantic RAG, real auth, production hardening and live inference are roadmap extensions, not active integrations.
