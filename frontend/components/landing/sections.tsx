import Link from "next/link";
import { Activity, ArrowRight, ArrowUpRight, FlaskConical, FolderOpen, LayoutDashboard, Network, Search } from "lucide-react";
import { Reveal } from "./reveal";
import { ScrollStage } from "./scroll-stage";
import { confusion, metrics, queue, reasons, searchResults, sharedDevices, steps, workspaceLinks } from "./data";

const css = (v: Record<string, string | number>) => v as React.CSSProperties;

// Scene boundaries as fractions of the pinned range: queue and settle, select, connect, document.
const cuts = [0.22, 0.48, 0.74];
const statuses = ["open", "reviewing", "cleared", "escalated"];

const reading =
  "Synthetic sample of the workspace in four stages. The Transactions queue is ranked by anomaly percentile. TXN-10513 for ₹10,023.97 on ACC-035 is selected at percentile 100 and flagged, with velocity, distance and account age as its evidence. ACC-035 and ACC-077 are linked through the shared device DEV-035. The investigation records a reviewing status and a note, each change stored with its UTC time.";

const nav = [
  { group: "Work", items: [["Overview", LayoutDashboard], ["Transactions", ArrowRight], ["Investigations", FolderOpen]] },
  { group: "Explore", items: [["Linked accounts", Network], ["Evidence search", Search]] },
  { group: "Model", items: [["Experiments", FlaskConical], ["Data checks", Activity]] },
] as const;

function Cta({ note, detail }: { note: string; detail: string }) {
  return (
    <div className="lp-pill">
      <p className="lp-pill-text">
        <strong>{note}</strong>
        <span>{detail}</span>
      </p>
      <Link prefetch={false} href="/app/overview" className="lp-btn lp-btn-primary">
        Open workspace <ArrowUpRight size={17} aria-hidden="true" />
      </Link>
    </div>
  );
}

// The product itself: the Transactions screen with its inspector, built from the real workspace labels and the built-in
// synthetic sample. The scroll changes what it shows (data-reach) without changing its structure.
function Device() {
  return (
    <div className="lp-device" data-p="" role="img" aria-label={reading}>
      <div className="lp-dev-top">
        <span className="lp-crumb">Workspace <i>/</i> <b>Transactions</b></span>
        <span className="lp-chip">Synthetic sample</span>
      </div>
      <div className="lp-dev-grid">
        <aside className="lp-side">
          <p className="lp-dev-brand">finsight <span>AI</span></p>
          {nav.map((g) => (
            <div key={g.group}>
              <p className="lp-side-group">{g.group}</p>
              <ul>
                {g.items.map(([label, Icon]) => (
                  <li key={label} data-on={label === "Transactions"}><Icon size={14} aria-hidden="true" />{label}</li>
                ))}
              </ul>
            </div>
          ))}
          <p className="lp-side-foot">Single analyst · batch analysis<br />No payment actions</p>
        </aside>

        <div className="lp-main">
          <div className="lp-main-head">
            <p className="lp-dev-title">Transactions</p>
            <p className="lp-dev-sub">Ranked by anomaly percentile. A percentile is not a fraud probability.</p>
            <p className="lp-run-line"><span className="lp-chip lp-chip-accent">Synthetic sample</span> 1,200 rows · INR · Isolation Forest, 100 trees</p>
          </div>
          <div className="lp-queue">
            <table className="lp-q">
              <thead>
                <tr>
                  <th>Transaction</th>
                  <th className="lp-q-merchant">Merchant</th>
                  <th className="lp-r">Amount</th>
                  <th className="lp-r">Percentile</th>
                  <th className="lp-q-review">Review</th>
                </tr>
              </thead>
              <tbody>
                {queue.map((r) => (
                  <tr key={r.id} className="lp-row">
                    <td><span className="lp-id">{r.id}</span><span className="lp-sub">{r.account}</span></td>
                    <td className="lp-q-merchant">{r.merchant}</td>
                    <td className="lp-r lp-fig">{r.amount}</td>
                    <td className="lp-r lp-fig lp-pc"><span>{r.percentile.toFixed(1)}</span><i style={css({ "--w": `${r.percentile}%` })} /></td>
                    <td className="lp-q-review"><span className="lp-flag">Flagged</span></td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="lp-link">
              <p className="lp-label">Linked accounts · shared device</p>
              <div className="lp-link-track">
                <span className="lp-wire" aria-hidden="true"><i data-p="" /></span>
                <ol className="lp-link-row">
                  <li><span className="lp-node lp-node-acc" aria-hidden="true" /><span className="lp-id">ACC-035</span><span className="lp-sub">9 transactions</span></li>
                  <li><span className="lp-node lp-node-dev" aria-hidden="true" /><span className="lp-id">DEV-035</span><span className="lp-sub">shared device</span></li>
                  <li><span className="lp-node lp-node-other" aria-hidden="true" /><span className="lp-id">ACC-077</span><span className="lp-sub">9 transactions</span></li>
                </ol>
              </div>
              <p className="lp-link-note">ACC-035 and ACC-077 both transact from DEV-035. A shared device is a lead, not proof.</p>
            </div>
          </div>
        </div>

        <aside className="lp-inspector">
          <div className="lp-layer lp-layer-idle" aria-hidden="true">
            <p className="lp-label">Evidence</p>
            <p className="lp-idle">Select a transaction to see why it ranks where it does.</p>
          </div>
          <div className="lp-layer lp-layer-evidence">
            <div className="lp-ins-top"><span className="lp-id lp-ins-id">TXN-10513</span><span className="lp-flag">Flagged</span></div>
            <p className="lp-ins-line">ACC-035 · DEV-035 · Northstar Retail</p>
            <dl className="lp-kv">
              <div><dt>Amount</dt><dd>₹10,023.97</dd></div>
              <div><dt>When</dt><dd>2026-10-03 20:16 UTC</dd></div>
              <div><dt>Percentile</dt><dd>100.0</dd></div>
            </dl>
            <p className="lp-label">Why it stands out</p>
            <ul className="lp-reasons">
              {reasons.map((r) => (
                <li key={r.name}>
                  <span>{r.name}</span>
                  <span className="lp-fig">{r.value}</span>
                  <span className="lp-fig lp-dev">{r.dev}</span>
                  <span className="lp-bar"><i data-p="" style={css({ "--w": `${r.w}%` })} /></span>
                </li>
              ))}
            </ul>
            <p className="lp-ins-foot">Deviation from the training median, in IQR units. Descriptive, not model attribution.</p>
          </div>
          <div className="lp-layer lp-layer-case">
            <p className="lp-label">Investigation</p>
            <div className="lp-status">
              {statuses.map((s) => (
                <span key={s} data-on={s === "reviewing"}>{s}</span>
              ))}
            </div>
            <p className="lp-note">Example note: velocity 14 in one hour, on a device also used by ACC-077. Check merchant history.</p>
            <ul className="lp-hist">
              <li>Status set to reviewing <span className="lp-fig">UTC</span></li>
              <li>Note saved <span className="lp-fig">UTC</span></li>
              <li>Opened from TXN-10513 <span className="lp-fig">UTC</span></li>
            </ul>
          </div>
        </aside>
      </div>
      <span className="lp-sheen" data-p="" aria-hidden="true" />
    </div>
  );
}

// Hero and product scene are one pinned composition: the headline gives way as the product rises out of perspective and
// settles flat, then a transaction is selected, its context and linked accounts appear, and it resolves into a case.
export function Film() {
  return (
    <ScrollStage id="hero" cuts={cuts} className="lp-film" labelledBy="hero-title">
      <div className="lp-film-pin">
        <div className="lp-glow" data-p="" aria-hidden="true" />
        <div className="lp-hero-copy" data-p="">
          <p className="lp-eyebrow"><span aria-hidden="true" />Fraud investigation workspace</p>
          <h1 id="hero-title" className="lp-display">
            <span>Follow the signal.</span> <em>Find the story.</em>
          </h1>
          <p className="lp-lede">Review unusual transactions, trace shared entities and document what you find, all in one workspace.</p>
        </div>

        <span id="product" className="lp-anchor" aria-hidden="true" />
        <div className="lp-device-wrap">
          <Device />
        </div>

        <div className="lp-pill-wrap" data-p="">
          <Cta note="Built-in synthetic sample" detail="1,200 rows · batch analysis · nothing is blocked in real time" />
        </div>

        <ol className="lp-rail" data-p="">
          {steps.map((s, i) => (
            <li key={s.short} className="lp-rail-i">
              <span className="lp-rail-n">0{i + 1}</span>
              <span className="lp-rail-t">{s.short}</span>
              <span className="lp-rail-b">{s.body}</span>
            </li>
          ))}
          <li className="lp-rail-line" aria-hidden="true"><i data-p="" /></li>
        </ol>
      </div>
    </ScrollStage>
  );
}

// A concise light moment after the long dark film: the three claims the product never makes.
export function Statement() {
  return (
    <section className="lp-paper lp-statement" aria-labelledby="statement-title">
      <div className="lp-wrap lp-statement-grid">
        <h2 id="statement-title" className="lp-xl">A percentile is a <em>rank</em>, not a verdict.</h2>
        <ul className="lp-truths">
          <li><p className="lp-label">Rank, not probability</p><p>Scores order rows against the training window. They do not estimate the chance of fraud.</p></li>
          <li><p className="lp-label">Batch, not live</p><p>Experiments train and score a dataset on request. Nothing blocks a payment in real time.</p></li>
          <li><p className="lp-label">Lead, not proof</p><p>A shared device or a high percentile earns a closer look. A quiet row is not a cleared row.</p></li>
        </ul>
      </div>
    </section>
  );
}

// Positions in the 1200 x 620 drawing for the four shared devices of the sample. The first is the one followed in the film.
const place: Record<string, { x: number; y: number; accounts: [number, number][] }> = {
  "DEV-035": { x: 700, y: 330, accounts: [[548, 310], [852, 352]] },
  "DEV-031": { x: 1010, y: 130, accounts: [[900, 78], [1112, 76]] },
  "DEV-002": { x: 1010, y: 482, accounts: [[894, 556], [1124, 552], [1134, 420]] },
  "DEV-001": { x: 330, y: 520, accounts: [[196, 576], [452, 574], [190, 450]] },
};

export function Trace() {
  return (
    <section id="trace" className="lp-trace" aria-labelledby="trace-title">
      <div className="lp-wrap lp-trace-copy">
        <h2 id="trace-title" className="lp-xl">Who else <em>touched</em> this device?</h2>
        <p className="lp-copy">
          Accounts that share a device identifier are linked. In the synthetic sample, 42 devices are used by more than one account. Follow the link from one flagged row to everyone behind it.
        </p>
      </div>
      <Reveal className="lp-mini">
        <svg viewBox="0 0 340 150" aria-hidden="true" focusable="false">
          <g className="lp-cl lp-cl-on">
            <path className="lp-edge" pathLength={1} d="M60 84 L170 84" />
            <path className="lp-edge" pathLength={1} d="M170 84 L280 84" />
            <circle className="lp-acc" cx="60" cy="84" r="10" />
            <circle className="lp-acc" cx="280" cy="84" r="10" />
            <rect className="lp-dev-node" x="156" y="70" width="28" height="28" transform="rotate(45 170 84)" />
            <text className="lp-nid" x="60" y="118" textAnchor="middle">ACC-035</text>
            <text className="lp-nid" x="280" y="118" textAnchor="middle">ACC-077</text>
            <text className="lp-nid" x="170" y="46" textAnchor="middle">DEV-035</text>
            <text className="lp-ncount" x="60" y="136" textAnchor="middle">9 transactions</text>
            <text className="lp-ncount" x="280" y="136" textAnchor="middle">9 transactions</text>
          </g>
        </svg>
      </Reveal>
      <Reveal className="lp-graph">
        <svg viewBox="0 0 1200 620" aria-hidden="true" focusable="false" preserveAspectRatio="xMidYMid meet">
          {sharedDevices.map((d) => {
            const p = place[d.device];
            const on = d.device === "DEV-035";
            return (
              <g key={d.device} className={on ? "lp-cl lp-cl-on" : "lp-cl"}>
                {d.accounts.map((a, i) => {
                  const [x, y] = p.accounts[i];
                  return (
                    <g key={a.id}>
                      <path className="lp-edge" pathLength={1} d={`M${p.x} ${p.y} L${x} ${y}`} />
                      <circle className="lp-acc" cx={x} cy={y} r={on ? 9 : 6} />
                      <text className="lp-nid" x={x} y={y + (on ? 30 : 24)} textAnchor="middle">{a.id}</text>
                      {on && <text className="lp-ncount" x={x} y={y + 48} textAnchor="middle">{a.n} transactions</text>}
                    </g>
                  );
                })}
                <rect className="lp-dev-node" x={p.x - (on ? 12 : 8)} y={p.y - (on ? 12 : 8)} width={on ? 24 : 16} height={on ? 24 : 16} transform={`rotate(45 ${p.x} ${p.y})`} />
                <text className="lp-nid lp-did" x={p.x} y={p.y - (on ? 26 : 20)} textAnchor="middle">{d.device}</text>
              </g>
            );
          })}
        </svg>
        <p className="lp-graph-key"><span className="lp-key-acc" aria-hidden="true" /> Account <span className="lp-key-dev" aria-hidden="true" /> Shared device · built-in synthetic sample</p>
      </Reveal>
      <ul className="lp-wrap lp-shared-list">
        {sharedDevices.map((d) => (
          <li key={d.device}>
            <span className="lp-id">{d.device}</span>
            <span className="lp-sub">{d.accounts.map((a) => `${a.id} (${a.n})`).join(" · ")}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function Models() {
  return (
    <section id="models" className="lp-paper lp-models" aria-labelledby="models-title">
      <div className="lp-wrap">
        <p className="lp-label lp-models-tag">Held-out evaluation · Isolation Forest, 100 trees · 360 rows</p>
        <h2 id="models-title" className="lp-h2">Scores you can inspect. Claims you can check.</h2>
        <div className="lp-models-grid">
          <div className="lp-big">
            <dl className="lp-big-main">
              <div>
                <dt>ROC-AUC</dt>
                <dd className="lp-fig">99.9%</dd>
              </div>
            </dl>
            <dl className="lp-big-rest">
              {metrics.map((m) => (
                <div key={m.label}>
                  <dt>{m.label}</dt>
                  <dd className="lp-fig">{m.value}</dd>
                </div>
              ))}
            </dl>
          </div>
          <div className="lp-matrix-wrap">
            <p className="lp-label">Confusion matrix · held-out rows</p>
            <dl className="lp-matrix">
              {confusion.map((c, i) => (
                <div key={c.label} data-k={i}>
                  <dt>{c.label}</dt>
                  <dd className="lp-fig">{c.value}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
        <p className="lp-caution">
          Synthetic sample: labels come from simple generating rules. These metrics do not estimate real-world performance. Each run records its model, its settings and its evaluation, so experiments can be compared on the same slice before a change is trusted.
        </p>
      </div>
    </section>
  );
}

export function Evidence() {
  return (
    <section id="evidence" className="lp-evidence" aria-labelledby="evidence-title">
      <div className="lp-wrap lp-evidence-grid">
        <div className="lp-evidence-copy">
          <h2 id="evidence-title" className="lp-xl">Every conclusion keeps its <em>source</em>.</h2>
          <p className="lp-copy">
            Notes and status changes are saved with the investigation, each with its UTC time. Evidence search is keyword matching over your own rows. It returns what matched and cites the transaction. It is not a chat assistant and it does not write answers.
          </p>
        </div>
        <div className="lp-stack">
          <Reveal className="lp-sheet lp-sheet-a" label="Evidence search results for ACC-035: TXN-10513, TXN-11155 and TXN-10699, each with account, merchant, amount and anomaly percentile.">
            <p className="lp-label">Evidence search · “ACC-035”</p>
            <ol className="lp-results">
              {searchResults.map((r) => (
                <li key={r.id}>
                  <span className="lp-rank">{r.n}</span>
                  <span><span className="lp-id">{r.id}</span><span className="lp-sub">{r.detail}</span></span>
                  <span className="lp-r lp-fig">{r.amount}</span>
                  <span className="lp-fig lp-pct">{r.percentile}</span>
                </li>
              ))}
            </ol>
          </Reveal>
          <Reveal className="lp-sheet lp-sheet-b" label="An investigation record with a status of reviewing, a saved note, and a history of changes stamped in UTC.">
            <p className="lp-label">Investigation record · TXN-10513</p>
            <div className="lp-status">
              {statuses.map((s) => (
                <span key={s} data-on={s === "reviewing"}>{s}</span>
              ))}
            </div>
            <p className="lp-note">Example note: velocity 14 in one hour, on a device also used by ACC-077. Check merchant history.</p>
            <ul className="lp-hist">
              <li>Status set to reviewing <span className="lp-fig">UTC</span></li>
              <li>Note saved <span className="lp-fig">UTC</span></li>
              <li>Opened from TXN-10513 <span className="lp-fig">UTC</span></li>
            </ul>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

// Bookend of the hero: the queue tilts back into the light again, with the same pill.
export function Closing() {
  return (
    <section className="lp-closing" aria-labelledby="closing-title">
      <div className="lp-wrap lp-closing-copy">
        <h2 id="closing-title" className="lp-display lp-display-m">Open the workspace.<br /><em>Start with the first row.</em></h2>
        <Cta note="Everything here is the built-in synthetic sample" detail="Import your own CSV from inside the workspace" />
      </div>
      <div className="lp-horizon" aria-hidden="true">
        <div className="lp-horizon-plane">
          {queue.slice(0, 6).map((r) => (
            <div key={r.id} className="lp-hrow">
              <span className="lp-id">{r.id}</span>
              <span>{r.merchant}</span>
              <span className="lp-fig">{r.amount}</span>
              <span className="lp-fig lp-pct">{r.percentile.toFixed(1)}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function Footer() {
  return (
    <footer className="lp-footer">
      <div className="lp-wrap lp-footer-grid">
        <p className="lp-footer-note">
          FinSight AI is a single-owner analyst workspace. Sign-in is one shared owner password, not individual accounts. Scores rank rows for review and are not fraud verdicts.
        </p>
        <nav aria-label="Workspace">
          <ul>
            {workspaceLinks.map((l) => (
              <li key={l.href}><Link prefetch={false} href={l.href}>{l.label}</Link></li>
            ))}
          </ul>
        </nav>
      </div>
    </footer>
  );
}
