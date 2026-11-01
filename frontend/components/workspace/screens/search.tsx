"use client";
import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ArrowRight, Search } from "lucide-react";
import { Button } from "../../ui/button";
import { Panel } from "../../ui/panel";
import { api } from "../../types";
import type { Ws } from "../use-workspace";

type Answer = { answer: string; sources: { citation: string; transaction_id: string; text: string }[] };

// Evidence search: deterministic keyword matching over this run's transactions. Not a chat, not a language model.
export function SearchScreen({ ws }: { ws: Ws }) {
  const { run, rows, high, busy } = ws;
  const [query, setQuery] = useState(useSearchParams().get("q") || "");
  const [searched, setSearched] = useState("");
  const [answer, setAnswer] = useState<Answer | null>(null);
  async function search(q: string) {
    setQuery(q);
    window.history.replaceState(null, "", "?q=" + encodeURIComponent(q));
    await ws.task("Retrieving evidence", async () => {
      if (!run) return;
      setAnswer(await api<Answer>("/research", { method: "POST", body: JSON.stringify({ run_id: run.id, query: q }) }));
      setSearched(q);
    });
  }
  // A shared link (?q=) runs its search once the run has loaded.
  const auto = useRef(false);
  useEffect(() => {
    if (run && query.trim().length >= 2 && !auto.current) {
      auto.current = true;
      search(query);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [run]);
  if (!run) return null;
  const top = high.filter((t) => t.flagged);
  const merchantCount = new Map<string, number>();
  top.forEach((t) => merchantCount.set(t.merchant, (merchantCount.get(t.merchant) || 0) + 1));
  const topMerchant = [...merchantCount.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
  const examples = [...new Set(["flagged", top[0]?.account_id, topMerchant, top[0]?.device_id].filter((x): x is string => !!x && x.length >= 2))];
  return (
    <div className="research-layout">
      <Panel title="Search this run" subtitle="Matches your words against transaction ID, account, device and merchant. Add “flagged” to keep flagged rows only.">
        <div className="research-body">
          <form
            className="search-form"
            role="search"
            onSubmit={(e) => {
              e.preventDefault();
              search(query.trim());
            }}
          >
            <div className="field search-field">
              <label htmlFor="evidence-query">Search</label>
              <div className="search-input large">
                <Search size={18} aria-hidden="true" />
                <input
                  id="evidence-query"
                  name="evidence-query"
                  type="search"
                  autoComplete="off"
                  spellCheck={false}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Account, device, merchant or transaction ID"
                  minLength={2}
                  maxLength={300}
                  required
                />
              </div>
            </div>
            <Button type="submit" disabled={!!busy || query.trim().length < 2}>
              <Search size={16} aria-hidden="true" /> Search
            </Button>
          </form>
          <div className="suggestions" role="group" aria-label="Examples from this run">
            <span>Examples from this run:</span>
            {examples.map((q) => (
              <button type="button" key={q} disabled={!!busy} onClick={() => search(q)}>
                {q}
              </button>
            ))}
          </div>
          {answer && (
            <div className="answer" aria-live="polite">
              <h3>Results for “{searched}”</h3>
              <p>{answer.answer}</p>
              <div className="sources">
                {answer.sources.map((s) => {
                  const tx = rows.find((t) => t.transaction_id === s.transaction_id);
                  return (
                    <button className="source" key={s.transaction_id} disabled={!tx} onClick={() => tx && ws.setSelected(tx)}>
                      <b className="mono">{s.citation} {s.transaction_id}</b>
                      <span>{s.text}</span>
                      <small>Open evidence <ArrowRight size={13} aria-hidden="true" /></small>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </Panel>
      <Panel title="How this works">
        <div className="form-body">
          <p>Keyword matching over this run only. There is no language model, and nothing here explains why a transaction is anomalous.</p>
          <p className="muted">Every result is numbered and opens the transaction it came from. At most 6 results are shown, highest anomaly percentile first.</p>
          <p className="muted">{rows.length.toLocaleString("en-IN")} transactions are searchable in run {run.id.slice(0, 8)}.</p>
        </div>
      </Panel>
    </div>
  );
}
