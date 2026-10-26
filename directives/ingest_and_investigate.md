# Ingest, score and investigate

Goal: turn valid transaction data into reproducible anomaly evidence and persistent analyst decisions.
Inputs: UTF-8 CSV schema in README, or execution.pipeline.demo_data seed 42.
Orchestration: backend/main.py validates requests, calls deterministic execution, saves immutable run results, and records case events.
Execution: execution/pipeline.py validates the complete dataset before saving, transforms permitted features, splits chronologically on a distinct timestamp, fits on earlier data, scores all rows, evaluates only held-out labels, and computes drift.
Outputs: dataset record, immutable run snapshot, transaction explanations, case event timeline.
Edges: reject missing/nonfinite/negative values, duplicate IDs, oversized uploads, insufficient temporal split. Missing labels disable evaluation, not scoring. Supervised comparison requires two training classes. Feature deviation is descriptive and must not be called SHAP.
Verification: python -m pytest tests -q from project root; npm run build --prefix frontend.
Learnings: run tests from project root or set pythonpath; equal timestamps must stay on one side of split; preview process must use an explicitly configured Python interpreter or project .venv.
