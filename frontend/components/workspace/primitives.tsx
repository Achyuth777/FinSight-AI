import { Info } from "lucide-react";
import type { Tx, Metrics } from "../types";
import { pct } from "./format";

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

export function MetricCards({ metrics }: { metrics: Metrics }) {
  return !metrics.available ? (
    <div className="notice">
      <Info size={18} />
      {metrics.reason}
    </div>
  ) : (
    <div className="metric-grid compact">
      {[
        ["ROC-AUC", metrics.roc_auc],
        ["Average precision", metrics.average_precision],
        ["Precision", metrics.precision],
        ["Recall", metrics.recall],
      ].map(([name, value]) => (
        <div className="metric" key={String(name)}>
          <span>{name}</span>
          <strong>{pct(value as number)}</strong>
          <small>Held-out transactions</small>
        </div>
      ))}
    </div>
  );
}
