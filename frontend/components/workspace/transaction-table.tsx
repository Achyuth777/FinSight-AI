"use client";
import { StatusTag } from "../ui/tag";
import type { Case, Tx } from "../types";
import { money, utc } from "./format";
import { Score } from "./primitives";

// The one transaction table. Used by Transactions, the Overview queue, Linked accounts and Evidence search.
// The ID cell holds the only keyboard stop; its ::after stretches over the row so the whole row opens the evidence.
export function TransactionTable({
  items, onSelect, selectedId, flagFloor, caseByTx, loading = false, caption, empty,
}: {
  items: Tx[]; onSelect: (t: Tx) => void; selectedId?: string | null; flagFloor?: number;
  caseByTx: Map<string, Case>; loading?: boolean; caption: string; empty?: React.ReactNode;
}) {
  return (
    <div className="table-scroll" aria-busy={loading} tabIndex={0} role="region" aria-label="Transactions table, scrollable">
      <table className="tx-table">
        <caption className="sr-only">{caption}</caption>
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
            : items.map((t) => {
                const k = caseByTx.get(t.transaction_id);
                return (
                  <tr key={t.transaction_id} data-tx-id={t.transaction_id} className={t.transaction_id === selectedId ? "is-selected" : ""}>
                    <td className="c-id">
                      <button className="id-button" title={t.transaction_id} aria-pressed={t.transaction_id === selectedId} onClick={() => onSelect(t)}>
                        {t.transaction_id}
                      </button>
                      <small className="mono" title={t.account_id}>{t.account_id} · {utc(t.timestamp)}</small>
                      <small className="merchant-inline" title={t.merchant}>{t.merchant}</small>
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
      {!loading && !items.length && empty}
    </div>
  );
}
