"use client";
import { useState } from "react";
import { ArrowDownToLine, ArrowUpRight, Beaker } from "lucide-react";
import { Button } from "../../ui/button";
import { Input, Select } from "../../ui/field";
import { Panel } from "../../ui/panel";
import { featureLabel, label, pct, utc } from "../format";
import { Confusion, MetricCards } from "../primitives";
import type { Ws } from "../use-workspace";

// Experiments, in the order a person works through them: configure, watch it run, read the results, compare with history.
export function LaboratoryScreen({ ws }: { ws: Ws }) {
  const { run, runs, datasets, dataset, busy, elapsed } = ws;
  const [contamination, setContamination] = useState(0.07),
    [trees, setTrees] = useState(150),
    [supervised, setSupervised] = useState(false);
  const selectedDataset = datasets.find((d) => d.id === dataset);
  const unlabeled = selectedDataset?.labeled === false;
  const training = busy === "Training models";
  const shapMax = run?.comparison ? Math.max(...run.comparison.shap_mean_abs.map((x) => x.value)) : 1;
  return (
    <>
      <div className="lab-grid">
        <Panel title="Configure an experiment" subtitle="Isolation Forest · deterministic seed 42" className="lab-config">
          <div className="form-body">
            <Select
              label="Dataset"
              id="dataset"
              value={dataset}
              onChange={(e) => ws.setDataset(e.target.value)}
              error={!datasets.length ? "No datasets yet. Import a CSV or load the synthetic sample from Overview." : ""}
              options={[["", "Select a dataset"], ...datasets.map((d) => [d.id, `${d.name} · ${d.row_count.toLocaleString("en-IN")}`])]}
            />
            <Input
              label={`Expected training outliers: ${pct(contamination)}`}
              id="contamination"
              type="range"
              min=".01"
              max=".2"
              step=".01"
              value={contamination}
              hint="Sets the training decision threshold, not the fraud rate."
              onChange={(e) => setContamination(Number(e.target.value))}
            />
            <Select
              label="Number of trees"
              id="trees"
              value={String(trees)}
              onChange={(e) => setTrees(Number(e.target.value))}
              options={[50, 100, 150, 200, 300].map((n) => [String(n), String(n)])}
            />
            <label className="checkbox-label">
              <input type="checkbox" checked={supervised && !unlabeled} disabled={unlabeled} onChange={(e) => setSupervised(e.target.checked)} /> Compare XGBoost + SHAP
            </label>
            <p className="muted">
              {unlabeled
                ? "Unavailable: this dataset has no is_fraud labels, so XGBoost cannot be trained. Isolation Forest will still run."
                : "Requires is_fraud labels. Classifier output is uncalibrated; SHAP explains its raw margin."}
            </p>
            <Button disabled={!dataset || !!busy} onClick={() => ws.experiment(dataset, { contamination, trees, supervised: supervised && !unlabeled })}>
              <Beaker size={16} aria-hidden="true" /> Run experiment
            </Button>
            {training && <p className="run-progress" role="status">Training on the server. {elapsed}s elapsed. This page stays usable.</p>}
            {!dataset && <p className="field-hint">Select a dataset to enable Run.</p>}
            <a href="/api/template" className="text-link">
              Download CSV template <ArrowDownToLine size={14} aria-hidden="true" />
            </a>
            <details>
              <summary>CSV schema & limits</summary>
              <p>
                100–20,000 rows, ≤5 MB, INR amounts. Required: transaction_id, timestamp, account_id, device_id, merchant, amount, velocity_1h,
                account_age_days, distance_km. Optional: is_fraud (0/1). IDs must be unique; numeric fields must be finite and nonnegative. Upload only
                fields listed in this schema.
              </p>
            </details>
          </div>
        </Panel>
        <div className="lab-results">
          <Panel
            title="Held-out evaluation"
            subtitle={run ? `${run.train_count} earlier training rows → ${run.test_count} later test rows` : "Train a model to see measured results"}
          >
            {run ? (
              <div className="evaluation-body">
                <MetricCards metrics={run.metrics} source={run.source} />
                <p className="muted">
                  Flag threshold: raw anomaly score above {run.threshold.toFixed(4)}, set from the training contamination of {pct(run.contamination)}.
                  Isolation Forest, {run.trees} trees.
                </p>
                {run.metrics.confusion_matrix && <Confusion matrix={run.metrics.confusion_matrix} />}
                <h3>Feature pipeline</h3>
                <div className="feature-chips">
                  {run.feature_names.map((f) => (
                    <span className="pill" key={f}>{label(f)}</span>
                  ))}
                </div>
                <p className="muted">Log1p amount, distance and account age. Hour extracted in UTC. Identifiers and labels are excluded from training.</p>
              </div>
            ) : (
              <div className="empty-small">
                Import a CSV or load the synthetic demo.
                <Button variant="outline" disabled={!!busy} onClick={ws.demo}>Load demo</Button>
              </div>
            )}
          </Panel>
          {run?.comparison && (
            <Panel title="XGBoost comparison" subtitle="Held-out metrics · threshold 0.5 · uncalibrated">
              <div className="evaluation-body">
                <MetricCards metrics={run.comparison.metrics} source={run.source} />
                <h3>Mean absolute SHAP contributions</h3>
                <div className="feature-bars">
                  {run.comparison.shap_mean_abs.map((f) => (
                    <div className="feature-bar" key={f.feature}>
                      <span>{featureLabel(f.feature)}</span>
                      <div><i style={{ width: Math.min(100, (f.value / shapMax) * 100) + "%" }} /></div>
                      <b className="mono">{f.value.toFixed(3)}</b>
                    </div>
                  ))}
                </div>
                <p className="muted">{run.comparison.explanation}</p>
              </div>
            </Panel>
          )}
        </div>
      </div>
      <Panel title="Experiment history" subtitle="Saved configurations and results" id="runs">
        <div className="table-scroll" tabIndex={0} role="region" aria-label="Experiment history table, scrollable">
          <table>
            <thead>
              <tr>
                <th>Run</th>
                <th>Dataset</th>
                <th className="r">Trees</th>
                <th className="r">Contamination</th>
                <th className="r">Average precision (held-out)</th>
                <th>Inspect</th>
              </tr>
            </thead>
            <tbody>
              {runs.map((r) => (
                <tr key={r.id} className={run?.id === r.id ? "is-selected" : ""}>
                  <td>
                    <span className="mono">{r.id.slice(0, 8)}</span>
                    <small>{utc(r.created_at)}</small>
                  </td>
                  <td>{r.dataset_name}</td>
                  <td className="mono r">{r.trees}</td>
                  <td className="mono r">{pct(r.contamination)}</td>
                  <td className="mono r">{r.metrics.average_precision == null ? <span className="unavailable">Unavailable</span> : pct(r.metrics.average_precision)}</td>
                  <td>
                    <Button variant="ghost" size="sm" onClick={() => ws.loadRun(r.id)} disabled={!!busy}>
                      {run?.id === r.id ? "Selected" : "Load"} <ArrowUpRight size={14} aria-hidden="true" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </>
  );
}
