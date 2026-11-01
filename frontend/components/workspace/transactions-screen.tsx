"use client";
import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { Search } from "lucide-react";
import { Button } from "../ui/button";
import { Input, Select } from "../ui/field";
import { Sheet, SheetDescription, SheetTitle } from "../ui/sheet";
import { StatusTag } from "../ui/tag";
import type { Case, Run, Tx } from "../types";
import { EvidencePanel } from "./evidence-panel";
import { money, utc } from "./format";
import { Panel, Score } from "./primitives";
import { useMediaQuery } from "./use-media-query";

const PAGE = 25;
const DEFAULTS = { query: "", risk: "all", minAmount: "", split: "all", sort: "risk" };
type Filters = typeof DEFAULTS;

// Transactions review: filter and sort the table, open one row, read its evidence beside it.
export function TransactionsScreen({
  run, loading, cases, busy, error, initialRisk, onCreateCase, onOpenCase,
}: {
  run: Run | null; loading: boolean; cases: Case[]; busy: string; error: string; initialRisk?: string;
  onCreateCase: (tx: Tx) => void; onOpenCase: (id: string) => void;
}) {
  const [f, setF] = useState<Filters>({ ...DEFAULTS, risk: initialRisk || "all" });
  const [page, setPage] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const docked = useMediaQuery("(min-width: 1100px)");
  const titleRef = useRef<HTMLElement | null>(null);
  const rows = run?.transactions;
  const query = useDeferredValue(f.query);
  const amount = f.minAmount === "" ? null : Number(f.minAmount);
  const amountError = amount !== null && (!Number.isFinite(amount) || amount < 0) ? "Enter 0 or more." : "";

  const caseByTx = useMemo(() => {
    const m = new Map<string, Case>();
    if (run) for (const c of cases) if (c.run_id === run.id) m.set(c.transaction_id, c);
    return m;
  }, [cases, run]);
  const flagFloor = useMemo(() => {
    const flagged = (rows || []).filter((t) => t.flagged);
    return flagged.length ? Math.min(...flagged.map((t) => t.risk_score)) : undefined;
  }, [rows]);
  const sorted = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (rows || [])
      .filter(
        (t) =>
          (!q || (t.transaction_id + " " + t.account_id + " " + t.merchant + " " + t.device_id).toLowerCase().includes(q)) &&
          (f.risk === "all" || (f.risk === "flagged" ? t.flagged : t.risk_score >= 95)) &&
          (amount === null || !!amountError || t.amount >= amount) &&
          (f.split === "all" || t.split === f.split),
      )
      .sort((a, b) =>
        f.sort === "amount" ? b.amount - a.amount : f.sort === "recent" ? b.timestamp.localeCompare(a.timestamp) : b.risk_score - a.risk_score,
      );
  }, [rows, query, f.risk, f.split, f.sort, amount, amountError]);

  const lastPage = Math.max(0, Math.ceil(sorted.length / PAGE) - 1);
  const at = Math.min(page, lastPage);
  const shown = sorted.slice(at * PAGE, at * PAGE + PAGE);
  const selected = rows?.find((t) => t.transaction_id === selectedId) || null;
  const earlier = useMemo(
    () => (selected && rows ? rows.filter((t) => t.account_id === selected.account_id && t.timestamp < selected.timestamp).length : 0),
    [rows, selected],
  );
  const active = (Object.keys(DEFAULTS) as (keyof Filters)[]).some((k) => f[k] !== DEFAULTS[k]);
  const update = (patch: Partial<Filters>) => {
    setF((p) => ({ ...p, ...patch }));
    setPage(0);
  };
  const clear = () => {
    setF({ ...DEFAULTS });
    setPage(0);
  };
  // After the docked pane opens, focus its heading; after it closes, return to the row that opened it.
  useEffect(() => {
    if (selectedId && docked) titleRef.current?.focus();
  }, [selectedId, docked]);
  const close = () => {
    const id = selectedId;
    setSelectedId(null);
    requestAnimationFrame(() => {
      const el = id ? document.querySelector<HTMLElement>(`[data-tx-id="${CSS.escape(id)}"] .id-button`) : null;
      (el || document.getElementById("workspace-main"))?.focus();
    });
  };

  const evidence = selected && run && (
    <EvidencePanel
      tx={selected} run={run} earlier={earlier} flagFloor={flagFloor} kase={caseByTx.get(selected.transaction_id)}
      busy={busy} error={error} titleRef={titleRef} onCreateCase={onCreateCase} onOpenCase={onOpenCase}
      onClose={close}
      Title={docked ? "h2" : SheetTitle} Description={docked ? "p" : SheetDescription}
    />
  );
  return (
    <div className={"tx-layout" + (selected && docked ? " has-pane" : "")}>
      <Panel
        title="Transaction explorer"
        subtitle="Anomaly percentile ranks each row against training scores; it is not a fraud probability. Flagged means above the model threshold."
        className="tx-panel"
      >
        <div className="tx-filters" role="search" aria-label="Filter transactions">
          <div className="field tx-search">
            <label htmlFor="tx-search">Search</label>
            <div className="search-input">
              <Search size={16} aria-hidden="true" />
              <input id="tx-search" placeholder="ID, account, merchant, device" value={f.query} onChange={(e) => update({ query: e.target.value })} />
            </div>
          </div>
          <button type="button" className="button outline small tx-filter-toggle" aria-expanded={filtersOpen} aria-controls="tx-filter-rest" onClick={() => setFiltersOpen(!filtersOpen)}>
            {filtersOpen ? "Hide filters" : "Filters"}{active ? " (active)" : ""}
          </button>
          <div className={"tx-filter-rest" + (filtersOpen ? " is-open" : "")} id="tx-filter-rest">
          <Select label="Anomaly level" value={f.risk} onChange={(e) => update({ risk: e.target.value })}
            options={[["all", "All levels"], ["flagged", "Model flagged"], ["high", "95th percentile +"]]} />
          <Input label="Min amount (INR)" type="number" inputMode="decimal" min="0" value={f.minAmount} error={amountError}
            onChange={(e) => update({ minAmount: e.target.value })} />
          <Select label="Data split" value={f.split} onChange={(e) => update({ split: e.target.value })}
            options={[["all", "All"], ["train", "Training"], ["test", "Held-out"]]} />
          <Select label="Sort by" value={f.sort} onChange={(e) => update({ sort: e.target.value })}
            options={[["risk", "Highest anomaly"], ["amount", "Highest amount"], ["recent", "Most recent"]]} />
          <Button variant="ghost" size="sm" className="tx-clear" disabled={!active} onClick={clear}>
            Clear filters
          </Button>
          </div>
        </div>
        <p className="tx-count" role="status">
          {loading ? "Loading transactions" : `${sorted.length.toLocaleString()} matching transactions`}
        </p>
        <div className="table-scroll" aria-busy={loading}>
          <table className="tx-table">
            <caption className="sr-only">
              Transactions, highest {f.sort === "amount" ? "amount" : f.sort === "recent" ? "time (most recent)" : "anomaly percentile"} first
            </caption>
            <thead>
              <tr>
                <th scope="col">Transaction</th>
                <th scope="col" className="col-merchant">Merchant</th>
                <th scope="col" className="r">Amount (INR)</th>
                <th scope="col" className="r">Anomaly percentile</th>
                <th scope="col">Review</th>
              </tr>
            </thead>
            <tbody>
              {loading
                ? Array.from({ length: 8 }, (_, i) => (
                    <tr key={i} className="skeleton-row" aria-hidden="true">
                      {Array.from({ length: 5 }, (_, j) => <td key={j}><span className="skeleton" /></td>)}
                    </tr>
                  ))
                : shown.map((t) => {
                    const k = caseByTx.get(t.transaction_id);
                    return (
                      <tr key={t.transaction_id} data-tx-id={t.transaction_id} className={t.transaction_id === selectedId ? "is-selected" : ""}>
                        <td className="c-id">
                          <button className="id-button" title={t.transaction_id} aria-pressed={t.transaction_id === selectedId} onClick={() => setSelectedId(t.transaction_id)}>
                            {t.transaction_id}
                          </button>
                          <small className="mono">{t.account_id} · {utc(t.timestamp)}</small>
                          <small className="merchant-inline">{t.merchant}</small>
                        </td>
                        <td className="col-merchant c-merchant" title={t.merchant}>{t.merchant}</td>
                        <td className="mono r c-amount">{money(t.amount)}</td>
                        <td className="r c-score"><Score tx={t} threshold={flagFloor} /></td>
                        <td className="c-review">
                          {k ? <StatusTag kind="case">In investigation: {k.status}</StatusTag> : t.flagged ? <StatusTag kind="flag">Flagged</StatusTag> : <StatusTag kind="clear">Standard</StatusTag>}
                        </td>
                      </tr>
                    );
                  })}
            </tbody>
          </table>
          {!loading && !sorted.length && (
            <div className="empty-small">
              {rows?.length ? "No transactions match these filters." : "This run has no transactions."}
              {active && <Button variant="outline" size="sm" onClick={clear}>Clear filters</Button>}
            </div>
          )}
        </div>
        <div className="pagination">
          <span className="mono">
            {sorted.length ? `${(at * PAGE + 1).toLocaleString()} to ${(at * PAGE + shown.length).toLocaleString()} of ${sorted.length.toLocaleString()}` : "No rows"}
          </span>
          <div>
            <Button variant="outline" size="sm" disabled={at <= 0} onClick={() => setPage(at - 1)}>Previous</Button>
            <Button variant="outline" size="sm" disabled={at >= lastPage} onClick={() => setPage(at + 1)}>Next</Button>
          </div>
        </div>
      </Panel>
      {selected && docked && (
        <aside className="tx-pane" aria-labelledby="evidence-title" onKeyDown={(e) => { if (e.key === "Escape") close(); }}>
          {evidence}
        </aside>
      )}
      {!docked && (
        <Sheet open={!!selected} onOpenChange={(o) => { if (!o) close(); }} onCloseAutoFocus={(e) => e.preventDefault()}>
          {evidence}
        </Sheet>
      )}
    </div>
  );
}
