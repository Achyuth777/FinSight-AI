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

export function Panel({
  title,
  subtitle,
  children,
  action,
  className = "",
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={"panel " + className}>
      <div className="panel-head">
        <div>
          <h2>{title}</h2>
          {subtitle && <p>{subtitle}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
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
          <Info size={18} />
          Unavailable: {metrics.reason}
        </div>
      ) : (
        <>
          <div className="stat-grid">
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
