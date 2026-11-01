"use client";
import Link from "next/link";
import { ShieldCheck, TriangleAlert } from "lucide-react";
import { Panel } from "../../ui/panel";
import { Stat } from "../../ui/stat";
import { StatusTag } from "../../ui/tag";
import { featureLabel } from "../format";
import { Unavailable } from "../primitives";
import type { Ws } from "../use-workspace";

// Data checks: what was measured when this run was trained. Batch results, not a live monitoring service.
export function ChecksScreen({ ws }: { ws: Ws }) {
  const { run, rows } = ws;
  if (!run) return null;
  const review = run.drift.filter((d) => d.status === "review");
  return (
    <>
      <div className={"check-summary " + (review.length ? "needs-review" : "clear")} role="status">
        {review.length ? <TriangleAlert size={18} aria-hidden="true" /> : <ShieldCheck size={18} aria-hidden="true" />}
        <p>
          {review.length ? (
            <>
              <b>{review.length} of {run.drift.length} features need review.</b> {review.map((d) => featureLabel(d.feature)).join(", ")} moved beyond PSI 0.20 between training and held-out rows.
              Check whether the held-out period behaves differently before relying on the held-out metrics in{" "}
              <Link className="text-link" href="/app/laboratory">Experiments</Link>.
            </>
          ) : (
            <>
              <b>No feature crossed the review threshold.</b> Training and held-out rows look alike on every feature measured (PSI at or below 0.20).
            </>
          )}
        </p>
      </div>
      <section className="check-section" aria-labelledby="check-quality">
        <h2 id="check-quality">Data quality</h2>
        <div className="stat-grid">
          <Stat label="Import validation" value="Applied" note="Required fields, ranges and unique IDs are checked at import. Failing files are rejected, not scored." />
          <Stat label="Rows analysed" value={rows.length.toLocaleString("en-IN")} note="Rows in this run after validation" />
          <Stat label="Training rows" value={run.train_count.toLocaleString("en-IN")} note="Earlier rows the model learned from" />
          <Stat label="Held-out rows" value={run.test_count.toLocaleString("en-IN")} note="Later rows kept apart for evaluation" />
        </div>
      </section>
      <section className="check-section" aria-labelledby="check-drift">
        <h2 id="check-drift">Feature drift</h2>
        <Panel title="Feature distribution drift" subtitle="Population Stability Index · training vs held-out rows · bar scale 0–0.50 (capped)">
          <div className="table-scroll" tabIndex={0} role="region" aria-label="Feature drift table, scrollable">
            <table className="drift-table">
              <caption className="sr-only">Population stability index per feature, training versus held-out rows</caption>
              <thead>
                <tr>
                  <th>Feature</th>
                  <th className="r">PSI</th>
                  <th>Distribution shift (bar full at PSI 0.50, tick at 0.20)</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {run.drift.map((d) => (
                  <tr key={d.feature} className={d.status === "review" ? "is-flagged" : ""}>
                    <td>{featureLabel(d.feature)}</td>
                    <td className="mono r">{d.psi == null ? <Unavailable reason="constant training feature" /> : d.psi.toFixed(4)}</td>
                    <td>
                      <div className="drift-track" aria-hidden="true">
                        <i className={d.status === "review" ? "over" : ""} style={{ width: Math.min(100, ((d.psi || 0) / 0.5) * 100) + "%" }} />
                      </div>
                    </td>
                    <td>
                      <StatusTag kind={d.status === "review" ? "flag" : "clear"}>{d.status === "review" ? "Review" : "Stable"}</StatusTag>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!run.drift.length && <div className="empty-small">No feature drift results are available for this run.</div>}
          </div>
          <p className="panel-note">
            Training-derived quantile bins; proportions floored at 0.0001. Constant training features are uninformative and shown as unavailable. Review
            threshold uses unrounded PSI above 0.20. PSI is a heuristic, not a statistical test. This is batch monitoring, not a live production feed.
          </p>
        </Panel>
      </section>
      <section className="check-section" aria-labelledby="check-timing">
        <h2 id="check-timing">Measured run timing</h2>
        <div className="stat-grid two">
          <Stat label="Batch inference time" value={`${run.inference_ms.toFixed(1)} ms`} note={`${rows.length.toLocaleString("en-IN")} rows, measured during this run`} />
          <Stat label="Total experiment time" value={`${(run.duration_ms / 1000).toFixed(2)} s`} note="Includes the optional classifier and SHAP" />
        </div>
        <p className="panel-note">
          Held-out metrics for this run, with their sample size, are in{" "}
          <Link className="text-link" href="/app/laboratory">Experiments</Link>.
        </p>
      </section>
    </>
  );
}
