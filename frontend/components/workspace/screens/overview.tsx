"use client";
import Link from "next/link";
import { useState } from "react";
import { ArrowRight } from "lucide-react";
import { ActivityChart } from "../../charts";
import { Button } from "../../ui/button";
import { Select } from "../../ui/field";
import { Panel } from "../../ui/panel";
import { ShareBars, Stat } from "../../ui/stat";
import { featureLabel, money, pct, utc } from "../format";
import { Score, Unavailable } from "../primitives";
import { TransactionTable } from "../transaction-table";
import type { Ws } from "../use-workspace";

// Analyst home: how much is waiting, the single next transaction to look at, the queue, then context.
export function OverviewScreen({ ws }: { ws: Ws }) {
  const { run, rows, flagged, high, cases, caseByTx, flagFloor } = ws;
  const [range, setRange] = useState("all");
  if (!run) return null;
  const chartRows = range === "test" ? rows.filter((t) => t.split === "test") : rows;
  const openCases = cases.filter((c) => ["open", "reviewing"].includes(c.status));
  const next = high.find((t) => t.flagged && !caseByTx.has(t.transaction_id));
  const unreviewed = flagged.filter((t) => !caseByTx.has(t.transaction_id)).length;
  const inCase = flagged.length - unreviewed;
  return (
    <>
      <div className="stat-grid">
        <Stat
          label="Flagged for review"
          tone="flag"
          value={flagged.length.toLocaleString("en-IN")}
          note={
            rows.length
              ? `${pct(flagged.length / rows.length)} of ${rows.length.toLocaleString("en-IN")} rows, above the model threshold (${pct(run.contamination)} training contamination)`
              : <Unavailable reason="this run has no rows" />
          }
          href="/app/transactions"
          onClick={() => {
            try { sessionStorage.setItem("finsight-landing", JSON.stringify({ risk: "flagged" })); } catch {}
          }}
        />
        <Stat label="Flagged value (INR)" value={money(flagged.reduce((a, t) => a + t.amount, 0))} note="Review exposure, not confirmed fraud loss" />
        <Stat label="Open investigations" value={openCases.length.toLocaleString("en-IN")} note="Open or reviewing, across all runs" href="/app/investigations" />
        <Stat label="Transactions analyzed" value={rows.length.toLocaleString("en-IN")} note={`${new Set(rows.map((t) => t.account_id)).size.toLocaleString("en-IN")} distinct accounts`} />
      </div>
      <div className="home-grid">
        <Panel
          title="Priority review queue"
          subtitle="Highest anomaly percentiles first. Review each before any decision."
          action={<Link className="text-link" href="/app/transactions">View all transactions <ArrowRight size={14} aria-hidden="true" /></Link>}
        >
          {flagged.length === 0 && rows.length > 0 && (
            <p className="panel-note">No transaction crossed the model threshold in this run. The rows below are the highest percentiles, not flags.</p>
          )}
          <TransactionTable
            items={high.slice(0, 6)}
            onSelect={(t) => ws.setSelected(t)}
            flagFloor={flagFloor}
            caseByTx={caseByTx}
            caption="Six highest anomaly percentiles in this run"
            empty={<div className="empty-small">This run has no transactions.</div>}
          />
        </Panel>
        <Panel title="Next to review" subtitle="Highest flagged transaction with no investigation yet">
          {next ? (
            <div className="next-card">
              <p className="next-id mono">{next.transaction_id}</p>
              <p className="next-sub">{next.merchant} · {utc(next.timestamp)}</p>
              <p className="next-amount mono">{money(next.amount)}</p>
              <Score tx={next} threshold={flagFloor} />
              {next.reasons.length > 0 && (
                <ul className="next-reasons" aria-label="Largest deviations from training medians">
                  {next.reasons.slice(0, 3).map((r) => (
                    <li key={r.feature}><span>{featureLabel(r.feature)}</span><b className="mono">{r.deviation_iqr} IQR</b></li>
                  ))}
                </ul>
              )}
              <Button onClick={() => ws.setSelected(next)}>Open evidence <ArrowRight size={16} aria-hidden="true" /></Button>
              <p className="next-progress">
                {inCase.toLocaleString("en-IN")} of {flagged.length.toLocaleString("en-IN")} flagged transactions have an investigation. {unreviewed.toLocaleString("en-IN")} still need a first look.
              </p>
            </div>
          ) : openCases.length ? (
            <div className="next-card">
              <p className="next-sub">Every flagged transaction in this run has an investigation.</p>
              <p className="next-id mono">{openCases[0].transaction_id}</p>
              <p className="next-sub">Status: {openCases[0].status} · opened {utc(openCases[0].created_at)}</p>
              <Link className="button primary" href={"/app/investigations?case=" + encodeURIComponent(openCases[0].id)}>
                Continue investigation <ArrowRight size={16} aria-hidden="true" />
              </Link>
            </div>
          ) : (
            <div className="next-card">
              <p className="next-sub">Nothing is waiting. No flagged transaction in this run lacks an investigation, and no investigation is open.</p>
              <Link className="button outline" href="/app/transactions">Browse transactions</Link>
            </div>
          )}
        </Panel>
      </div>
      <div className="chart-grid">
        <Panel
          title="Transaction activity"
          subtitle="Daily counts (UTC dates)"
          action={
            <Select
              label="Chart period"
              value={range}
              onChange={(e) => setRange(e.target.value)}
              options={[["all", "All data"], ["test", "Held-out only"]]}
            />
          }
        >
          <div className="chart-legend">
            <span><i />Transactions</span>
            <span><i />Flagged</span>
          </div>
          {chartRows.length ? <ActivityChart rows={chartRows} /> : <div className="empty-small">No rows in this period.</div>}
        </Panel>
        <Panel title="Anomaly distribution" subtitle="Rows by percentile band, relative to training scores">
          <ShareBars
            label="Rows by anomaly percentile band"
            total={rows.length}
            rows={[
              { name: "Below 80th", value: rows.filter((t) => t.risk_score < 80).length },
              { name: "80th to 95th", value: rows.filter((t) => t.risk_score >= 80 && t.risk_score < 95).length },
              { name: "95th and above", value: rows.filter((t) => t.risk_score >= 95).length, tone: "flag" },
            ]}
          />
          <p className="panel-note">
            Isolation Forest, {run.trees} trees. {run.train_count.toLocaleString("en-IN")} training and {run.test_count.toLocaleString("en-IN")} held-out rows.{" "}
            <Link className="text-link" href="/app/laboratory">Inspect experiment</Link>
          </p>
        </Panel>
      </div>
    </>
  );
}
