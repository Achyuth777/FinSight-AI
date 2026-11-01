import { Info } from "lucide-react";
import type { Tx, Metrics } from "../types";
import { pct } from "./format";
import { Stat } from "../ui/stat";

// Percentile ruler: a 0-100 track, one tick at the lowest flagged percentile, one fill to this row's percentile.
// It ranks the row against training scores; it is not a probability.
export function Ruler({ p, threshold }: { p: number; threshold?: number }) {
  return (
    <span
      className="ruler"
      role="img"
      aria-label={
        "Anomaly percentile " +
        p.toFixed(1) +
        (threshold != null ? ", lowest flagged percentile " + threshold.toFixed(1) : "")
      }
    >
      {threshold != null && <i className="ruler-th" style={{ left: threshold + "%" }} />}
      <i className="ruler-fill" style={{ width: p + "%" }} />
    </span>
  );
}

export function Score({ tx, threshold }: { tx: Tx; threshold?: number }) {
  return (
    <span className="score">
      <span className="num">{tx.risk_score.toFixed(1)}</span>
      <Ruler p={tx.risk_score} threshold={threshold} />
    </span>
  );
}

// A value that cannot be computed is stated, never shown as zero.
export function Unavailable({ reason }: { reason: string }) {
  return <span className="unavailable">Unavailable: {reason}</span>;
}

// Every metric block carries its caveat above it and its sample size and positives beneath it.
export function MetricCards({ metrics, source }: { metrics: Metrics; source: string }) {
  const cm = metrics.confusion_matrix;
  const n = cm ? cm.flat().reduce((x, y) => x + y, 0) : undefined;
  const positives = cm ? cm[1][0] + cm[1][1] : undefined;
  return (
    <>
      <p className="metric-caveat">
        {source === "synthetic"
          ? "Synthetic sample: labels come from simple generating rules. These metrics do not estimate real-world performance."
          : "Metrics use the labels you supplied. Their reliability depends on label quality and how representative the sample is."}
      </p>
      {!metrics.available ? (
        <div className="notice">
          <Info size={16} aria-hidden="true" />
          <span className="notice-text">Unavailable: {metrics.reason}</span>
        </div>
      ) : (
        <>
          <div className="stat-grid metric-grid">
            {[
              ["ROC-AUC", metrics.roc_auc],
              ["Average precision", metrics.average_precision],
              ["Precision", metrics.precision],
              ["Recall", metrics.recall],
            ].map(([name, value]) => (
              <Stat key={String(name)} label={String(name)} value={pct(value as number)} note="Held-out transactions" />
            ))}
          </div>
          {n != null && positives != null && (
            <p className="metric-n">
              n = {n.toLocaleString("en-IN")} held-out rows, {positives.toLocaleString("en-IN")} positives
            </p>
          )}
        </>
      )}
    </>
  );
}

// Held-out confusion matrix as a 2x2 grid: rows are the true label, columns the model's call.
export function Confusion({ matrix }: { matrix: number[][] }) {
  const cells: [string, number, string][] = [
    ["True negatives", matrix[0][0], ""],
    ["False positives", matrix[0][1], "off"],
    ["False negatives", matrix[1][0], "off"],
    ["True positives", matrix[1][1], "hit"],
  ];
  return (
    <div className="confusion" role="group" aria-label="Held-out confusion matrix">
      {cells.map(([name, v, tone]) => (
        <span key={name} className={tone}>
          {name} <b>{v.toLocaleString("en-IN")}</b>
        </span>
      ))}
    </div>
  );
}
