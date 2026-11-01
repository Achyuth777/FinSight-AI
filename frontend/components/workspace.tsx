"use client";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useMemo, useRef } from "react";
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
  Info,
  ScanLine,
} from "lucide-react";
import { Brand } from "./brand";
import { money, label, featureLabel, pct, utc } from "./workspace/format";
import { Score, Panel, MetricCards, Unavailable } from "./workspace/primitives";
import { Button } from "./ui/button";
import { Sheet, SheetDescription, SheetTitle } from "./ui/sheet";
import { TransactionsScreen } from "./workspace/transactions-screen";
import { useInputMode } from "./workspace/input-mode";
import { EvidencePanel } from "./workspace/evidence-panel";
import { ActivityChart } from "./charts";
import { Stat, ShareBars } from "./ui/stat";
import { Select, Input } from "./ui/field";
import { Notice } from "./ui/notice";
import { StatusTag } from "./ui/tag";
import { TransactionTable } from "./workspace/transaction-table";
import {
  api,
  type Tx,
  type Run,
  type Dataset,
  type Case,
  type Metrics,
  ApiError,
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
const statusKind = (s: string) => (s === "escalated" ? "flag" : s === "cleared" ? "clear" : "case") as "flag" | "clear" | "case";
// What each decision means, in plain words. No decision blocks anything.
const statusMeaning: Record<string, string> = {
  open: "Open: created, not yet looked at.",
  reviewing: "Reviewing: you are working on it.",
  cleared: "Cleared: reviewed, no further action.",
  escalated: "Escalated: needs someone else's attention.",
};
export default function Workspace({ section }: { section: string }) {
  const [run, setRun] = useState<Run | null>(null),
    [datasets, setDatasets] = useState<Dataset[]>([]),
    [dataset, setDataset] = useState(""),
    [cases, setCases] = useState<Case[]>([]),
    [runs, setRuns] = useState<Run[]>([]),
    [busy, setBusy] = useState(""),
    [error, setError] = useState(""),
    [expired, setExpired] = useState(false),
    [notice, setNotice] = useState(""),
    [loaded, setLoaded] = useState(false),
    [selected, setSelected] = useState<Tx | null>(null),
    [mobile, setMobile] = useState(false);
  const lastFocused = useRef<HTMLElement | null>(null);
  const caseDetail = useRef<HTMLDivElement | null>(null);
  const router = useRouter();
  useInputMode();
  const lastTask = useRef<{ name: string; fn: () => Promise<void> } | null>(null);
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    if (!busy) return;
    setElapsed(0);
    const id = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [busy]);

  const [landingRisk, setLandingRisk] = useState<string | undefined>(),
    [range, setRange] = useState("all");
  const [contamination, setContamination] = useState(0.07),
    [trees, setTrees] = useState(150),
    [supervised, setSupervised] = useState(false),
    [caseId, setCaseId] = useState(useSearchParams().get("case") || ""),
    [note, setNote] = useState(""),
    [caseStatus, setCaseStatus] = useState("all"),
    [entity, setEntity] = useState(useSearchParams().get("account") || ""),
    [research, setResearch] = useState(useSearchParams().get("q") || ""),
    [searched, setSearched] = useState(""),
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
      if (e instanceof ApiError && e.status === 401) setExpired(true);
      // A rejected fetch means the API is unreachable; say so instead of the browser's wording.
      setError(
        e instanceof TypeError
          ? "Could not reach the FinSight API. Check that it is running, then retry. Nothing was changed."
          : e instanceof Error
            ? e.message
            : "Unexpected error",
      );
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
          if (l.risk) setLandingRisk(l.risk);
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
      `Analysed ${r.dataset_name}: ${r.transactions.length.toLocaleString("en-IN")} rows, ${flaggedCount.toLocaleString("en-IN")} flagged for review.`,
    );
    setLandingRisk("flagged");
    // Each section is its own route and remounts, so carry the landing state across the navigation.
    try {
      sessionStorage.setItem(
        "finsight-landing",
        JSON.stringify({ notice: `Analysed ${r.dataset_name}: ${r.transactions.length.toLocaleString("en-IN")} rows, ${flaggedCount.toLocaleString("en-IN")} flagged for review.`, risk: "flagged" }),
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
  // Everything the Linked accounts screen needs, built once per run rather than per render.
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
  const activeEntity = byAccount.has(entity) ? entity : high[0]?.account_id;
  const entityRows = byAccount.get(activeEntity) || [];
  const devices = [...new Set(entityRows.map((t) => t.device_id))];
  // Only a device that another account also uses links accounts together.
  const sharedDevices = devices.filter((d) => (accountsByDevice.get(d)?.size || 0) > 1);
  const neighbors = [...new Set(sharedDevices.flatMap((d) => [...(accountsByDevice.get(d) || [])]))].filter((a) => a !== activeEntity).sort();
  const plural = (n: number, w: string) => `${n.toLocaleString("en-IN")} ${w}${n === 1 ? "" : "s"}`;
  function chooseEntity(a: string) {
    setEntity(a);
    window.history.replaceState(null, "", "?account=" + encodeURIComponent(a));
  }
  async function search(q: string) {
    setResearch(q);
    window.history.replaceState(null, "", "?q=" + encodeURIComponent(q));
    await task("Retrieving evidence", async () => {
      if (!run) return;
      setAnswer(await api("/research", { method: "POST", body: JSON.stringify({ run_id: run.id, query: q }) }));
      setSearched(q);
    });
  }
  // A shared link (?q=) runs its search once the run has loaded.
  const autoSearched = useRef(false);
  useEffect(() => {
    if (run && section === "assistant" && research.trim().length >= 2 && !autoSearched.current) {
      autoSearched.current = true;
      search(research);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [run]);
  const chartRows =
    range === "test" ? rows.filter((t) => t.split === "test") : rows;
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
          {expired && (
            <Notice
              kind="error"
              action={<a className="button outline small" href={"/login?next=" + encodeURIComponent(window.location.pathname)}>Sign in again</a>}
            >
              Your session ended. Sign in again to continue. Work already saved is kept; anything unsaved on this page is lost when you leave it.
            </Notice>
          )}
          {error && !expired && !(section === "investigations" && activeCase) && (
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
                {datasets.find((d) => d.id === dataset)?.row_count.toLocaleString("en-IN")} rows)
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
                      <dd>{rows.length.toLocaleString("en-IN")} · INR</dd>
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
          {!loaded && section !== "transactions" && (
            <div className="page-skeleton" aria-hidden="true">
              <div className="stat-grid">{[0, 1, 2, 3].map((i) => <div className="stat" key={i}><span className="skeleton" /><span className="skeleton tall" /></div>)}</div>
              <div className="panel"><span className="skeleton wide" /><span className="skeleton wide" /><span className="skeleton wide" /></div>
            </div>
          )}
          {run && section === "overview" && (
            <>
              <div className="stat-grid">
                <Stat
                  label="Flagged for review"
                  value={flagged.length.toLocaleString("en-IN")}
                  note={
                    rows.length
                      ? `${pct(flagged.length / rows.length)} of ${rows.length.toLocaleString("en-IN")} rows, above the model threshold (${pct(run.contamination)} training contamination)`
                      : <Unavailable reason="this run has no rows" />
                  }
                  href="/app/transactions"
                  onClick={() => {
                    try { sessionStorage.setItem("finsight-landing", JSON.stringify({ risk: "flagged" })); } catch {}
                  }}
                />
                <Stat
                  label="Flagged value (INR)"
                  value={money(flagged.reduce((a, t) => a + t.amount, 0))}
                  note="Review exposure, not confirmed fraud loss"
                />
                <Stat
                  label="Open investigations"
                  value={cases.filter((c) => ["open", "reviewing"].includes(c.status)).length.toLocaleString("en-IN")}
                  note="Open or reviewing, across all runs"
                  href="/app/investigations"
                />
                <Stat
                  label="Transactions analyzed"
                  value={rows.length.toLocaleString("en-IN")}
                  note={`${new Set(rows.map((t) => t.account_id)).size.toLocaleString("en-IN")} distinct accounts`}
                />
              </div>
              <Panel
                title="Priority review queue"
                subtitle="Highest anomaly percentiles first. Review each before any decision."
                action={
                  <Link className="text-link" href="/app/transactions">
                    View all transactions <ArrowRight size={15} />
                  </Link>
                }
              >
                {flagged.length === 0 && rows.length > 0 && (
                  <p className="panel-note">No transaction crossed the model threshold in this run. The rows below are the highest percentiles, not flags.</p>
                )}
                <TransactionTable
                  items={high.slice(0, 5)}
                  onSelect={(t) => setSelected(t)}
                  flagFloor={flagFloor}
                  caseByTx={caseByTx}
                  caption="Five highest anomaly percentiles in this run"
                  empty={<div className="empty-small">This run has no transactions.</div>}
                />
              </Panel>
              <div className="chart-grid">
                <Panel
                  title="Transaction activity"
                  subtitle="Daily counts (UTC dates)"
                  action={
                    <Select
                      label="Chart period"
                      value={range}
                      onChange={(e) => setRange(e.target.value)}
                      options={[["all", "All data"], ["test", "Held-out only"]]}
                    />
                  }
                >
                  <div className="chart-legend">
                    <span><i />Transactions</span>
                    <span><i />Flagged</span>
                  </div>
                  {chartRows.length ? <ActivityChart rows={chartRows} /> : <div className="empty-small">No rows in this period.</div>}
                </Panel>
                <Panel title="Anomaly distribution" subtitle="Rows by percentile band, relative to training scores">
                  <ShareBars
                    label="Rows by anomaly percentile band"
                    total={rows.length}
                    rows={[
                      { name: "Below 80th", value: rows.filter((t) => t.risk_score < 80).length },
                      { name: "80th to 95th", value: rows.filter((t) => t.risk_score >= 80 && t.risk_score < 95).length },
                      { name: "95th and above", value: rows.filter((t) => t.risk_score >= 95).length },
                    ]}
                  />
                  <p className="panel-note">
                    Isolation Forest, {run.trees} trees. {run.train_count.toLocaleString("en-IN")} training and {run.test_count.toLocaleString("en-IN")} held-out rows.{" "}
                    <Link className="text-link" href="/app/laboratory">Inspect experiment</Link>
                  </p>
                </Panel>
              </div>
            </>
          )}
          {section === "transactions" && (run || !loaded) && (
            <TransactionsScreen
              key={loaded ? "ready" : "loading"}
              run={run}
              loading={!loaded}
              cases={cases}
              busy={busy}
              error={error}
              initialRisk={landingRisk}
              onCreateCase={createCase}
              onOpenCase={setCaseId}
            />
          )}
          {(run || cases.length > 0) && section === "investigations" && (
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
                    options={["all", "open", "reviewing", "cleared", "escalated"].map((s) => [s, s === "all" ? "All statuses" : s])}
                  />
                }
              >
                <div className="case-list">
                  {cases
                    .filter((c) => caseStatus === "all" || c.status === caseStatus || c.id === activeCase?.id)
                    .map((c) => (
                      <button
                        className={"case-item " + (activeCase?.id === c.id ? "selected" : "")}
                        key={c.id}
                        aria-current={activeCase?.id === c.id ? "true" : undefined}
                        onClick={() => {
                          setCaseId(c.id);
                          // Deep-linkable selection: reload and back/forward keep this case.
                          window.history.replaceState(null, "", "?case=" + encodeURIComponent(c.id));
                          setNote("");
                          if (window.innerWidth < 1100) caseDetail.current?.scrollIntoView({ block: "start" });
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
                {cases.length > 0 &&
                  caseStatus !== "all" &&
                  !cases.some((c) => c.status === caseStatus) && (
                    <div className="empty-small">
                      No investigations with status “{caseStatus}”.
                      <Button variant="outline" size="sm" onClick={() => setCaseStatus("all")}>
                        Show all statuses
                      </Button>
                    </div>
                  )}
                {!cases.length && (
                  <div className="empty-small">
                    No investigations yet. Open a transaction and choose “Create investigation”.
                    <Link href="/app/transactions" className="text-link">
                      Explore transactions <ArrowRight size={15} />
                    </Link>
                  </div>
                )}
              </Panel>
              <div ref={caseDetail} className="case-detail">
              {activeCase ? (
                <Panel
                  title={activeCase.transaction_id}
                  subtitle={`Evidence snapshot · ${activeCase.transaction.account_id} · ${activeCase.source}`}
                  action={<StatusTag kind={statusKind(activeCase.status)}>Status: {activeCase.status}</StatusTag>}
                >
                  <div className="case-content">
                    <div className="case-summary">
                      <Score tx={activeCase.transaction} threshold={flagFloor} />
                      <span className="mono">{money(activeCase.transaction.amount)}</span>
                      <span>{activeCase.transaction.merchant}</span>
                    </div>
                    <p className="muted case-link">
                      {run && activeCase.run_id === run.id ? (
                        <Link className="text-link" href={"/app/transactions?tx=" + encodeURIComponent(activeCase.transaction_id)}>
                          Open this transaction in Transactions <ArrowRight size={14} />
                        </Link>
                      ) : (
                        <>Recorded in run {activeCase.run_id.slice(0, 8)}, which is not the loaded run. The snapshot below is what was saved.</>
                      )}
                    </p>
                    <h3>Evidence and decision timeline</h3>
                    <ol className="timeline">
                      <li>
                        <span />
                        <div>
                          <small className="mono">{utc(activeCase.transaction.timestamp)}</small>
                          <p>
                            Transaction recorded. Raw anomaly score {activeCase.transaction.anomaly_score}; percentile{" "}
                            {activeCase.transaction.risk_score}.
                          </p>
                        </div>
                      </li>
                      {activeCase.events.map((e, i) => (
                        <li key={`${e.at}-${i}`}>
                          <span />
                          <div>
                            <small className="mono">
                              {utc(e.at)} · {e.type}
                            </small>
                            <p>{e.text}</p>
                          </div>
                        </li>
                      ))}
                    </ol>
                    <div className="field">
                      <label htmlFor="note">Analyst note</label>
                      <textarea
                        id="note"
                        placeholder="What did you observe? Include the evidence and your reasoning."
                        maxLength={4000}
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        aria-describedby="note-count"
                      />
                      <p className="field-hint mono" id="note-count">{note.length.toLocaleString("en-IN")} / 4,000</p>
                    </div>
                    <div className="save-row">
                      <Button disabled={!note.trim() || !!busy} onClick={() => updateCase(activeCase)}>
                        Save note <Plus size={15} />
                      </Button>
                      {!note.trim() && !notice && <span className="field-hint">Write a note to enable Save.</span>}
                      {notice && (
                        <span className="saved" role="status">
                          <Check size={15} /> {notice}
                        </span>
                      )}
                    </div>
                    {error && !expired && (
                      <Notice kind="error" action={<Button variant="ghost" size="sm" onClick={() => lastTask.current && task(lastTask.current.name, lastTask.current.fn)}>Retry</Button>}>
                        {error} Your note is still in the box.
                      </Notice>
                    )}
                    <Select
                      label="Investigation decision"
                      id="decision"
                      className="decision-row"
                      value={activeCase.status}
                      disabled={!!busy}
                      onChange={(e) => updateCase(activeCase, e.target.value)}
                      hint={`${statusMeaning[activeCase.status] || ""} Decisions update this investigation only. No transactions are blocked and no payments change.`}
                      options={["open", "reviewing", "cleared", "escalated"].map((s) => [s, s])}
                    />
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
            </div>
          )}
          {run && section === "network" && (
            <>
              <div className="stat-grid">
                <Stat label="Account" value={activeEntity} note={`${plural(entityRows.length, "transaction")} in this run`} />
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
                    value={activeEntity}
                    onChange={(e) => chooseEntity(e.target.value)}
                    options={[...byAccount.keys()].sort().map((a) => [a, a])}
                  />
                }
              >
                {entity && !byAccount.has(entity) && (
                  <p className="panel-note">Account {entity} is not in this run, so {activeEntity} is shown instead.</p>
                )}
                {neighbors.length === 0 ? (
                  <div className="empty-small">
                    {activeEntity} shares no device with another account in this run.
                    {byAccount.size > 1 && <span>Choose another account above to find links.</span>}
                  </div>
                ) : (
                  <>
                    <div className="network-canvas">
                      {(() => {
                        const sd = sharedDevices.slice(0, 8);
                        const na = neighbors.slice(0, 10);
                        const step = 40;
                        const H = 40 + Math.max(sd.length, na.length, 3) * step;
                        const cut = (s: string, n: number) => (s.length > n ? s.slice(0, n - 1) + "…" : s);
                        const dy = (i: number) => 40 + step / 2 + i * step + ((Math.max(sd.length, na.length, 3) - sd.length) * step) / 2;
                        const ay = (i: number) => 40 + step / 2 + i * step + ((Math.max(sd.length, na.length, 3) - na.length) * step) / 2;
                        return (
                          <svg viewBox={`0 0 720 ${H}`} role="group" aria-label={`${activeEntity} shares ${plural(sharedDevices.length, "device")} with ${plural(neighbors.length, "account")}`}>
                            {sd.map((d, i) => (
                              <g key={d}>
                                <line x1="96" y1={H / 2} x2="250" y2={dy(i)} stroke="var(--cyan)" strokeOpacity=".7" />
                                {na.filter((a) => accountsByDevice.get(d)?.has(a)).map((a) => (
                                  <line key={a} x1="360" y1={dy(i)} x2="540" y2={ay(na.indexOf(a))} stroke="var(--line-strong)" />
                                ))}
                              </g>
                            ))}
                            <circle cx="60" cy={H / 2} r="36" fill="var(--accent)" />
                            <text x="60" y={H / 2 + 4} textAnchor="middle" fill="var(--accent-ink)" fontSize="13" fontWeight="600">{cut(activeEntity, 9)}</text>
                            {sd.map((d, i) => (
                              <g key={d}>
                                <rect x="250" y={dy(i) - 14} width="110" height="28" rx="4" fill="var(--surface-3)" stroke="var(--cyan)" />
                                <text x="305" y={dy(i) + 4} textAnchor="middle" fill="var(--text)" fontSize="12">{cut(d, 14)}<title>{d}</title></text>
                              </g>
                            ))}
                            {na.map((a, i) => (
                              <g key={a} role="button" tabIndex={0} aria-label={"Show " + a} className="graph-node" onClick={() => chooseEntity(a)}
                                onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); chooseEntity(a); } }}>
                                <circle cx="540" cy={ay(i)} r="13" fill="var(--surface-3)" stroke="var(--purple)" />
                                <text x="562" y={ay(i) + 4} fill="var(--text)" fontSize="13">{cut(a, 18)}<title>{a}</title></text>
                              </g>
                            ))}
                          </svg>
                        );
                      })()}
                    </div>
                    <p className="panel-note graph-note">
                      The graph shows up to 8 shared devices and 10 linked accounts. The table lists every linked account.
                    </p>
                    <div className="table-scroll" tabIndex={0} role="region" aria-label="Linked accounts table, scrollable">
                      <table className="link-table">
                        <caption className="sr-only">Accounts linked to {activeEntity} through shared devices</caption>
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
                                <td><button className="id-button" onClick={() => chooseEntity(a)}>{a}</button></td>
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
                title={`Transactions on ${activeEntity}`}
                subtitle="Highest anomaly percentiles first"
                action={<Link className="text-link" href={"/app/transactions?q=" + encodeURIComponent(activeEntity)}>View all in Transactions <ArrowRight size={15} /></Link>}
              >
                <TransactionTable
                  items={[...entityRows].sort((a, b) => b.risk_score - a.risk_score).slice(0, 5)}
                  onSelect={(t) => setSelected(t)}
                  flagFloor={flagFloor}
                  caseByTx={caseByTx}
                  caption={`Top transactions for ${activeEntity}`}
                  empty={<div className="empty-small">No transactions for this account.</div>}
                />
              </Panel>
            </>
          )}
          {section === "laboratory" && (
            <>
              <div className="lab-grid">
                <Panel
                  title="Configure an experiment"
                  subtitle="Isolation Forest · deterministic seed 42"
                >
                  <div className="form-body">
                    <Select
                      label="Dataset"
                      id="dataset"
                      value={dataset}
                      onChange={(e) => setDataset(e.target.value)}
                      error={!datasets.length ? "No datasets yet. Import a CSV or load the synthetic sample from Overview." : ""}
                      options={[["", "Select a dataset"], ...datasets.map((d) => [d.id, `${d.name} · ${d.row_count.toLocaleString("en-IN")} rows`])]}
                    />
                    <Input
                      label={`Expected training outliers: ${pct(contamination)}`}
                      id="contamination"
                      type="range"
                      min=".01"
                      max=".2"
                      step=".01"
                      value={contamination}
                      hint="Sets the training decision threshold, not the fraud rate."
                      onChange={(e) => setContamination(Number(e.target.value))}
                    />
                    <Select
                      label="Number of trees"
                      id="trees"
                      value={String(trees)}
                      onChange={(e) => setTrees(Number(e.target.value))}
                      options={[50, 100, 150, 200, 300].map((n) => [String(n), String(n)])}
                    />
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
                    {!dataset && <p className="field-hint">Select a dataset to enable Run.</p>}
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
                <div className="table-scroll" tabIndex={0} role="region" aria-label="Experiment history table, scrollable">
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
              <div className="stat-grid">
                <Stat label="Batch inference time" value={`${run.inference_ms.toFixed(1)} ms`} note={`${rows.length.toLocaleString("en-IN")} rows, measured during this run`} />
                <Stat label="Total experiment time" value={`${(run.duration_ms / 1000).toFixed(2)} s`} note="Includes the optional classifier and SHAP" />
                <Stat label="Import validation" value="Applied" note="Required fields, ranges and unique IDs are checked at import. Failing files are rejected, not scored." />
                <Stat label="Feature drift flags" value={`${run.drift.filter((d) => d.status === "review").length} of ${run.drift.length}`} note="PSI above 0.20, a heuristic review threshold" />
              </div>
              <Panel
                title="Feature distribution drift"
                subtitle="Population Stability Index · training vs held-out rows · bar scale 0–0.50 (capped)"
              >
                <div className="table-scroll" tabIndex={0} role="region" aria-label="Feature drift table, scrollable">
                  <table className="drift-table">
                    <caption className="sr-only">Population stability index per feature, training versus held-out rows</caption>
                    <thead>
                      <tr>
                        <th>Feature</th>
                        <th>PSI</th>
                        <th>Distribution shift (bar full at PSI 0.50, tick at 0.20)</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {run.drift.map((d) => (
                        <tr key={d.feature}>
                          <td>{featureLabel(d.feature)}</td>
                          <td className="mono">
                            {d.psi == null ? <Unavailable reason="constant training feature" /> : d.psi.toFixed(4)}
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
                            <StatusTag kind={d.status === "review" ? "flag" : "clear"}>
                              {d.status === "review" ? "Review" : "Stable"}
                            </StatusTag>
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
          {run && section === "assistant" && (() => {
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
                      onSubmit={(e) => {
                        e.preventDefault();
                        search(research.trim());
                      }}
                    >
                      <Input
                        label="Search"
                        id="evidence-query"
                        name="evidence-query"
                        type="search"
                        autoComplete="off"
                        spellCheck={false}
                        className="search-field"
                        value={research}
                        onChange={(e) => setResearch(e.target.value)}
                        placeholder="Account, device, merchant or transaction ID"
                        minLength={2}
                        maxLength={300}
                        required
                      />
                      <Button type="submit" disabled={!!busy || research.trim().length < 2}>
                        <Search size={17} /> Search
                      </Button>
                    </form>
                    <div className="suggestions" aria-label="Examples from this run">
                      <span>Examples from this run:</span>
                      {examples.map((q) => (
                        <button type="button" key={q} disabled={!!busy} onClick={() => search(q)}>{q}</button>
                      ))}
                    </div>
                    {answer && (
                      <div className="answer" aria-live="polite">
                        <h3>Results for “{searched}”</h3>
                        <p>{answer.answer}</p>
                        {answer.sources.map((s) => {
                          const tx = rows.find((t) => t.transaction_id === s.transaction_id);
                          return (
                            <button className="source" key={s.transaction_id} disabled={!tx} onClick={() => tx && setSelected(tx)}>
                              <b className="mono">{s.citation} {s.transaction_id}</b>
                              <span>{s.text}</span>
                              <small>Open evidence <ArrowRight size={13} /></small>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </Panel>
                <Panel title="How this works">
                  <div className="form-body">
                    <p>Keyword matching over this run only. There is no language model, and nothing here explains why a transaction is anomalous.</p>
                    <p className="muted">Every result is numbered and opens the transaction it came from. At most 6 results are shown, highest anomaly percentile first.</p>
                  </div>
                </Panel>
              </div>
            );
          })()}
          <div className="workspace-footer">
            <span>
              FINSIGHT AI <span> / </span> LOCAL MVP
            </span>
            <span>Human review. Traceable decisions.</span>
          </div>
        </main>
      </div>
      {run && (
        <Sheet
          open={!!selected && section !== "transactions"}
          onOpenChange={(open) => {
            if (!open) setSelected(null);
          }}
          onOpenAutoFocus={() => {
            lastFocused.current = document.activeElement as HTMLElement;
          }}
          onCloseAutoFocus={(e) => {
            e.preventDefault();
            (lastFocused.current?.isConnected ? lastFocused.current : document.getElementById("workspace-main"))?.focus();
          }}
        >
          {selected && (
            <>
              <EvidencePanel
                tx={selected}
                run={run}
                earlier={rows.filter((t) => t.account_id === selected.account_id && t.timestamp < selected.timestamp).length}
                flagFloor={flagFloor}
                kase={caseByTx.get(selected.transaction_id)}
                busy={busy}
                error={error}
                Title={SheetTitle}
                Description={SheetDescription}
                onCreateCase={createCase}
                onOpenCase={setCaseId}
                onClose={() => setSelected(null)}
              />
            </>
          )}
        </Sheet>
      )}
    </div>
  );
}
