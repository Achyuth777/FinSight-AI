import Link from "next/link";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { Live, Reveal } from "./reveal";
import { ScrollStage } from "./scroll-stage";
import { confusion, demoRows, metrics, reasons, searchResults, steps, workspaceLinks } from "./data";

const stations = ["Transactions", "Shared entities", "Evidence", "Investigation"];

export function Hero() {
  return (
    <section className="lp-hero" aria-labelledby="hero-title">
      <div className="lp-wrap">
        <h1 id="hero-title" className="lp-display">
          <span>Follow the signal.</span> <span>Find the story.</span>
        </h1>
        <p className="lp-lede">Explore unusual transactions, trace shared entities, and organize the evidence behind your next investigation.</p>
        <div className="lp-actions">
          <Link prefetch={false} href="/app/overview" className="lp-btn lp-btn-primary lp-btn-lg">
            Open workspace <ArrowUpRight size={18} aria-hidden="true" />
          </Link>
          <a href="#workflow" className="lp-btn lp-btn-ghost lp-btn-lg">
            Explore the workflow <ArrowRight size={18} aria-hidden="true" />
          </a>
        </div>
        <Live className="lp-trace">
          <svg className="lp-trace-svg" viewBox="0 0 1200 110" preserveAspectRatio="none" aria-hidden="true" focusable="false">
            <path className="lp-trace-rail" d="M0 70 C80 70 90 70 150 70 S380 30 450 30 S680 80 750 80 S980 30 1050 30 L1200 30" vectorEffect="non-scaling-stroke" />
            <path className="lp-trace-signal" pathLength="1" d="M0 70 C80 70 90 70 150 70 S380 30 450 30 S680 80 750 80 S980 30 1050 30 L1200 30" vectorEffect="non-scaling-stroke" />
          </svg>
          <ol className="lp-trace-stations">
            {stations.map((s, i) => (
              <li key={s} style={{ "--i": i } as React.CSSProperties}>
                <span className="lp-trace-dot" aria-hidden="true" />
                <span className="lp-trace-n">0{i + 1}</span>
                <span className="lp-trace-label">{s}</span>
              </li>
            ))}
          </ol>
        </Live>
      </div>
    </section>
  );
}

const reading = "Synthetic sample of the Transactions screen. TXN-10513 for ₹10,023.97 on ACC-035 is flagged at anomaly percentile 100. Its evidence panel lists velocity, distance and account age.";

export function Product() {
  return (
    <section id="product" className="lp-section" aria-labelledby="product-title">
      <div className="lp-wrap">
        <div className="lp-head">
          <h2 id="product-title" className="lp-h2">Start with the queue. End with the story.</h2>
          <p className="lp-copy">
            The workspace opens on a ranked queue. Select a row and its context is beside it: why it stands out, who else shares its device, and where to record what you find.
          </p>
        </div>
        <Reveal className="lp-window" label={reading}>
          <div className="lp-window-bar">
            <span className="lp-window-title">Transactions</span>
            <span className="lp-window-tag">Synthetic sample · INR · UTC</span>
          </div>
          <div className="lp-window-body">
            <table className="lp-table">
              <thead>
                <tr>
                  <th>Transaction</th>
                  <th className="lp-hide-s">Merchant</th>
                  <th className="lp-num">Amount</th>
                  <th>Percentile</th>
                </tr>
              </thead>
              <tbody>
                {demoRows.map((r, i) => (
                  <tr key={r.id} data-selected={i === 0 ? "true" : "false"}>
                    <td>
                      <span className="lp-mono">{r.id}</span>
                      <span className="lp-sub">{r.account}</span>
                    </td>
                    <td className="lp-hide-s">{r.merchant}</td>
                    <td className="lp-num lp-mono">{r.amount}</td>
                    <td>
                      <span className="lp-pct">
                        
                        <span className="lp-mono">{r.percentile.toFixed(1)}</span>
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <aside className="lp-side">
              <div className="lp-side-top">
                <span className="lp-mono lp-side-id">TXN-10513</span>
                <span className="lp-tag lp-tag-flag">Flagged</span>
              </div>
              <p className="lp-side-line">ACC-035 · DEV-035 · Northstar Retail</p>
              <p className="lp-label">Why it stands out</p>
              <ul className="lp-reasons">
                {reasons.map((r) => (
                  <li key={r.name}>
                    <span>{r.name}</span>
                    <span className="lp-mono">{r.value}</span>
                    <span className="lp-mono lp-dev">{r.dev}</span>
                  </li>
                ))}
              </ul>
              <p className="lp-side-foot">DEV-035 is also used by ACC-077.</p>
            </aside>
          </div>
        </Reveal>
        <p className="lp-note">The percentile ranks a row against its training window. It is not a probability of fraud.</p>
      </div>
    </section>
  );
}

const devs = [100, 52, 48];

export function Workflow() {
  return (
    <ScrollStage steps={steps.length} className="lp-flow">
      <div className="lp-flow-pin">
        <div className="lp-wrap lp-flow-grid">
          <div className="lp-flow-text">
            <h2 id="workflow-title" className="lp-h2">From one flagged row to a documented case.</h2>
            <div className="lp-steps-wrap">
              <ol className="lp-steps">
                {steps.map((s, i) => (
                  <li key={s.title} className="lp-step" data-step={i + 1}>
                    <span className="lp-step-n lp-mono">0{i + 1}</span>
                    <div>
                      <h3>{s.title}</h3>
                      <p>{s.body}</p>
                    </div>
                  </li>
                ))}
              </ol>
              <span className="lp-spine" aria-hidden="true"><span /></span>
            </div>
          </div>

          <div className="lp-canvas" role="group" aria-label="One flagged transaction followed through four stages. Synthetic sample.">
            <div className="lp-panel" data-panel="1">
              <p className="lp-label">01 · Detect</p>
              <div className="lp-side-top">
                <span className="lp-mono lp-big">₹10,023.97</span>
                <span className="lp-tag lp-tag-flag">Flagged</span>
              </div>
              <p className="lp-side-line"><span className="lp-mono">TXN-10513</span> · ACC-035 · 2026-10-03 20:16 UTC</p>
              <p className="lp-score"><span className="lp-mono">100.0</span> anomaly percentile</p>
            </div>

            <div className="lp-panel" data-panel="2">
              <p className="lp-label">02 · Inspect</p>
              <ul className="lp-bars">
                {reasons.map((r, i) => (
                  <li key={r.name}>
                    <span className="lp-bar-name">{r.name}</span>
                    <span className="lp-bar"><span style={{ "--w": `${devs[i]}%` } as React.CSSProperties} /></span>
                    <span className="lp-mono lp-dev">{r.dev}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="lp-panel" data-panel="3">
              <p className="lp-label">03 · Connect</p>
              <svg className="lp-net" viewBox="0 0 240 110" role="img" aria-label="ACC-035 and ACC-077 are linked through the shared device DEV-035">
                <path className="lp-net-rail" d="M40 55 L120 55 L200 55" />
                <path className="lp-net-signal" pathLength="1" d="M40 55 L120 55 L200 55" />
                <g className="lp-net-node">
                  <circle cx="40" cy="55" r="9" className="lp-n-acc" />
                  <circle cx="120" cy="55" r="9" className="lp-n-dev" />
                  <circle cx="200" cy="55" r="9" className="lp-n-other" />
                </g>
                <g className="lp-net-text">
                  <text x="40" y="84" textAnchor="middle">ACC-035</text>
                  <text x="120" y="84" textAnchor="middle">DEV-035</text>
                  <text x="200" y="84" textAnchor="middle">ACC-077</text>
                  <text x="31" y="32" className="lp-net-sub">9 transactions</text>
                </g>
              </svg>
            </div>

            <div className="lp-panel" data-panel="4">
              <p className="lp-label">04 · Document</p>
              <div className="lp-status" role="list" aria-label="Investigation statuses">
                {["open", "reviewing", "cleared", "escalated"].map((s) => (
                  <span key={s} role="listitem" className="lp-status-i" data-on={s === "reviewing" ? "true" : "false"}>{s}</span>
                ))}
              </div>
              <p className="lp-quote">Example note: velocity 14 in one hour, on a device also used by ACC-077. Check merchant history.</p>
            </div>
          </div>
        </div>
      </div>
    </ScrollStage>
  );
}

export function Models() {
  return (
    <section id="models" className="lp-section" aria-labelledby="models-title">
      <div className="lp-wrap lp-split">
        <div>
          <h2 id="models-title" className="lp-h2">Scores you can inspect. Claims you can check.</h2>
          <p className="lp-copy">
            Each run records its model, its settings and a held-out evaluation. Compare experiments on the same slice before you trust a change.
          </p>
          <ul className="lp-truths">
            <li><strong>A percentile is a rank.</strong> It orders rows against the training window. It does not estimate the chance of fraud.</li>
            <li><strong>Experiments run in batch.</strong> They train and score a dataset on request. Nothing blocks a payment in real time.</li>
            <li><strong>Nothing here guarantees detection.</strong> A quiet row is not a cleared row.</li>
          </ul>
        </div>
        <Reveal className="lp-run" label="Run summary for the synthetic sample. ROC-AUC 99.9 percent, average precision 99.0 percent, precision 93.8 percent, recall 88.2 percent. 342 true negatives, 1 false positive, 2 false negatives, 15 true positives.">
          <div className="lp-window-bar">
            <span className="lp-window-title">Isolation Forest · 100 trees</span>
            <span className="lp-window-tag">Held-out · 360 rows</span>
          </div>
          <div className="lp-run-body">
            <dl className="lp-metrics">
              {metrics.map((m) => (
                <div key={m.label}>
                  <dt>{m.label}</dt>
                  <dd className="lp-mono">{m.value}</dd>
                </div>
              ))}
            </dl>
            <dl className="lp-confusion">
              {confusion.map((c) => (
                <div key={c.label}>
                  <dt>{c.label}</dt>
                  <dd className="lp-mono">{c.value}</dd>
                </div>
              ))}
            </dl>
            <p className="lp-caution">
              Synthetic sample: labels come from simple generating rules. These metrics do not estimate real-world performance.
            </p>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

export function Evidence() {
  return (
    <section id="evidence" className="lp-section" aria-labelledby="evidence-title">
      <div className="lp-wrap">
        <div className="lp-head">
          <h2 id="evidence-title" className="lp-h2">Every conclusion keeps its source.</h2>
          <p className="lp-copy">
            Notes and status changes are saved with the investigation, each with its UTC time. Evidence search is keyword matching over your own rows. It returns what matched and cites the transaction, not a written answer.
          </p>
        </div>
        <div className="lp-pair">
          <Reveal className="lp-card" label="Evidence search results for ACC-035: TXN-10513, TXN-11155 and TXN-10699, each with account, merchant, amount and anomaly percentile.">
            <p className="lp-label">Evidence search · “ACC-035”</p>
            <ol className="lp-results">
              {searchResults.map((r) => (
                <li key={r.id}>
                  <span className="lp-rank lp-mono">{r.n}</span>
                  <span>
                    <span className="lp-mono">{r.id}</span>
                    <span className="lp-sub">{r.detail}</span>
                  </span>
                  <span className="lp-num lp-mono">{r.amount}</span>
                  <span className="lp-mono lp-pctn">{r.percentile}</span>
                </li>
              ))}
            </ol>
          </Reveal>
          <Reveal className="lp-card" label="An investigation record with a status of reviewing, a saved note, and a history of changes stamped in UTC.">
            <p className="lp-label">Investigation record</p>
            <div className="lp-status">
              {["open", "reviewing", "cleared", "escalated"].map((s) => (
                <span key={s} className="lp-status-i" data-on={s === "reviewing" ? "true" : "false"}>{s}</span>
              ))}
            </div>
            <p className="lp-quote">Example note: velocity 14 in one hour, on a device also used by ACC-077. Check merchant history.</p>
            <ul className="lp-history">
              <li>Status changed to reviewing <span className="lp-mono">UTC</span></li>
              <li>Note saved <span className="lp-mono">UTC</span></li>
              <li>Investigation opened from TXN-10513 <span className="lp-mono">UTC</span></li>
            </ul>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

export function Closing() {
  return (
    <section className="lp-closing" aria-labelledby="closing-title">
      <div className="lp-wrap">
        <h2 id="closing-title" className="lp-display lp-display-m">Open the workspace.<br />Start with the first row.</h2>
        <p className="lp-lede">Everything on this page is the built-in synthetic sample. Import your own CSV from inside the workspace.</p>
        <div className="lp-actions">
          <Link prefetch={false} href="/app/overview" className="lp-btn lp-btn-primary lp-btn-lg">
            Open workspace <ArrowUpRight size={18} aria-hidden="true" />
          </Link>
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
