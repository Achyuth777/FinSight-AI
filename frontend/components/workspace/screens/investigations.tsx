"use client";
import Link from "next/link";
import { useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ArrowRight, Check, FileSearch, Plus } from "lucide-react";
import { Button } from "../../ui/button";
import { Select, Textarea } from "../../ui/field";
import { Notice } from "../../ui/notice";
import { Panel } from "../../ui/panel";
import { StatusTag } from "../../ui/tag";
import { money, utc } from "../format";
import { Score } from "../primitives";
import type { Ws } from "../use-workspace";

const statusKind = (s: string) => (s === "escalated" ? "flag" : s === "cleared" ? "ok" : "case") as "flag" | "ok" | "case";
// What each decision means, in plain words. No decision blocks anything.
const statusMeaning: Record<string, string> = {
  open: "Open: created, not yet looked at.",
  reviewing: "Reviewing: you are working on it.",
  cleared: "Cleared: reviewed, no further action.",
  escalated: "Escalated: needs someone else's attention.",
};
const STATUSES = ["open", "reviewing", "cleared", "escalated"];

// List and detail: the queue of investigations on the left, the selected one with its history, note and decision on the right.
export function InvestigationsScreen({ ws }: { ws: Ws }) {
  const { run, cases, busy, error, expired, notice, flagFloor } = ws;
  const [caseId, setCaseId] = useState(useSearchParams().get("case") || "");
  const [note, setNote] = useState("");
  const [caseStatus, setCaseStatus] = useState("all");
  const detail = useRef<HTMLDivElement | null>(null);
  const active = cases.find((c) => c.id === caseId) || cases[0];
  async function save(change: { status?: string; note?: string }) {
    if (!active) return;
    if (await ws.updateCase(active, change)) setNote("");
  }
  return (
    <div className="case-grid">
      <Panel
        title="Investigation queue"
        subtitle={`${cases.length.toLocaleString("en-IN")} saved across all runs`}
        action={
          <Select
            label="Case status filter"
            id="case-status"
            value={caseStatus}
            onChange={(e) => setCaseStatus(e.target.value)}
            options={["all", ...STATUSES].map((s) => [s, s === "all" ? "All statuses" : s])}
          />
        }
      >
        <div className="case-list">
          {cases
            .filter((c) => caseStatus === "all" || c.status === caseStatus || c.id === active?.id)
            .map((c) => (
              <button
                className={"case-item " + (active?.id === c.id ? "selected" : "")}
                key={c.id}
                aria-current={active?.id === c.id ? "true" : undefined}
                onClick={() => {
                  setCaseId(c.id);
                  // Deep-linkable selection: reload and back/forward keep this case.
                  window.history.replaceState(null, "", "?case=" + encodeURIComponent(c.id));
                  setNote("");
                  if (window.innerWidth < 1100) detail.current?.scrollIntoView({ block: "start" });
                }}
              >
                <span className="case-item-head">
                  <span className="case-id mono">{c.transaction_id}</span>
                  <StatusTag kind={statusKind(c.status)}>{c.status}</StatusTag>
                </span>
                <small className="mono">
                  {c.transaction.account_id} · {money(c.transaction.amount)}
                </small>
                <small>
                  Run {c.run_id.slice(0, 8)}
                  {run && c.run_id === run.id ? " (loaded)" : ""} · opened {utc(c.created_at)}
                </small>
              </button>
            ))}
        </div>
        {cases.length > 0 && caseStatus !== "all" && !cases.some((c) => c.status === caseStatus) && (
          <div className="empty-small">
            No investigations with status “{caseStatus}”.
            <Button variant="outline" size="sm" onClick={() => setCaseStatus("all")}>Show all statuses</Button>
          </div>
        )}
        {!cases.length && (
          <div className="empty-small">
            No investigations yet. Open a transaction and choose “Create investigation”.
            <Link href="/app/transactions" className="text-link">Explore transactions <ArrowRight size={14} aria-hidden="true" /></Link>
          </div>
        )}
      </Panel>
      <div ref={detail} className="case-detail">
        {active ? (
          <Panel
            title={active.transaction_id}
            subtitle={`Evidence snapshot · ${active.transaction.account_id} · ${active.source}`}
            action={<StatusTag kind={statusKind(active.status)}>Status: {active.status}</StatusTag>}
          >
            <div className="case-content">
              <div className="case-summary">
                <span><small>Amount</small><b className="mono">{money(active.transaction.amount)}</b></span>
                <span><small>Anomaly percentile</small><Score tx={active.transaction} threshold={flagFloor} /></span>
                <span><small>Merchant</small><b>{active.transaction.merchant}</b></span>
                <span><small>Device</small><b className="mono">{active.transaction.device_id}</b></span>
              </div>
              <p className="case-link">
                {run && active.run_id === run.id ? (
                  <Link className="text-link" href={"/app/transactions?tx=" + encodeURIComponent(active.transaction_id)}>
                    Open this transaction in Transactions <ArrowRight size={14} aria-hidden="true" />
                  </Link>
                ) : (
                  <>Recorded in run {active.run_id.slice(0, 8)}, which is not the loaded run. The snapshot below is what was saved.</>
                )}
              </p>
              <div className="case-columns">
                <section aria-labelledby="timeline-h">
                  <h3 id="timeline-h">Evidence and decision timeline</h3>
                  <ol className="timeline">
                    <li>
                      <span />
                      <div>
                        <small className="mono">{utc(active.transaction.timestamp)}</small>
                        <p>Transaction recorded. Raw anomaly score {active.transaction.anomaly_score}; percentile {active.transaction.risk_score}.</p>
                      </div>
                    </li>
                    {active.events.map((e, i) => (
                      <li key={`${e.at}-${i}`}>
                        <span />
                        <div>
                          <small className="mono">{utc(e.at)} · {e.type}</small>
                          <p>{e.text}</p>
                        </div>
                      </li>
                    ))}
                  </ol>
                </section>
                <section aria-labelledby="note-h" className="case-compose">
                  <h3 id="note-h">Add to the record</h3>
                  <Textarea
                    label="Analyst note"
                    id="note"
                    placeholder="What did you observe? Include the evidence and your reasoning."
                    maxLength={4000}
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    aria-describedby="note-count"
                  />
                  <p className="field-hint mono" id="note-count">{note.length.toLocaleString("en-IN")} / 4,000</p>
                  <div className="save-row">
                    <Button disabled={!note.trim() || !!busy} onClick={() => save({ note })}>
                      Save note <Plus size={15} aria-hidden="true" />
                    </Button>
                    {!note.trim() && !notice && <span className="field-hint">Write a note to enable Save.</span>}
                    {notice && (
                      <span className="saved" role="status">
                        <Check size={15} aria-hidden="true" /> {notice}
                      </span>
                    )}
                  </div>
                  {error && !expired && (
                    <Notice kind="error" action={<Button variant="ghost" size="sm" onClick={ws.retry}>Retry</Button>}>
                      {error} Your note is still in the box.
                    </Notice>
                  )}
                  <Select
                    label="Investigation decision"
                    id="decision"
                    className="decision-row"
                    value={active.status}
                    disabled={!!busy}
                    onChange={(e) => save({ status: e.target.value })}
                    hint={`${statusMeaning[active.status] || ""} Decisions update this investigation only. No transactions are blocked and no payments change.`}
                    options={STATUSES.map((s) => [s, s])}
                  />
                </section>
              </div>
            </div>
          </Panel>
        ) : (
          <Panel title="No investigation selected">
            <div className="empty-small">
              <FileSearch size={32} aria-hidden="true" />
              <p>Select or create an investigation to begin.</p>
            </div>
          </Panel>
        )}
      </div>
    </div>
  );
}
