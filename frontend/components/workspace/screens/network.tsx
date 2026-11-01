"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { Select } from "../../ui/field";
import { Panel } from "../../ui/panel";
import { Stat } from "../../ui/stat";
import type { Tx } from "../../types";
import { TransactionTable } from "../transaction-table";
import type { Ws } from "../use-workspace";

const plural = (n: number, w: string) => `${n.toLocaleString("en-IN")} ${w}${n === 1 ? "" : "s"}`;
const cut = (s: string, n: number) => (s.length > n ? s.slice(0, n - 1) + "…" : s);

// Accounts that share a device identifier with the chosen account. A link is a lead to check, never proof of fraud.
export function NetworkScreen({ ws }: { ws: Ws }) {
  const { run, high, flagFloor, caseByTx } = ws;
  const [entity, setEntity] = useState(useSearchParams().get("account") || "");
  // Everything this screen needs, built once per run rather than per render.
  const byAccount = useMemo(() => {
    const m = new Map<string, Tx[]>();
    for (const t of run?.transactions || []) {
      const list = m.get(t.account_id);
      if (list) list.push(t);
      else m.set(t.account_id, [t]);
    }
    return m;
  }, [run]);
  const accountsByDevice = useMemo(() => {
    const m = new Map<string, Set<string>>();
    for (const t of run?.transactions || []) {
      const s = m.get(t.device_id);
      if (s) s.add(t.account_id);
      else m.set(t.device_id, new Set([t.account_id]));
    }
    return m;
  }, [run]);
  // Accounts with the most neighbours on shared devices: a short list of places worth starting from.
  const picks = useMemo(() => {
    const links = new Map<string, Set<string>>();
    for (const accounts of accountsByDevice.values()) {
      if (accounts.size < 2) continue;
      for (const a of accounts) {
        const s = links.get(a) || new Set<string>();
        accounts.forEach((b) => b !== a && s.add(b));
        links.set(a, s);
      }
    }
    return [...links.entries()].sort((a, b) => b[1].size - a[1].size || a[0].localeCompare(b[0])).slice(0, 5).map(([a, s]) => [a, s.size] as const);
  }, [accountsByDevice]);
  if (!run) return null;
  const active = byAccount.has(entity) ? entity : high[0]?.account_id;
  const entityRows = byAccount.get(active) || [];
  const devices = [...new Set(entityRows.map((t) => t.device_id))];
  // Only a device that another account also uses links accounts together.
  const sharedDevices = devices.filter((d) => (accountsByDevice.get(d)?.size || 0) > 1);
  const neighbors = [...new Set(sharedDevices.flatMap((d) => [...(accountsByDevice.get(d) || [])]))].filter((a) => a !== active).sort();
  function choose(a: string) {
    setEntity(a);
    window.history.replaceState(null, "", "?account=" + encodeURIComponent(a));
  }
  const sd = sharedDevices.slice(0, 8);
  const na = neighbors.slice(0, 10);
  const rowsN = Math.max(sd.length, na.length, 3);
  const H = 56 + rowsN * 40;
  const y = (i: number, n: number) => 56 + 20 + i * 40 + ((rowsN - n) * 40) / 2;
  const mid = H / 2 + 14;
  const curve = (x1: number, y1: number, x2: number, y2: number) => `M${x1} ${y1} C${(x1 + x2) / 2} ${y1} ${(x1 + x2) / 2} ${y2} ${x2} ${y2}`;
  return (
    <>
      <div className="stat-grid">
        <Stat label="Account" value={active} note={`${plural(entityRows.length, "transaction")} in this run`} />
        <Stat label="Devices used" value={devices.length.toLocaleString("en-IN")} note="Distinct device identifiers on this account" />
        <Stat label="Shared with other accounts" value={sharedDevices.length.toLocaleString("en-IN")} note={sharedDevices.length === 1 ? "device is also used elsewhere" : "devices are also used elsewhere"} />
        <Stat label="Linked accounts" value={neighbors.length.toLocaleString("en-IN")} note="Other accounts on those devices" />
      </div>
      <Panel
        title="Linked accounts"
        subtitle="A link means two accounts used the same device identifier in this dataset. It does not prove fraud."
        action={
          <Select
            label="Account"
            id="entity"
            value={active}
            onChange={(e) => choose(e.target.value)}
            options={[...byAccount.keys()].sort().map((a) => [a, a])}
          />
        }
      >
        {picks.length > 0 && (
          <div className="account-picks" role="group" aria-label="Accounts with the most shared-device links">
            <span>Most linked:</span>
            {picks.map(([a, n]) => (
              <button type="button" key={a} className={a === active ? "on" : ""} aria-pressed={a === active} onClick={() => choose(a)}>
                {a} <small>{n}</small>
              </button>
            ))}
          </div>
        )}
        {entity && !byAccount.has(entity) && <p className="panel-note">Account {entity} is not in this run, so {active} is shown instead.</p>}
        {neighbors.length === 0 ? (
          <div className="empty-small">
            {active} shares no device with another account in this run.
            {byAccount.size > 1 && <span>Choose another account above to find links.</span>}
          </div>
        ) : (
          <>
            <div className="network-canvas">
              <svg viewBox={`0 0 720 ${H}`} role="group" aria-label={`${active} shares ${plural(sharedDevices.length, "device")} with ${plural(neighbors.length, "account")}`}>
                <text x="12" y="22" className="g-head">This account</text>
                <text x="250" y="22" className="g-head">Shared devices</text>
                <text x="520" y="22" className="g-head">Linked accounts</text>
                {sd.map((d, i) => (
                  <g key={d}>
                    <path className="g-edge on" d={curve(132, mid, 250, y(i, sd.length))} />
                    {na.filter((a) => accountsByDevice.get(d)?.has(a)).map((a) => (
                      <path key={a} className="g-edge" d={curve(364, y(i, sd.length), 520, y(na.indexOf(a), na.length))} />
                    ))}
                  </g>
                ))}
                <g>
                  <rect className="g-acct" x="12" y={mid - 18} width="120" height="36" rx="8" />
                  <text className="g-acct-t" x="72" y={mid + 4} textAnchor="middle">{cut(active, 13)}<title>{active}</title></text>
                </g>
                {sd.map((d, i) => (
                  <g key={d}>
                    <rect className="g-dev" x="250" y={y(i, sd.length) - 14} width="114" height="28" rx="6" />
                    <text className="g-dev-t" x="307" y={y(i, sd.length) + 4} textAnchor="middle">{cut(d, 14)}<title>{d}</title></text>
                  </g>
                ))}
                {na.map((a, i) => (
                  <g
                    key={a}
                    role="button"
                    tabIndex={0}
                    aria-label={"Show " + a}
                    className="graph-node"
                    onClick={() => choose(a)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        choose(a);
                      }
                    }}
                  >
                    <circle className="g-link" cx="528" cy={y(i, na.length)} r="8" />
                    <text className="g-link-t" x="546" y={y(i, na.length) + 4}>{cut(a, 18)}<title>{a}</title></text>
                  </g>
                ))}
              </svg>
            </div>
            <p className="panel-note graph-note">
              The diagram shows up to 8 shared devices and 10 linked accounts; choose a linked account to re-centre it. The table lists every linked account. A shared device is a lead to check, not proof of fraud.
            </p>
            <div className="table-scroll" tabIndex={0} role="region" aria-label="Linked accounts table, scrollable">
              <table className="link-table">
                <caption className="sr-only">Accounts linked to {active} through shared devices</caption>
                <thead>
                  <tr>
                    <th scope="col">Linked account</th>
                    <th scope="col">Shared devices</th>
                    <th scope="col" className="r">Transactions</th>
                    <th scope="col" className="r">Flagged</th>
                  </tr>
                </thead>
                <tbody>
                  {neighbors.slice(0, 50).map((a) => {
                    const list = byAccount.get(a) || [];
                    const via = sharedDevices.filter((d) => accountsByDevice.get(d)?.has(a));
                    return (
                      <tr key={a}>
                        <td><button className="id-button" onClick={() => choose(a)}>{a}</button></td>
                        <td className="mono" title={via.join(", ")}>{via.slice(0, 3).join(", ")}{via.length > 3 ? ` +${via.length - 3}` : ""}</td>
                        <td className="mono r">{list.length.toLocaleString("en-IN")}</td>
                        <td className="mono r">{list.filter((x) => x.flagged).length.toLocaleString("en-IN")}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {neighbors.length > 50 && <p className="panel-note">Showing 50 of {neighbors.length.toLocaleString("en-IN")} linked accounts.</p>}
          </>
        )}
      </Panel>
      <Panel
        title={`Transactions on ${active}`}
        subtitle="Highest anomaly percentiles first"
        action={<Link className="text-link" href={"/app/transactions?q=" + encodeURIComponent(active)}>View all in Transactions <ArrowRight size={14} aria-hidden="true" /></Link>}
      >
        <TransactionTable
          items={[...entityRows].sort((a, b) => b.risk_score - a.risk_score).slice(0, 5)}
          onSelect={(t) => ws.setSelected(t)}
          flagFloor={flagFloor}
          caseByTx={caseByTx}
          caption={`Top transactions for ${active}`}
          empty={<div className="empty-small">No transactions for this account.</div>}
        />
      </Panel>
    </>
  );
}
