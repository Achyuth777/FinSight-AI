"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
  Info,
  ScanLine,
} from "lucide-react";
import { Brand } from "./brand";
import { money, label, featureLabel, pct, utc } from "./workspace/format";
import { Score, Panel, MetricCards, Unavailable } from "./workspace/primitives";
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
  ["overview", "Overview", LayoutDashboard, "Work"],
  ["transactions", "Transactions", ArrowRight, "Work"],
  ["investigations", "Investigations", FileSearch, "Work"],
  ["network", "Linked accounts", Network, "Explore"],
  ["assistant", "Evidence search", Search, "Explore"],
  ["laboratory", "Experiments", Beaker, "Model"],
  ["monitoring", "Data checks", Activity, "Model"],
] as const;
const groups = ["Work", "Explore", "Model"] as const;
const titles: Record<string, [string, string]> = {
  overview: ["Overview", "What the latest analysis flagged, and what to review first."],
  transactions: ["Transactions", "Search, filter and inspect the evidence behind each anomaly percentile."],
  investigations: ["Investigations", "Notes, status and decisions on transactions you chose to review."],
  network: ["Linked accounts", "Accounts that share a device identifier in this dataset."],
  laboratory: ["Experiments", "Train Isolation Forest, compare runs and read held-out metrics with their sample sizes."],
  monitoring: ["Data checks", "Training versus held-out feature drift, data quality and run timing."],
  assistant: ["Evidence search", "Deterministic cited search over this run's transactions."],
};
const statusClass = (s: string) =>
  s === "escalated" ? "amber" : s === "cleared" ? "" : "case";
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
  const router = useRouter();
  const lastTask = useRef<{ name: string; fn: () => Promise<void> } | null>(null);
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    if (!busy) return;
    setElapsed(0);
    const id = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [busy]);

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
    lastTask.current = { name, fn };
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
    task("Connecting to workspace", refresh)
      .then(() => {
        try {
          const raw = sessionStorage.getItem("finsight-landing");
          if (!raw) return;
          sessionStorage.removeItem("finsight-landing");
          const l = JSON.parse(raw);
          if (l.notice) setNotice(l.notice);
          if (l.risk) setRisk(l.risk);
        } catch {}
      })
      .finally(() => setLoaded(true));
  }, []);
  async function loadRun(id: string) {
    await task("Loading experiment", async () => {
      const full = await api<Run>("/runs/" + id);
      setRun(full);
      setDataset(full.dataset_id);
      localStorage.setItem("finsight-run", id);
    });
  }
  const selectedDataset = datasets.find((d) => d.id === dataset);
  const unlabeled = selectedDataset?.labeled === false;
  async function experiment(id = dataset) {
    await task("Training models", async () => {
      const r = await api<Run>("/runs", {
        method: "POST",
        body: JSON.stringify({
          dataset_id: id,
          contamination,
          trees,
          supervised: supervised && !unlabeled,
        }),
      });
      setRun(r);
      setDataset(id);
      localStorage.setItem("finsight-run", r.id);
      setRuns(await api<Run[]>("/runs"));
      setNotice(
        "Experiment complete. Review held-out metrics in Experiments.",
      );
    });
  }
  function analysed(r: Run) {
    const flaggedCount = r.transactions.filter((x) => x.flagged).length;
    setNotice(
      `Analysed ${r.dataset_name}: ${r.transactions.length.toLocaleString()} rows, ${flaggedCount.toLocaleString()} flagged for review.`,
    );
    setRisk("flagged");
    setSort("risk");
    setPage(0);
    // Each section is its own route and remounts, so carry the landing state across the navigation.
    try {
      sessionStorage.setItem(
        "finsight-landing",
        JSON.stringify({ notice: `Analysed ${r.dataset_name}: ${r.transactions.length.toLocaleString()} rows, ${flaggedCount.toLocaleString()} flagged for review.`, risk: "flagged" }),
      );
    } catch {}
    router.push("/app/transactions");
  }
  async function analyzeDefaults(id: string) {
    await task("Training model", async () => {
      const r = await api<Run>("/runs", {
        method: "POST",
        body: JSON.stringify({ dataset_id: id, contamination: 0.07, trees: 150 }),
      });
      setRun(r);
      setDataset(id);
      localStorage.setItem("finsight-run", r.id);
      setRuns(await api<Run[]>("/runs"));
      analysed(r);
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
      analysed(r);
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
        "CSV validated and saved. Analyze it with default settings, or tune it in Experiments.",
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
  const caseByTx = useMemo(() => {
    const m = new Map<string, Case>();
    if (run) for (const c of cases) if (c.run_id === run.id) m.set(c.transaction_id, c);
    return m;
  }, [cases, run]);
  const flagFloor = flagged.length
    ? Math.min(...flagged.map((t) => t.risk_score))
    : undefined;
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
              <th className="r">Amount (INR)</th>
              <th className="r">Anomaly percentile (vs training)</th>
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
                    {t.account_id} · {utc(t.timestamp)}
                  </small>
                </td>
                <td>{t.merchant}</td>
                <td className="mono r">{money(t.amount)}</td>
                <td className="r">
                  <Score tx={t} threshold={flagFloor} />
                </td>
                <td>
                  {caseByTx.get(t.transaction_id) ? (
                    <span className="pill case">
                      In investigation: {caseByTx.get(t.transaction_id)!.status}
                    </span>
                  ) : (
                    <span className={"pill " + (t.flagged ? "amber" : "")}>
                      {t.flagged ? "Flagged" : "Standard"}
                    </span>
                  )}
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
  const importControl = (
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
  );
  return (
    <div className="app-shell">
      <a href="#workspace-main" className="skip-link">
        Skip to content
      </a>
      <aside className={"sidebar " + (mobile ? "is-open" : "")}>
        <Link className="sidebar-brand" href="/" aria-label="FinSight home">
          <Brand />
        </Link>
        <nav aria-label="Workspace">
          {groups.map((g) => (
            <div className="nav-group" key={g} role="group" aria-label={g}>
              <span className="nav-label">{g}</span>
              {nav
                .filter((n) => n[3] === g)
                .map(([path, title, Icon]) => (
                  <Link
                    key={path}
                    className={section === path ? "active" : ""}
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
            </div>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <p className="sidebar-note">
            Single analyst · batch analysis
            <br />
            No payment actions
          </p>
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
              <h1>{titles[section][0]}</h1>
              <p>{titles[section][1]}</p>
            </div>
            {run && (section === "overview" || section === "transactions") && (
              <div className="heading-actions">{importControl}</div>
            )}
          </div>
          {busy && (
            <div className="notice" role="status">
              <Loader2 className="spin" size={17} />
              {busy}… {elapsed}s
            </div>
          )}
          {error && !(section === "investigations" && activeCase) && (
            <div className="notice error" role="alert">
              {error}
              <Button
                variant="ghost"
                size="sm"
                onClick={() =>
                  lastTask.current
                    ? task(lastTask.current.name, lastTask.current.fn)
                    : task("Reconnecting", refresh)
                }
              >
                Retry
              </Button>
            </div>
          )}
          {notice && !(section === "investigations" && activeCase) && (
            <div className="notice success" role="status">
              <Check size={17} />
              {notice}
            </div>
          )}
          {run && dataset && dataset !== run.dataset_id && datasets.some((d) => d.id === dataset) && (
            <div className="notice pending-dataset" role="status">
              <Database size={17} />
              <span>
                {datasets.find((d) => d.id === dataset)?.name} (
                {datasets.find((d) => d.id === dataset)?.row_count.toLocaleString()} rows)
                is saved but not analysed. The figures below are for run {run.id.slice(0, 8)}.
              </span>
              <Button size="sm" onClick={() => analyzeDefaults(dataset)} disabled={!!busy}>
                Analyze with defaults
              </Button>
              <Link href="/app/laboratory" className="text-link">
                Choose settings in Experiments
              </Link>
            </div>
          )}
          {run && (() => {
            const stamps = rows.map((t) => t.timestamp).sort();
            return (
              <div className="context-bar" role="group" aria-label="Analysis context">
                <div className="context-main">
                  <span className="context-name">
                    <Database size={14} />
                    {run.dataset_name}
                    <b>{run.source === "synthetic" ? "SYNTHETIC SAMPLE" : "UPLOADED"}</b>
                  </span>
                  <dl>
                    <div>
                      <dt>Data period (UTC)</dt>
                      <dd>
                        {stamps.length ? (
                          stamps[0].slice(0, 10) + " to " + stamps[stamps.length - 1].slice(0, 10)
                        ) : (
                          <Unavailable reason="no rows" />
                        )}
                      </dd>
                    </div>
                    <div>
                      <dt>Rows · currency</dt>
                      <dd>{rows.length.toLocaleString()} · INR</dd>
                    </div>
                    <div>
                      <dt>Analysed</dt>
                      <dd>{utc(run.created_at)}</dd>
                    </div>
                    <div>
                      <dt>Run · model</dt>
                      <dd>
                        {run.id.slice(0, 8)} · Isolation Forest, {run.trees} trees
                      </dd>
                    </div>
                  </dl>
                  <Link className="text-link" href="/app/laboratory#runs">
                    Change run
                  </Link>
                </div>
                <p className="context-note">
                  Batch analysis, not streaming. Scores are anomaly percentiles, not fraud probabilities. No payments are made.
                </p>
              </div>
            );
          })()}
          {!run && loaded && !error && section !== "laboratory" && !(section === "investigations" && cases.length > 0) && (
            datasets.length ? (
              <div className="empty-state">
                <span className="empty-icon">
                  <ScanLine size={34} />
                </span>
                <h2>Dataset saved, not analysed yet</h2>
                <p>
                  {datasets.find((d) => d.id === dataset)?.name ?? datasets[0].name}{" "}
                  has no analysis run. Analyze it with default settings
                  (7% contamination, 150 trees), or tune them in Experiments.
                </p>
                <Button onClick={() => analyzeDefaults(dataset || datasets[0].id)} disabled={!!busy}>
                  Analyze with defaults <ArrowRight size={17} />
                </Button>
                <Link href="/app/laboratory" className="text-link">
                  Choose settings in Experiments <ArrowRight size={15} />
                </Link>
              </div>
            ) : (
              <div className="empty-state">
                <span className="empty-icon">
                  <ScanLine size={34} />
                </span>
                <h2>No data yet</h2>
                <p>
                  Load the 1,200-row synthetic sample (not production data) and
                  train Isolation Forest, or import your own CSV.
                </p>
                <div className="empty-choices">
                  <Button onClick={demo} disabled={!!busy}>
                    Load synthetic sample <ArrowRight size={17} />
                  </Button>
                  {importControl}
                </div>
                <a href="/api/template" className="text-link">
                  Download example CSV <ArrowDownToLine size={15} />
                </a>
              </div>
            )
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
                    distinct accounts
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
              subtitle={`${sorted.length.toLocaleString()} matching transactions. Anomaly percentile ranks each row against training scores; it is not a fraud probability. Flagged means above the model threshold.`}
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
                  {sorted.length
                    ? `${(page * 12 + 1).toLocaleString()} to ${Math.min((page + 1) * 12, sorted.length).toLocaleString()} of ${sorted.length.toLocaleString()}`
                    : "No rows"}
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
          {(run || cases.length > 0) && section === "investigations" && (
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
                    (c) =>
                      caseStatus === "all" ||
                      c.status === caseStatus ||
                      c.id === activeCase?.id,
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
                        <span className={"pill " + statusClass(c.status)}>{c.status}</span>
                      </span>
                      <small>
                        {c.transaction.account_id} ·{" "}
                        {money(c.transaction.amount)}
                      </small>
                      <small>
                        {c.source} · opened {utc(c.created_at)}
                      </small>
                    </button>
                  ))}
                {cases.length > 0 &&
                  caseStatus !== "all" &&
                  !cases.some((c) => c.status === caseStatus) && (
                    <div className="empty-small">
                      No investigations with status “{caseStatus}”.
                      <button
                        type="button"
                        className="text-link"
                        onClick={() => setCaseStatus("all")}
                      >
                        Show all statuses
                      </button>
                    </div>
                  )}
                {!cases.length && (
                  <div className="empty-small">
                    No investigations yet. Open a transaction and choose
                    “Create investigation”.
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
                  action={
                    <span className={"pill " + statusClass(activeCase.status)}>
                      Status: {activeCase.status}
                    </span>
                  }
                >
                  <div className="case-content">
                    <div className="case-summary">
                      <Score tx={activeCase.transaction} threshold={flagFloor} />
                      <span>{money(activeCase.transaction.amount)}</span>
                      <span>{activeCase.transaction.merchant}</span>
                    </div>
                    <h3>Evidence & decision timeline</h3>
                    <ol className="timeline">
                      <li>
                        <span />
                        <div>
                          <small>{utc(activeCase.transaction.timestamp)}</small>
                          <p>
                            Transaction recorded. Raw anomaly score{" "}
                            {activeCase.transaction.anomaly_score}; percentile{" "}
                            {activeCase.transaction.risk_score}.
                          </p>
                        </div>
                      </li>
                      {activeCase.events.map((e, i) => (
                        <li key={`${e.at}-${i}`}>
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
                    <div className="save-row">
                      <Button
                        disabled={!note.trim() || !!busy}
                        onClick={() => updateCase(activeCase)}
                      >
                        Save note <Plus size={15} />
                      </Button>
                      {notice && (
                        <span className="saved" role="status">
                          <Check size={15} /> {notice}
                        </span>
                      )}
                    </div>
                    {error && (
                      <div className="notice error" role="alert">
                        {error} Your note is still in the box.
                      </div>
                    )}
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
                    role="group"
                  >
                    <defs>
                      <pattern
                        id="network-grid"
                        width="24"
                        height="24"
                        patternUnits="userSpaceOnUse"
                      >
                        <circle cx="1" cy="1" r="1" fill="var(--line-strong)" />
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
                            stroke="var(--cyan)"
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
                                  stroke="var(--line-strong)"
                                />
                              );
                            })}
                          <rect
                            x="328"
                            y={y - 22}
                            width="44"
                            height="44"
                            rx="10"
                            fill="var(--surface-3)"
                            stroke="var(--cyan)"
                          />
                          <text
                            x="350"
                            y={y + 42}
                            textAnchor="middle"
                            fill="var(--muted)"
                            fontSize="12"
                          >
                            {d}
                          </text>
                        </g>
                      );
                    })}
                    <circle cx="175" cy="220" r="42" fill="var(--accent)" />
                    <text
                      x="175"
                      y="225"
                      textAnchor="middle"
                      fill="var(--accent-ink)"
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
                          fill="var(--surface-3)"
                          stroke="var(--purple)"
                        />
                        <text
                          x="600"
                          y={50 + (i * 350) / Math.max(1, neighbors.length - 1)}
                          fill="var(--text)"
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
                  <div>{neighbors.length} distinct accounts</div>
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
                        checked={supervised && !unlabeled}
                        disabled={unlabeled}
                        onChange={(e) => setSupervised(e.target.checked)}
                      />{" "}
                      Compare XGBoost + SHAP
                    </label>
                    <p className="muted">
                      {unlabeled
                        ? "Unavailable: this dataset has no is_fraud labels, so XGBoost cannot be trained. Isolation Forest will still run."
                        : "Requires is_fraud labels. Classifier output is uncalibrated; SHAP explains its raw margin."}
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
                        <MetricCards metrics={run.metrics} source={run.source} />
                        <p className="muted">
                          Flag threshold: raw anomaly score above{" "}
                          {run.threshold.toFixed(4)}, set from the training
                          contamination of {pct(run.contamination)}. Isolation
                          Forest, {run.trees} trees.
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
                        <MetricCards metrics={run.comparison.metrics} source={run.source} />
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
                        <th>Average precision (held-out)</th>
                        <th>Inspect</th>
                      </tr>
                    </thead>
                    <tbody>
                      {runs.map((r) => (
                        <tr key={r.id}>
                          <td>
                            {r.id.slice(0, 8)}
                            <small>{utc(r.created_at)}</small>
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
                  <span>Import validation</span>
                  <strong>Applied</strong>
                  <small>Required fields, ranges and unique IDs are checked at import; failing files are rejected, not scored</small>
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
              <p className="panel-note">
                Held-out metrics for this run, with their sample size, are in{" "}
                <Link className="text-link" href="/app/laboratory">
                  Experiments
                </Link>
                .
              </p>
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
                  <span className="drawer-kind">Transaction evidence</span>
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
                  {selected.merchant} · {utc(selected.timestamp)}
                </Dialog.Description>
                <div className="drawer-amount">
                  {money(selected.amount)}
                  <Score tx={selected} threshold={flagFloor} />
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
                <div className="drawer-actions">
                  {caseByTx.get(selected.transaction_id) ? (
                    <>
                      <span className="pill case">
                        In investigation: {caseByTx.get(selected.transaction_id)!.status}
                      </span>
                      <Link
                        href="/app/investigations"
                        className="button primary"
                        onClick={() => setCaseId(caseByTx.get(selected.transaction_id)!.id)}
                      >
                        Open investigation <ArrowRight size={16} />
                      </Link>
                    </>
                  ) : (
                    <Button disabled={!!busy} onClick={() => createCase(selected)}>
                      <Plus size={17} /> Create investigation
                    </Button>
                  )}
                </div>
              </>
            )}
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}
