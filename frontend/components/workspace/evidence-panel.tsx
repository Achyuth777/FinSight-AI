"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ArrowRight, Plus, X } from "lucide-react";
import { Button } from "../ui/button";
import { Notice } from "../ui/notice";
import { StatusTag } from "../ui/tag";
import type { Case, Run, Tx } from "../types";
import { featureLabel, money, utc } from "./format";
import { Score } from "./primitives";

// Reason bars are full at this many interquartile ranges; longer deviations are capped, not rescaled.
const IQR_FULL = 10;

// Evidence for one transaction. Rendered docked beside the table on wide screens and inside a Sheet elsewhere.
export function EvidencePanel({
  tx, run, earlier, flagFloor, kase, busy, error, Title = "h2", Description = "p", titleRef, onCreateCase, onOpenCase, onClose,
}: {
  tx: Tx; run: Run; earlier: number; flagFloor?: number; kase?: Case; busy: string; error: string;
  Title?: React.ElementType; Description?: React.ElementType; titleRef?: React.Ref<HTMLElement>;
  onCreateCase: (tx: Tx) => void; onOpenCase?: (id: string) => void; onClose?: () => void;
}) {
  // Success feedback: the case appeared while this transaction's panel was open.
  const [created, setCreated] = useState(false);
  const had = useRef(!!kase);
  useEffect(() => {
    had.current = !!kase;
    setCreated(false);
  }, [tx.transaction_id]);
  useEffect(() => {
    if (kase && !had.current) setCreated(true);
    had.current = !!kase;
  }, [kase]);
  const facts: [string, string | number][] = [
    ["Account", tx.account_id],
    ["Device", tx.device_id],
    ["Data split", tx.split === "test" ? "Held-out" : "Training"],
    ["Raw anomaly score", tx.anomaly_score],
    ["Transactions / 1h", tx.velocity_1h],
    ["Account age", tx.account_age_days + (tx.account_age_days === 1 ? " day" : " days")],
    ["Distance", tx.distance_km + " km"],
  ];
  return (
    <>
      <div className="drawer-top">
        <span className="drawer-kind">
          Transaction evidence
          {tx.flagged && <StatusTag kind="flag">Flagged</StatusTag>}
        </span>
        {onClose && (
          <button type="button" className="icon-button" aria-label="Close transaction" onClick={onClose}>
            <X size={18} aria-hidden="true" />
          </button>
        )}
      </div>
      <Title id="evidence-title" tabIndex={-1} ref={titleRef} className="evidence-title">{tx.transaction_id}</Title>
      <Description className="evidence-sub" id="evidence-sub">
        {tx.merchant} · {utc(tx.timestamp)}
      </Description>
      <p className="evidence-sub dim">
        {run.source === "synthetic" ? "SYNTHETIC SAMPLE" : "UPLOADED"} · Run {run.id.slice(0, 8)}
      </p>
      {error && <Notice kind="error">{error}</Notice>}
      {busy && <Notice kind="busy">{busy}…</Notice>}
      <div className="drawer-amount">
        <span className="mono">{money(tx.amount)}</span>
        <Score tx={tx} threshold={flagFloor} />
      </div>
      <p className="caveat">Anomaly percentile ranks this row against training scores. It is not a fraud probability.</p>
      <dl className="details-grid">
        {facts.map(([k, v]) => (
          <div key={k}>
            <dt>{k}</dt>
            <dd className="mono">{v}</dd>
          </div>
        ))}
      </dl>
      <h3>What stands out</h3>
      <p className="muted">
        Absolute deviations from training medians, in interquartile ranges (bars are full at {IQR_FULL} IQR). Contextual signals, not model attribution or proof of
        fraud. Amount, age and distance use log1p values; hour is UTC. Zero IQR uses a scale of 1 transformed unit.
      </p>
      {tx.reasons.length ? (
        <div className="reasons">
          {tx.reasons.map((r) => (
            <div className="reason" key={r.feature}>
              <span>{featureLabel(r.feature)}</span>
              <strong className="mono">{r.deviation_iqr} IQR</strong>
              <i className="reason-bar" aria-hidden="true"><b style={{ width: Math.min(100, (r.deviation_iqr / IQR_FULL) * 100) + "%" }} /></i>
            </div>
          ))}
        </div>
      ) : (
        <p className="muted">No feature deviates notably from training medians.</p>
      )}
      <h3>Account history in this dataset</h3>
      <p className="muted">
        {earlier.toLocaleString("en-IN")} earlier transactions. History excludes this transaction and later records.
      </p>
      <div className="drawer-actions">
        {created && <Notice kind="success" className="actions-note">Investigation opened.</Notice>}
        {kase ? (
          <>
            <StatusTag kind="case">In investigation: {kase.status}</StatusTag>
            <Link href={"/app/investigations?case=" + encodeURIComponent(kase.id)} className="button primary" onClick={() => onOpenCase?.(kase.id)}>
              Open investigation <ArrowRight size={16} aria-hidden="true" />
            </Link>
          </>
        ) : (
          <Button disabled={!!busy} onClick={() => onCreateCase(tx)}>
            <Plus size={16} aria-hidden="true" /> Create investigation
          </Button>
        )}
      </div>
    </>
  );
}
