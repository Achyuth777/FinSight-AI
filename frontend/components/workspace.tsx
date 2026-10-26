"use client";
import Link from "next/link";
import { useEffect, useState, useMemo, useRef } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import {
  Activity,
  ArrowDownToLine,
  ArrowRight,
  ArrowUpRight,
  Beaker,
  Check,
  ChevronRight,
  Database,
  FileSearch,
  LayoutDashboard,
  LogOut,
  Loader2,
  Menu,
  Network,
  Plus,
  Search,
  ShieldCheck,
  Sparkles,
  Upload,
  X,
  SlidersHorizontal,
  Info,
  ScanLine,
} from "lucide-react";
import { Brand } from "./brand";
import { Button } from "./ui/button";
import { ActivityChart, RiskChart } from "./charts";
import {
  api,
  type Tx,
  type Run,
  type Dataset,
  type Case,
  type Metrics,
} from "./types";
const nav = [
  ["overview", "Overview", LayoutDashboard],
  ["transactions", "Transactions", ArrowRight],
  ["investigations", "Investigations", FileSearch],
  ["network", "Entity network", Network],
  ["laboratory", "ML laboratory", Beaker],
  ["monitoring", "Monitoring", Activity],
  ["assistant", "Research assistant", Sparkles],
] as const;
const titles: Record<string, [string, string]> = {
  overview: [
    "A clearer view of risk.",
    "Explore the signals. Understand the context. Decide what happens next.",
  ],
  transactions: [
    "Transaction intelligence",
    "Find unusual behavior and inspect the evidence behind every score.",
  ],
  investigations: [
    "Investigation center",
    "An accountable workspace for evidence, observations, and decisions.",
  ],
  network: [
    "Follow the connections.",
    "Explore account relationships through shared device identifiers.",
  ],
  laboratory: [
    "The ML laboratory",
    "Reproducible experiments. Transparent evaluation. No invented metrics.",
  ],
  monitoring: [
    "Know when patterns shift.",
    "Compare training and held-out features, data quality, and run timing.",
  ],
  assistant: [
    "Evidence, within reach.",
    "Search transaction evidence and follow every answer back to its source.",
  ],
};
const money = (n: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
const label = (s: string) => s.replaceAll("_", " ");
const featureLabel = (s: string) =>
  ["amount", "account_age_days", "distance_km"].includes(s)
    ? "log1p " + label(s)
    : s === "hour"
      ? "UTC hour"
      : label(s);
const pct = (n?: number) => (n == null ? "—" : (n * 100).toFixed(1) + "%");
function Score({ tx }: { tx: Tx }) {
  return (
    <span
      className={
        "score " +
        (tx.risk_score >= 95 ? "high" : tx.risk_score >= 80 ? "medium" : "low")
      }
    >
      <i />
      {tx.risk_score.toFixed(1)}
    </span>
  );
}
function Panel({
  title,
  subtitle,
  children,
  action,
  className = "",
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={"panel " + className}>
      <div className="panel-head">
        <div>
          <h2>{title}</h2>
          {subtitle && <p>{subtitle}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}
function MetricCards({ metrics }: { metrics: Metrics }) {
  return !metrics.available ? (
    <div className="notice">
      <Info size={18} />
      {metrics.reason}
    </div>
  ) : (
    <div className="metric-grid compact">
      {[
        ["ROC-AUC", metrics.roc_auc],
        ["Average precision", metrics.average_precision],
        ["Precision", metrics.precision],
        ["Recall", metrics.recall],
      ].map(([name, value]) => (
        <div className="metric" key={String(name)}>
          <span>{name}</span>
          <strong>{pct(value as number)}</strong>
          <small>Held-out transactions</small>
        </div>
      ))}
    </div>
  );
}
export default function Workspace({ section }: { section: string }) {
  const [run, setRun] = useState<Run | null>(null),
    [datasets, setDatasets] = useState<Dataset[]>([]),
    [dataset, setDataset] = useState(""),
    [cases, setCases] = useState<Case[]>([]),
    [runs, setRuns] = useState<Run[]>([]),
    [busy, setBusy] = useState(""),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [loaded, setLoaded] = useState(false),
    [selected, setSelected] = useState<Tx | null>(null),
    [mobile, setMobile] = useState(false);
  const lastFocused = useRef<HTMLElement | null>(null);

  const [query, setQuery] = useState(""),
    [risk, setRisk] = useState("all"),
    [minAmount, setMinAmount] = useState(""),
    [split, setSplit] = useState("all"),
    [sort, setSort] = useState("risk"),
    [page, setPage] = useState(0),
    [range, setRange] = useState("all");
  const [contamination, setContamination] = useState(0.07),
    [trees, setTrees] = useState(150),
    [supervised, setSupervised] = useState(false),
    [caseId, setCaseId] = useState(""),
    [note, setNote] = useState(""),
    [caseStatus, setCaseStatus] = useState("all"),
    [entity, setEntity] = useState(""),
    [research, setResearch] = useState(""),
    [answer, setAnswer] = useState<{
      answer: string;
      sources: { citation: string; transaction_id: string; text: string }[];
    } | null>(null);
  async function task(name: string, fn: () => Promise<void>) {
    setBusy(name);
    setError("");
    setNotice("");
    try {
      await fn();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unexpected error");
    } finally {
      setBusy("");
    }
  }
  async function refresh() {
    const [ds, rs, cs] = await Promise.all([
      api<Dataset[]>("/datasets"),
      api<Run[]>("/runs"),
      api<Case[]>("/cases"),
    ]);
    setDatasets(ds);
    setRuns(rs);
    setCases(cs);
    if (ds.length) setDataset(ds[0].id);
    const preferred = localStorage.getItem("finsight-run");
    const r = rs.find((r) => r.id === preferred) || rs[0];
    if (r) {
      const full = await api<Run>("/runs/" + r.id);
      setRun(full);
      setDataset(full.dataset_id);
    }
  }
  useEffect(() => {
    task("Connecting to workspace", refresh).finally(() => setLoaded(true));
  }, []);
  async function loadRun(id: string) {
    await task("Loading experiment", async () => {
      const full = await api<Run>("/runs/" + id);
      setRun(full);
      setDataset(full.dataset_id);
      localStorage.setItem("finsight-run", id);
    });
  }
  async function experiment(id = dataset) {
    await task("Training models", async () => {
      const r = await api<Run>("/runs", {
        method: "POST",
        body: JSON.stringify({
          dataset_id: id,
          contamination,
          trees,
          supervised,
        }),
      });
      setRun(r);
      setDataset(id);
      localStorage.setItem("finsight-run", r.id);
      setRuns(await api<Run[]>("/runs"));
      setNotice(
        "Experiment complete. Review held-out metrics in the laboratory.",
      );
    });
  }
  async function demo() {
    await task("Preparing synthetic demo", async () => {
      const d = await api<Dataset>("/datasets/demo", { method: "POST" });
      setDatasets(await api<Dataset[]>("/datasets"));
      setDataset(d.id);
      const r = await api<Run>("/runs", {
        method: "POST",
        body: JSON.stringify({
          dataset_id: d.id,
          contamination: 0.07,
          trees: 150,
        }),
      });
      setRun(r);
      localStorage.setItem("finsight-run", r.id);
      setRuns(await api<Run[]>("/runs"));
      setNotice("Synthetic dataset loaded and Isolation Forest trained.");
    });
  }
  async function upload(file: File) {
    await task("Validating CSV", async () => {
      const form = new FormData();
      form.append("file", file);
      const d = await api<Dataset>("/datasets/upload", {
        method: "POST",
        body: form,
      });
      setDatasets(await api<Dataset[]>("/datasets"));
      setDataset(d.id);
      setNotice(
        "CSV validated and saved. Train a model in ML laboratory to score this dataset.",
      );
    });
  }
  async function createCase(tx: Tx) {
    if (!run) return;
    await task("Opening investigation", async () => {
      const c = await api<Case>("/cases", {
        method: "POST",
        body: JSON.stringify({
          run_id: run.id,
          transaction_id: tx.transaction_id,
        }),
      });
      setCases(await api<Case[]>("/cases"));
      setCaseId(c.id);
      setNotice(
        "Investigation saved. Open Investigations to add notes or a decision.",
      );
      setSelected(null);
    });
  }
  async function updateCase(c: Case, status?: string) {
    await task("Saving investigation", async () => {
      await api("/cases/" + c.id, {
        method: "PATCH",
        body: JSON.stringify({ status, note: status ? "" : note }),
      });
      setCases(await api<Case[]>("/cases"));
      setNote("");
      setNotice("Investigation updated.");
    });
  }
  const rows = run?.transactions || [];
  const sorted = useMemo(
    () =>
      rows
        .filter(
          (t) =>
            (
              t.transaction_id +
              " " +
              t.account_id +
              " " +
              t.merchant +
              " " +
              t.device_id
            )
              .toLowerCase()
              .includes(query.toLowerCase()) &&
            (risk === "all" ||
              (risk === "flagged" ? t.flagged : t.risk_score >= 95)) &&
            (!minAmount || t.amount >= Number(minAmount)) &&
            (split === "all" || t.split === split),
        )
        .sort((a, b) =>
          sort === "amount"
            ? b.amount - a.amount
            : sort === "recent"
              ? b.timestamp.localeCompare(a.timestamp)
              : b.risk_score - a.risk_score,
        ),
    [rows, query, risk, minAmount, split, sort],
  );
  useEffect(() => setPage(0), [query, risk, minAmount, split, sort]);
  const flagged = rows.filter((t) => t.flagged),
    high = [...rows].sort((a, b) => b.risk_score - a.risk_score),
    activeCase = cases.find((c) => c.id === caseId) || cases[0];
  const chartRows =
    range === "test" ? rows.filter((t) => t.split === "test") : rows;
  const activeEntity = entity || high[0]?.account_id;
  const entityRows = rows.filter((t) => t.account_id === activeEntity);
  const devices = [...new Set(entityRows.map((t) => t.device_id))];
  const neighbors = [
    ...new Set(
      rows
        .filter(
          (t) => devices.includes(t.device_id) && t.account_id !== activeEntity,
        )
        .map((t) => t.account_id),
    ),
  ];
  function table(items: Tx[], limit?: number) {
    return (
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Transaction / account</th>
              <th>Merchant</th>
              <th>Amount</th>
              <th>Anomaly percentile</th>
              <th>Review</th>
              <th>
                <span className="sr-only">Details</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {items.slice(0, limit).map((t) => (
              <tr key={t.transaction_id}>
                <td>
                  <button className="id-button" onClick={() => setSelected(t)}>
                    {t.transaction_id}
                  </button>
                  <small>
                    {t.account_id} · {t.timestamp.slice(0, 10)}
                  </small>
                </td>
                <td>{t.merchant}</td>
                <td className="mono">{money(t.amount)}</td>
                <td>
                  <Score tx={t} />
                </td>
                <td>
                  <span className={"pill " + (t.flagged ? "amber" : "")}>
                    {t.flagged ? "Flagged" : "Standard"}
                  </span>
                </td>
                <td>
                  <button
                    className="icon-button"
                    aria-label={"Inspect " + t.transaction_id}
                    onClick={() => setSelected(t)}
                  >
                    <ArrowUpRight size={17} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!items.length && (
          <div className="empty-small">
            No transactions match these filters.
          </div>
        )}
      </div>
    );
  }
  return (
    <div className="app-shell">
      <a href="#workspace-main" className="skip-link">
        Skip to content
      </a>
      <aside className={"sidebar " + (mobile ? "is-open" : "")}>
        <Link className="sidebar-brand" href="/" aria-label="FinSight home">
          <Brand />
        </Link>
        <div className="workspace-switch">
          <span className="workspace-avatar">F</span>
          <div>
            FinSight workspace<small>Private analyst workspace</small>
          </div>
          <ShieldCheck size={15} />
        </div>
        <span className="nav-label">INTELLIGENCE</span>
        <nav aria-label="Workspace">
          {nav.map(([path, title, Icon], i) => (
            <Link
              key={path}
              className={
                (section === path ? "active " : "") +
                (i === 4 ? "nav-divider" : "")
              }
              href={"/app/" + path}
              onClick={() => setMobile(false)}
              aria-current={section === path ? "page" : undefined}
            >
              <Icon size={18} />
              {title}
              {path === "investigations" && cases.length > 0 && (
                <span className="nav-count">{cases.length}</span>
              )}
            </Link>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="sandbox-card">
            <span className="status-dot" /> Learning environment
            <p>
              No payment actions.
              <br />
              Every decision stays with you.
            </p>
            <Link href="/#methodology">
              Explore the methodology <ArrowUpRight size={13} />
            </Link>
          </div>
          <div className="analyst">
            <span>AP</span>
            <div>
              Analyst workspace<small>Single-analyst MVP</small>
            </div>
          </div>
          <button type="button" className="logout-control" onClick={async () => { await fetch("/api/auth/logout", { method: "POST" }); window.location.assign("/"); }}><LogOut size={15}/> Sign out</button>
        </div>
      </aside>
      <div className="workspace-body">
        <header className="topbar">
          <div className="breadcrumb">
            <button
              className="icon-button mobile-menu"
              aria-label="Toggle navigation"
              onClick={() => setMobile(!mobile)}
            >
              <Menu size={20} />
            </button>
            <span>Workspace</span>
            <ChevronRight size={14} />
            <strong>{nav.find((n) => n[0] === section)?.[1]}</strong>
          </div>
          <div className="topbar-right">
            <span className="environment">
              <span className="status-dot" />
              {run?.source === "uploaded"
                ? "Uploaded dataset"
                : "Synthetic sandbox"}
            </span>
            <Link
              href="/"
              className="icon-button"
              aria-label="Marketing website"
            >
              <ArrowUpRight size={18} />
            </Link>
          </div>
        </header>
        <main tabIndex={-1} id="workspace-main" className="workspace-main">
          <div className="page-heading">
            <div>
              <span className="eyebrow">
                FINSIGHT INTELLIGENCE /{" "}
                {String(nav.findIndex((n) => n[0] === section) + 1).padStart(
                  2,
                  "0",
                )}
              </span>
              <h1>{titles[section][0]}</h1>
              <p>{titles[section][1]}</p>
            </div>
            <div className="heading-actions">
              <label className={"button outline " + (busy ? "disabled" : "")}>
                <Upload size={16} /> Import CSV
                <input
                  type="file"
                  accept=".csv"
                  className="sr-only"
                  aria-label="Import transaction CSV"
                  disabled={!!busy}
                  onChange={(e) => {
                    if (e.target.files?.[0]) upload(e.target.files[0]);
                    e.target.value = "";
                  }}
                />
              </label>
              {!run && (
                <Button onClick={demo} disabled={!!busy}>
                  Load demo <ArrowRight size={16} />
                </Button>
              )}
            </div>
          </div>
          {busy && (
            <div className="notice" role="status">
              <Loader2 className="spin" size={17} />
              {busy}…
            </div>
          )}
          {error && (
            <div className="notice error" role="alert">
              {error}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => task("Reconnecting", refresh)}
              >
                Retry connection
              </Button>
            </div>
          )}
          {notice && (
            <div className="notice success" role="status">
              <Check size={17} />
              {notice}
            </div>
          )}
          {run && (
            <div className="dataset-strip">
              <span>
                <Database size={14} />
                {run.dataset_name}
                <b>{run.source === "synthetic" ? "SYNTHETIC" : "UPLOADED"}</b>
              </span>
              <span>
                {rows.length.toLocaleString()} rows · INR ·{" "}
                {run.created_at.slice(0, 10)}
                <span className="strip-divider">/</span>Anomaly scores are not
                fraud probabilities <Info size={13} />
              </span>
            </div>
          )}
          {!run && loaded && section !== "laboratory" && (
            <div className="empty-state">
              <span className="empty-icon">
                <ScanLine size={34} />
              </span>
              <span className="eyebrow">YOUR WORKSPACE IS READY</span>
              <h2>Start with a real experiment.</h2>
              <p>
                Load 1,200 reproducible synthetic transactions and train
                Isolation Forest.
                <br />
                Or import a CSV, then open the ML laboratory to train your
                model.
              </p>
              <Button onClick={demo} disabled={!!busy}>
                Load & analyze demo <ArrowRight size={17} />
              </Button>
              <a href="/api/template" className="text-link">
                Download example CSV <ArrowDownToLine size={15} />
              </a>
              <Link href="/app/laboratory" className="text-link">
                Open ML laboratory <ArrowRight size={15} />
              </Link>
            </div>
          )}
          {run && section === "overview" && (
            <>
              <div className="metric-grid">
                <div className="metric accent">
                  <span>
                    Transactions analyzed <ArrowUpRight size={16} />
                  </span>
                  <strong>{rows.length.toLocaleString()}</strong>
                  <small>
                    Across {new Set(rows.map((t) => t.account_id)).size}{" "}
                    connected accounts
                  </small>
                </div>
                <div className="metric">
                  <span>
                    Flagged for review <ScanLine size={17} />
                  </span>
                  <strong>
                    {flagged.length}
                    <em>{pct(flagged.length / rows.length)}</em>
                  </strong>
                  <small>
                    Model threshold · {pct(run.contamination)} training
                    contamination
                  </small>
                </div>
                <div className="metric">
                  <span>
                    Flagged transaction value <ArrowUpRight size={16} />
                  </span>
                  <strong>
                    {money(flagged.reduce((a, t) => a + t.amount, 0))}
                  </strong>
                  <small>Review exposure · not confirmed fraud loss</small>
                </div>
                <div className="metric">
                  <span>
                    Open investigations <FileSearch size={17} />
                  </span>
                  <strong>
                    {
                      cases.filter((c) =>
                        ["open", "reviewing"].includes(c.status),
                      ).length
                    }
                  </strong>
                  <small>Saved across all experiments</small>
                </div>
              </div>
              <div className="overview-grid">
                <div className="overview-main">
                  <div className="chart-grid">
                    <Panel
                      title="Transaction activity"
                      subtitle="Daily counts from the selected dataset"
                      action={
                        <select
                          aria-label="Chart period"
                          value={range}
                          onChange={(e) => setRange(e.target.value)}
                        >
                          <option value="all">All data</option>
                          <option value="test">Held-out only</option>
                        </select>
                      }
                    >
                      <div className="chart-legend">
                        <span>
                          <i />
                          Transactions
                        </span>
                        <span>
                          <i />
                          Flagged
                        </span>
                      </div>
                      <ActivityChart rows={chartRows} />
                    </Panel>
                    <Panel
                      title="Anomaly distribution"
                      subtitle="Percentile relative to training data"
                    >
                      <RiskChart rows={rows} />
                    </Panel>
                  </div>
                  <Panel
                    title="Priority review queue"
                    subtitle="Highest anomaly percentiles · analyst review required"
                    action={
                      <Link className="text-link" href="/app/transactions">
                        View all <ArrowUpRight size={15} />
                      </Link>
                    }
                  >
                    {table(high, 5)}
                  </Panel>
                </div>
                <aside className="activity-rail">
                  <div className="rail-title">
                    <h2>Signals & context</h2>
                    <span>{Math.min(flagged.length, 3)}</span>
                  </div>
                  {high
                    .filter((t) => t.flagged)
                    .slice(0, 3)
                    .map((t, i) => (
                      <article className="signal-item" key={t.transaction_id}>
                        <span className={"signal-tag tag-" + i}>
                          {label(t.reasons[0].feature)} deviation
                        </span>
                        <h3>{t.account_id}</h3>
                        <p>
                          {featureLabel(t.reasons[0].feature)} differs from the
                          training median by {t.reasons[0].deviation_iqr} IQR.
                        </p>
                        <div>
                          <span>{t.transaction_id}</span>
                          <button onClick={() => setSelected(t)}>
                            Review <ArrowUpRight size={13} />
                          </button>
                        </div>
                      </article>
                    ))}
                  <div className="model-status">
                    <span className="status-dot" />
                    <strong>Model run complete</strong>
                    <p>
                      Isolation Forest · {run.trees} trees
                      <br />
                      {run.train_count} train / {run.test_count} test
                    </p>
                    <Link href="/app/laboratory">
                      Inspect experiment <ArrowRight size={14} />
                    </Link>
                  </div>
                </aside>
              </div>
            </>
          )}
          {run && section === "transactions" && (
            <Panel
              title="Transaction explorer"
              subtitle={`${sorted.length.toLocaleString()} matching transactions`}
              action={<span className="pill">READ ONLY PAYMENTS</span>}
            >
              <div className="filters">
                <div className="search-input">
                  <Search size={16} />
                  <input
                    aria-label="Search transactions"
                    placeholder="Search ID, account, merchant, device…"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                  />
                </div>
                <select
                  aria-label="Risk filter"
                  value={risk}
                  onChange={(e) => setRisk(e.target.value)}
                >
                  <option value="all">All anomaly levels</option>
                  <option value="flagged">Model flagged</option>
                  <option value="high">95th percentile +</option>
                </select>
                <input
                  className="amount-filter"
                  type="number"
                  min="0"
                  aria-label="Minimum amount"
                  placeholder="Min amount (INR)"
                  value={minAmount}
                  onChange={(e) => setMinAmount(e.target.value)}
                />
                <select
                  aria-label="Data split"
                  value={split}
                  onChange={(e) => setSplit(e.target.value)}
                >
                  <option value="all">All splits</option>
                  <option value="train">Training</option>
                  <option value="test">Held-out</option>
                </select>
                <select
                  aria-label="Sort transactions"
                  value={sort}
                  onChange={(e) => setSort(e.target.value)}
                >
                  <option value="risk">Highest anomaly</option>
                  <option value="amount">Highest amount</option>
                  <option value="recent">Most recent</option>
                </select>
              </div>
              {table(sorted.slice(page * 12, (page + 1) * 12))}
              <div className="pagination">
                <span>
                  Page {page + 1} of{" "}
                  {Math.max(1, Math.ceil(sorted.length / 12))}
                </span>
                <div>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page === 0}
                    onClick={() => setPage(page - 1)}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={(page + 1) * 12 >= sorted.length}
                    onClick={() => setPage(page + 1)}
                  >
                    Next
                  </Button>
                </div>
              </div>
            </Panel>
          )}
          {run && section === "investigations" && (
            <div className="case-grid">
              <Panel
                title="Case queue"
                action={
                  <select
                    aria-label="Case status filter"
                    value={caseStatus}
                    onChange={(e) => setCaseStatus(e.target.value)}
                  >
                    {["all", "open", "reviewing", "cleared", "escalated"].map(
                      (s) => (
                        <option key={s}>{s}</option>
                      ),
                    )}
                  </select>
                }
              >
                {cases
                  .filter(
                    (c) => caseStatus === "all" || c.status === caseStatus,
                  )
                  .map((c) => (
                    <button
                      className={
                        "case-item " +
                        (activeCase?.id === c.id ? "selected" : "")
                      }
                      key={c.id}
                      onClick={() => {
                        setCaseId(c.id);
                        setNote("");
                      }}
                    >
                      <span>
                        {c.transaction_id}
                        <span className="pill">{c.status}</span>
                      </span>
                      <small>
                        {c.transaction.account_id} ·{" "}
                        {money(c.transaction.amount)}
                      </small>
                      <small>
                        {c.source} · {c.created_at.slice(0, 10)}
                      </small>
                    </button>
                  ))}
                {!cases.length && (
                  <div className="empty-small">
                    No cases yet. Open a transaction and choose “Create
                    investigation”.
                    <Link href="/app/transactions" className="text-link">
                      Explore transactions <ArrowRight size={15} />
                    </Link>
                  </div>
                )}
              </Panel>
              {activeCase ? (
                <Panel
                  title={activeCase.transaction_id}
                  subtitle={`Evidence snapshot · ${activeCase.transaction.account_id} · ${activeCase.source}`}
                >
                  <div className="case-content">
                    <div className="case-summary">
                      <Score tx={activeCase.transaction} />
                      <span>{money(activeCase.transaction.amount)}</span>
                      <span>{activeCase.transaction.merchant}</span>
                    </div>
                    <h3>Evidence & decision timeline</h3>
                    <ol className="timeline">
                      <li>
                        <span />
                        <div>
                          <small>{activeCase.transaction.timestamp}</small>
                          <p>
                            Transaction recorded. Raw anomaly score{" "}
                            {activeCase.transaction.anomaly_score}; percentile{" "}
                            {activeCase.transaction.risk_score}.
                          </p>
                        </div>
                      </li>
                      {activeCase.events.map((e, i) => (
                        <li key={i}>
                          <span />
                          <div>
                            <small>
                              {e.at.slice(0, 19).replace("T", " ")} UTC ·{" "}
                              {e.type}
                            </small>
                            <p>{e.text}</p>
                          </div>
                        </li>
                      ))}
                    </ol>
                    <label className="field-label" htmlFor="note">
                      Analyst note
                    </label>
                    <textarea
                      id="note"
                      placeholder="What did you observe? Include the evidence and your reasoning."
                      maxLength={4000}
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                    />
                    <Button
                      disabled={!note.trim() || !!busy}
                      onClick={() => updateCase(activeCase)}
                    >
                      Save note <Plus size={15} />
                    </Button>
                    <div className="decision-row">
                      <label htmlFor="decision">Investigation decision</label>
                      <select
                        id="decision"
                        value={activeCase.status}
                        disabled={!!busy}
                        onChange={(e) => updateCase(activeCase, e.target.value)}
                      >
                        {["open", "reviewing", "cleared", "escalated"].map(
                          (s) => (
                            <option key={s}>{s}</option>
                          ),
                        )}
                      </select>
                    </div>
                    <p className="muted">
                      Decisions update this case only. No transactions are
                      blocked or payments changed.
                    </p>
                  </div>
                </Panel>
              ) : (
                <Panel title="Your evidence stays together">
                  <div className="empty-small">
                    <FileSearch size={36} />
                    <p>Select or create an investigation to begin.</p>
                  </div>
                </Panel>
              )}
            </div>
          )}
          {run && section === "network" && (
            <div className="network-grid">
              <Panel
                title="Entity relationship explorer"
                subtitle="Edges mean a shared device in this dataset; they do not prove fraud."
                action={
                  <select
                    aria-label="Select account"
                    value={activeEntity}
                    onChange={(e) => setEntity(e.target.value)}
                  >
                    {[...new Set(rows.map((t) => t.account_id))]
                      .sort()
                      .map((a) => (
                        <option key={a}>{a}</option>
                      ))}
                  </select>
                }
              >
                <div className="network-canvas">
                  <svg
                    viewBox="0 0 700 440"
                    aria-label={`Account ${activeEntity} shares ${devices.length} devices with ${neighbors.length} accounts`}
                    role="img"
                  >
                    <defs>
                      <pattern
                        id="network-grid"
                        width="24"
                        height="24"
                        patternUnits="userSpaceOnUse"
                      >
                        <circle cx="1" cy="1" r="1" fill="#3c4940" />
                      </pattern>
                    </defs>
                    <rect width="700" height="440" fill="url(#network-grid)" />
                    {devices.slice(0, 8).map((d, i) => {
                      const y = 60 + (i * 320) / Math.max(1, devices.length);
                      return (
                        <g key={d}>
                          <line
                            x1="175"
                            y1="220"
                            x2="350"
                            y2={y}
                            stroke="#768b6a"
                          />
                          {neighbors
                            .slice(0, 10)
                            .filter((a) =>
                              rows.some(
                                (t) => t.account_id === a && t.device_id === d,
                              ),
                            )
                            .map((a) => {
                              const j = neighbors.indexOf(a);
                              return (
                                <line
                                  key={a}
                                  x1="350"
                                  y1={y}
                                  x2="560"
                                  y2={
                                    45 +
                                    (j * 350) /
                                      Math.max(1, neighbors.length - 1)
                                  }
                                  stroke="#465b4b"
                                />
                              );
                            })}
                          <rect
                            x="328"
                            y={y - 22}
                            width="44"
                            height="44"
                            rx="10"
                            fill="#2c4036"
                            stroke="#8ab8aa"
                          />
                          <text
                            x="350"
                            y={y + 42}
                            textAnchor="middle"
                            fill="#c6d6cc"
                            fontSize="12"
                          >
                            {d}
                          </text>
                        </g>
                      );
                    })}
                    <circle cx="175" cy="220" r="42" fill="#d7f692" />
                    <text
                      x="175"
                      y="225"
                      textAnchor="middle"
                      fill="#18231b"
                      fontSize="13"
                      fontWeight="600"
                    >
                      {activeEntity}
                    </text>
                    {neighbors.slice(0, 10).map((a, i) => (
                      <g
                        key={a}
                        role="button"
                        tabIndex={0}
                        aria-label={"Explore " + a}
                        onClick={() => setEntity(a)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            setEntity(a);
                          }
                        }}
                        className="graph-node"
                      >
                        <circle
                          cx="560"
                          cy={
                            45 + (i * 350) / Math.max(1, neighbors.length - 1)
                          }
                          r="25"
                          fill="#343d35"
                          stroke="#b1b1df"
                        />
                        <text
                          x="600"
                          y={50 + (i * 350) / Math.max(1, neighbors.length - 1)}
                          fill="#d9e1d8"
                          fontSize="12"
                        >
                          {a}
                        </text>
                      </g>
                    ))}
                  </svg>
                </div>
                <div className="network-legend">
                  <span>
                    <i className="lime-dot" />
                    Selected account
                  </span>
                  <span>
                    <i className="cyan-dot" />
                    Device
                  </span>
                  <span>
                    <i className="purple-dot" />
                    Linked account
                  </span>
                </div>
              </Panel>
              <Panel
                title={activeEntity || "Entity"}
                subtitle="Account evidence"
              >
                <div className="entity-summary">
                  <strong>{entityRows.length}</strong>
                  <span>transactions in this dataset</span>
                  <div>{devices.length} shared device identifiers</div>
                  <div>{neighbors.length} connected accounts</div>
                  <p className="muted">
                    Select a linked account on the graph or use the account
                    selector. Graph display is capped at 8 devices and 10
                    neighbors; counts include all.
                  </p>
                </div>
                {table(
                  [...entityRows].sort((a, b) => b.risk_score - a.risk_score),
                  4,
                )}
              </Panel>
            </div>
          )}
          {section === "laboratory" && (
            <>
              <div className="lab-grid">
                <Panel
                  title="Configure an experiment"
                  subtitle="Isolation Forest · deterministic seed 42"
                >
                  <div className="form-body">
                    <label className="field-label" htmlFor="dataset">
                      Dataset
                    </label>
                    <select
                      id="dataset"
                      value={dataset}
                      onChange={(e) => setDataset(e.target.value)}
                    >
                      <option value="">Select a dataset</option>
                      {datasets.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.name} · {d.row_count} rows
                        </option>
                      ))}
                    </select>
                    <label className="field-label" htmlFor="contamination">
                      Expected training outliers{" "}
                      <strong>{pct(contamination)}</strong>
                    </label>
                    <input
                      id="contamination"
                      type="range"
                      min=".01"
                      max=".2"
                      step=".01"
                      value={contamination}
                      onChange={(e) => setContamination(Number(e.target.value))}
                    />
                    <p className="muted">
                      Sets the training decision threshold, not the fraud rate.
                    </p>
                    <label className="field-label" htmlFor="trees">
                      Number of trees
                    </label>
                    <select
                      id="trees"
                      value={trees}
                      onChange={(e) => setTrees(Number(e.target.value))}
                    >
                      {[50, 100, 150, 200, 300].map((n) => (
                        <option key={n}>{n}</option>
                      ))}
                    </select>
                    <label className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={supervised}
                        onChange={(e) => setSupervised(e.target.checked)}
                      />{" "}
                      Compare XGBoost + SHAP
                    </label>
                    <p className="muted">
                      Requires is_fraud labels. Classifier output is
                      uncalibrated; SHAP explains its raw margin.
                    </p>
                    <Button
                      disabled={!dataset || !!busy}
                      onClick={() => experiment()}
                    >
                      <Beaker size={17} /> Run experiment
                    </Button>
                    <a href="/api/template" className="text-link">
                      Download CSV template <ArrowDownToLine size={15} />
                    </a>
                    <details>
                      <summary>CSV schema & limits</summary>
                      <p>
                        100–20,000 rows, ≤5 MB, INR amounts. Required:
                        transaction_id, timestamp, account_id, device_id,
                        merchant, amount, velocity_1h, account_age_days,
                        distance_km. Optional: is_fraud (0/1). IDs must be
                        unique; numeric fields must be finite and nonnegative.
                        Upload only fields listed in this schema.
                      </p>
                    </details>
                  </div>
                </Panel>
                <div>
                  <Panel
                    title="Held-out evaluation"
                    subtitle={
                      run
                        ? `${run.train_count} earlier training rows → ${run.test_count} later test rows`
                        : "Train a model to see measured results"
                    }
                  >
                    {run ? (
                      <div className="evaluation-body">
                        <MetricCards metrics={run.metrics} />
                        <p className="muted">
                          {run.source === "synthetic"
                            ? "Synthetic labels are generated with simple rules. These metrics do not estimate real-world performance."
                            : "Metrics use supplied labels. Their reliability depends on label quality and sample representativeness."}
                        </p>
                        {run.metrics.confusion_matrix && (
                          <div className="confusion">
                            <span>
                              True negatives{" "}
                              <b>{run.metrics.confusion_matrix[0][0]}</b>
                            </span>
                            <span>
                              False positives{" "}
                              <b>{run.metrics.confusion_matrix[0][1]}</b>
                            </span>
                            <span>
                              False negatives{" "}
                              <b>{run.metrics.confusion_matrix[1][0]}</b>
                            </span>
                            <span>
                              True positives{" "}
                              <b>{run.metrics.confusion_matrix[1][1]}</b>
                            </span>
                          </div>
                        )}
                        <h3>Feature pipeline</h3>
                        <div className="feature-chips">
                          {run.feature_names.map((f) => (
                            <span className="pill" key={f}>
                              {label(f)}
                            </span>
                          ))}
                        </div>
                        <p className="muted">
                          Log1p amount, distance and account age. Hour extracted
                          in UTC. Identifiers and labels are excluded from
                          training.
                        </p>
                      </div>
                    ) : (
                      <div className="empty-small">
                        Import a CSV or load the synthetic demo.
                        <Button
                          variant="outline"
                          disabled={!!busy}
                          onClick={demo}
                        >
                          Load demo
                        </Button>
                      </div>
                    )}
                  </Panel>
                  {run?.comparison && (
                    <Panel
                      title="XGBoost comparison"
                      subtitle="Held-out metrics · threshold 0.5 · uncalibrated"
                    >
                      <div className="evaluation-body">
                        <MetricCards metrics={run.comparison.metrics} />
                        <h3>Mean absolute SHAP contributions</h3>
                        {run.comparison.shap_mean_abs.map((f) => (
                          <div className="feature-bar" key={f.feature}>
                            <span>{featureLabel(f.feature)}</span>
                            <div>
                              <i
                                style={{
                                  width:
                                    Math.min(
                                      100,
                                      (f.value /
                                        Math.max(
                                          ...run.comparison!.shap_mean_abs.map(
                                            (x) => x.value,
                                          ),
                                        )) *
                                        100,
                                    ) + "%",
                                }}
                              />
                            </div>
                            <b>{f.value.toFixed(3)}</b>
                          </div>
                        ))}
                        <p className="muted">{run.comparison.explanation}</p>
                      </div>
                    </Panel>
                  )}
                </div>
              </div>
              <Panel
                title="Experiment history"
                subtitle="Saved configurations and results"
              >
                <div className="table-scroll">
                  <table>
                    <thead>
                      <tr>
                        <th>Run</th>
                        <th>Dataset</th>
                        <th>Trees</th>
                        <th>Contamination</th>
                        <th>Average precision</th>
                        <th>Inspect</th>
                      </tr>
                    </thead>
                    <tbody>
                      {runs.map((r) => (
                        <tr key={r.id}>
                          <td>
                            {r.id.slice(0, 8)}
                            <small>
                              {r.created_at.slice(0, 19).replace("T", " ")}
                            </small>
                          </td>
                          <td>{r.dataset_name}</td>
                          <td>{r.trees}</td>
                          <td>{pct(r.contamination)}</td>
                          <td>{pct(r.metrics.average_precision)}</td>
                          <td>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => loadRun(r.id)}
                              disabled={!!busy}
                            >
                              {run?.id === r.id ? "Selected" : "Load"}{" "}
                              <ArrowUpRight size={14} />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Panel>
            </>
          )}
          {run && section === "monitoring" && (
            <>
              <div className="metric-grid">
                <div className="metric">
                  <span>Batch inference time</span>
                  <strong>
                    {run.inference_ms.toFixed(1)}
                    <em>ms</em>
                  </strong>
                  <small>{rows.length} rows · measured during this run</small>
                </div>
                <div className="metric">
                  <span>Total experiment time</span>
                  <strong>
                    {(run.duration_ms / 1000).toFixed(2)}
                    <em>s</em>
                  </strong>
                  <small>Includes optional classifier + SHAP</small>
                </div>
                <div className="metric">
                  <span>Validation</span>
                  <strong>Passed</strong>
                  <small>Required fields, ranges, unique transaction IDs</small>
                </div>
                <div className="metric">
                  <span>Feature drift flags</span>
                  <strong>
                    {run.drift.filter((d) => d.status === "review").length}
                    <em>/ {run.drift.length}</em>
                  </strong>
                  <small>PSI above 0.20 · heuristic review threshold</small>
                </div>
              </div>
              <Panel
                title="Feature distribution drift"
                subtitle="Population Stability Index · training vs held-out rows · bar scale 0–0.50 (capped)"
              >
                <div className="table-scroll">
                  <table>
                    <thead>
                      <tr>
                        <th>Feature</th>
                        <th>PSI</th>
                        <th>Distribution shift</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {run.drift.map((d) => (
                        <tr key={d.feature}>
                          <td>{featureLabel(d.feature)}</td>
                          <td className="mono">
                            {d.psi == null ? "Unavailable" : d.psi.toFixed(4)}
                          </td>
                          <td>
                            <div className="drift-track" aria-hidden="true">
                              <i
                                style={{
                                  width:
                                    Math.min(100, ((d.psi || 0) / 0.5) * 100) +
                                    "%",
                                }}
                              />
                            </div>
                          </td>
                          <td>
                            <span
                              className={
                                "pill " + (d.status === "review" ? "amber" : "")
                              }
                            >
                              {d.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {!run.drift.length && (
                    <div className="empty-small">
                      No feature drift results are available for this run.
                    </div>
                  )}
                </div>
                <p className="panel-note">
                  Training-derived quantile bins; proportions floored at 0.0001.
                  Constant training features are uninformative and shown as
                  unavailable. Review threshold uses unrounded PSI above 0.20.
                  PSI is a heuristic, not a statistical test. This is batch
                  monitoring, not a live production feed.
                </p>
              </Panel>
              <Panel
                title="Performance snapshot"
                subtitle="Last selected experiment"
              >
                <div className="evaluation-body">
                  <MetricCards metrics={run.metrics} />
                </div>
              </Panel>
            </>
          )}
          {run && section === "assistant" && (
            <div className="research-layout">
              <Panel
                title="Research assistant"
                subtitle="Evidence retrieval · no generative model connected"
                action={<span className="pill">CITED SOURCES</span>}
              >
                <div className="research-body">
                  <span className="empty-icon">
                    <Sparkles size={28} />
                  </span>
                  <h2>Start with a question about the data.</h2>
                  <p>
                    Search an account, device, merchant, transaction ID, or
                    flagged activity.
                  </p>
                  <div className="suggestions">
                    {[
                      "Flagged transactions",
                      high[0]?.account_id,
                      "Atlas Travel",
                    ]
                      .filter(Boolean)
                      .map((q) => (
                        <button key={q} onClick={() => setResearch(q)}>
                          {q}
                          <ArrowUpRight size={13} />
                        </button>
                      ))}
                  </div>
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      task("Retrieving evidence", async () =>
                        setAnswer(
                          await api("/research", {
                            method: "POST",
                            body: JSON.stringify({
                              run_id: run.id,
                              query: research,
                            }),
                          }),
                        ),
                      );
                    }}
                  >
                    <input
                      aria-label="Evidence search"
                      value={research}
                      onChange={(e) => setResearch(e.target.value)}
                      placeholder="Search the current experiment…"
                      minLength={2}
                      maxLength={300}
                      required
                    />
                    <Button
                      type="submit"
                      disabled={!!busy || research.trim().length < 2}
                    >
                      <Search size={17} /> Search
                    </Button>
                  </form>
                  {answer && (
                    <div className="answer">
                      <p>{answer.answer}</p>
                      {answer.sources.map((s) => (
                        <button
                          className="source"
                          key={s.transaction_id}
                          onClick={() =>
                            setSelected(
                              rows.find(
                                (t) => t.transaction_id === s.transaction_id,
                              ) || null,
                            )
                          }
                        >
                          <b>
                            {s.citation} {s.transaction_id}
                          </b>
                          <span>{s.text}</span>
                          <ArrowUpRight size={16} />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </Panel>
              <Panel title="Grounded by design">
                <div className="form-body">
                  <ShieldCheck size={27} />
                  <h3>Evidence before conclusions.</h3>
                  <p>
                    Every result links to a transaction in the selected model
                    run. No outside facts or invented explanations are
                    generated.
                  </p>
                  <p className="muted">
                    This MVP uses deterministic matching. Semantic retrieval
                    with sentence-transformers and LanceDB is an optional
                    roadmap extension.
                  </p>
                </div>
              </Panel>
            </div>
          )}
          <div className="workspace-footer">
            <span>
              FINSIGHT AI <span> / </span> LOCAL MVP
            </span>
            <span>Human review. Traceable decisions.</span>
          </div>
        </main>
      </div>
      <Dialog.Root
        open={!!selected}
        onOpenChange={(open) => {
          if (!open) setSelected(null);
        }}
      >
        <Dialog.Portal>
          <Dialog.Overlay className="dialog-overlay" />
          <Dialog.Content
            className="drawer"
            onOpenAutoFocus={() => {
              lastFocused.current = document.activeElement as HTMLElement;
            }}
            onCloseAutoFocus={(e) => {
              e.preventDefault();
              (lastFocused.current?.isConnected
                ? lastFocused.current
                : document.getElementById("workspace-main")
              )?.focus();
            }}
          >
            {selected && (
              <>
                <div className="drawer-top">
                  <span className="eyebrow">TRANSACTION EVIDENCE</span>
                  <Dialog.Close
                    className="icon-button"
                    aria-label="Close transaction"
                  >
                    <X size={20} />
                  </Dialog.Close>
                </div>
                <Dialog.Title>{selected.transaction_id}</Dialog.Title>
                {error && (
                  <div className="notice error" role="alert">
                    {error}
                  </div>
                )}
                {busy && (
                  <div className="notice" role="status">
                    <Loader2 className="spin" size={15} />
                    {busy}…
                  </div>
                )}
                <p className="muted">
                  {run?.source.toUpperCase()} · Run {run?.id.slice(0, 8)} ·
                  Anomaly percentile relative to training
                </p>
                <Dialog.Description className="muted">
                  {selected.merchant} · {selected.timestamp}
                </Dialog.Description>
                <div className="drawer-amount">
                  {money(selected.amount)}
                  <Score tx={selected} />
                </div>
                <div className="notice">
                  <Info size={17} />
                  Anomaly percentile, not a fraud probability.
                </div>
                <dl className="details-grid">
                  {[
                    ["Account", selected.account_id],
                    ["Device", selected.device_id],
                    ["Data split", selected.split],
                    ["Raw anomaly score", selected.anomaly_score],
                    ["Transactions / 1h", selected.velocity_1h],
                    ["Account age", selected.account_age_days + " days"],
                    ["Distance", selected.distance_km + " km"],
                  ].map(([k, v]) => (
                    <div key={k}>
                      <dt>{k}</dt>
                      <dd>{v}</dd>
                    </div>
                  ))}
                </dl>
                <h3>What stands out</h3>
                <p className="muted">
                  Absolute deviations from training medians, in interquartile
                  ranges. Contextual signals, not model attribution or proof of
                  fraud. Amount, age and distance use log1p values; hour is UTC.
                  Zero IQR uses a scale of 1 transformed unit.
                </p>
                {selected.reasons.map((r) => (
                  <div className="reason" key={r.feature}>
                    <span>{featureLabel(r.feature)}</span>
                    <strong>{r.deviation_iqr} IQR</strong>
                  </div>
                ))}
                <h3>Account history in this dataset</h3>
                <p className="muted">
                  {
                    rows.filter(
                      (t) =>
                        t.account_id === selected.account_id &&
                        t.timestamp < selected.timestamp,
                    ).length
                  }{" "}
                  earlier transactions. History excludes the selected
                  transaction and later records.
                </p>
                <Button disabled={!!busy} onClick={() => createCase(selected)}>
                  <Plus size={17} /> Create investigation
                </Button>
                <Link href="/app/investigations" className="text-link">
                  Open investigations <ArrowRight size={15} />
                </Link>
              </>
            )}
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}
