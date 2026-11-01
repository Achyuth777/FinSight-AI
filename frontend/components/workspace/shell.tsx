"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  Activity,
  ArrowDownToLine,
  ArrowRight,
  ArrowUpRight,
  Beaker,
  Check,
  Database,
  FileSearch,
  LayoutDashboard,
  Loader2,
  LogOut,
  Menu,
  Network,
  Rows3,
  ScanLine,
  Search,
  Upload,
  X,
} from "lucide-react";
import { Brand } from "../brand";
import { Button } from "../ui/button";
import { EmptyState } from "../ui/panel";
import { Notice } from "../ui/notice";
import { Sheet, SheetDescription, SheetTitle } from "../ui/sheet";
import { EvidencePanel } from "./evidence-panel";
import { Unavailable } from "./primitives";
import { utc } from "./format";
import type { Ws } from "./use-workspace";

const nav = [
  ["overview", "Overview", LayoutDashboard, "Work"],
  ["transactions", "Transactions", Rows3, "Work"],
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

// The CSV import control. One per page: the top bar carries it, or the first-use state does when the top bar has none.
function ImportControl({ ws, className = "" }: { ws: Ws; className?: string }) {
  return (
    <label className={"button outline " + className + (ws.busy ? " disabled" : "")}>
      <Upload size={15} aria-hidden="true" /> Import CSV
      <input
        type="file"
        accept=".csv"
        className="sr-only"
        aria-label="Import transaction CSV"
        disabled={!!ws.busy}
        onChange={(e) => {
          if (e.target.files?.[0]) ws.upload(e.target.files[0]);
          e.target.value = "";
        }}
      />
    </label>
  );
}

// One line of context under every page title: which dataset and run the figures come from.
function RunStrip({ ws, compact }: { ws: Ws; compact: boolean }) {
  const { run, rows } = ws;
  if (!run) return null;
  const stamps = rows.map((t) => t.timestamp).sort();
  return (
    <div className={"context-bar" + (compact ? " is-compact" : "")} role="group" aria-label="Analysis context">
      <div className="context-main">
        <span className="context-name">
          <Database size={14} aria-hidden="true" />
          {run.dataset_name}
          <b>{run.source === "synthetic" ? "SYNTHETIC SAMPLE" : "UPLOADED"}</b>
        </span>
        <dl>
          <div>
            <dt>Data period (UTC)</dt>
            <dd>{stamps.length ? stamps[0].slice(0, 10) + " to " + stamps[stamps.length - 1].slice(0, 10) : <Unavailable reason="no rows" />}</dd>
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
      {compact ? (
        <details className="context-note">
          <summary>About these scores</summary>
          <p>
            Batch analysis, not streaming. The anomaly percentile ranks each row against training scores; it is not a fraud probability. Flagged means above the model threshold. No payments are made.
          </p>
        </details>
      ) : (
        <p className="context-note">Batch analysis, not streaming. Scores are anomaly percentiles, not fraud probabilities. No payments are made.</p>
      )}
    </div>
  );
}

// Nothing to show yet: either a saved dataset that has no analysis, or nothing at all. Both end in a clear next step.
function FirstUse({ ws }: { ws: Ws }) {
  const { datasets, dataset, busy } = ws;
  if (datasets.length) {
    const target = datasets.find((d) => d.id === dataset) ?? datasets[0];
    return (
      <EmptyState
        icon={<ScanLine size={30} aria-hidden="true" />}
        title="Dataset saved, not analysed yet"
        actions={
          <div className="empty-choices">
            <Button onClick={() => ws.analyzeDefaults(dataset || datasets[0].id)} disabled={!!busy}>
              Analyze with defaults <ArrowRight size={16} aria-hidden="true" />
            </Button>
            <Link href="/app/laboratory" className="button outline">
              Choose settings in Experiments
            </Link>
          </div>
        }
      >
        {target.name} has no analysis run. Analyze it with default settings (7% contamination, 150 trees), or tune them in Experiments.
      </EmptyState>
    );
  }
  return (
    <EmptyState
      icon={<ScanLine size={30} aria-hidden="true" />}
      title={<>No data <em>yet</em></>}
      actions={
        <>
          <div className="choice-grid">
            <div className="choice">
              <h3>Try the synthetic sample</h3>
              <p>1,200 generated payments with labels. Not production data. Trains Isolation Forest in a few seconds.</p>
              <Button onClick={ws.demo} disabled={!!busy}>
                Load synthetic sample <ArrowRight size={16} aria-hidden="true" />
              </Button>
            </div>
            <div className="choice">
              <h3>Use your own file</h3>
              <p>CSV with 100 to 20,000 rows, up to 5 MB, amounts in INR. Files that fail validation are rejected, not scored.</p>
              <ImportControl ws={ws} />
            </div>
          </div>
          <a href="/api/template" className="text-link">
            Download example CSV <ArrowDownToLine size={14} aria-hidden="true" />
          </a>
        </>
      }
    >
      Load the 1,200-row synthetic sample (not production data) and train Isolation Forest, or import your own CSV.
    </EmptyState>
  );
}

export function Shell({ ws, section, children }: { ws: Ws; section: string; children: React.ReactNode }) {
  const { run, datasets, dataset, cases, busy, elapsed, error, expired, notice, loaded } = ws;
  const [menu, setMenu] = useState(false);
  const lastFocused = useRef<HTMLElement | null>(null);
  // Escape closes the phone menu.
  useEffect(() => {
    if (!menu) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMenu(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [menu]);
  const caseHasFeedback = section === "investigations" && cases.length > 0;
  const showFirstUse = !run && loaded && !error && section !== "laboratory" && !caseHasFeedback;
  const pending = run && dataset && dataset !== run.dataset_id ? datasets.find((d) => d.id === dataset) : undefined;
  const importInBar = !showFirstUse || !!run;
  const current = nav.find((n) => n[0] === section);
  return (
    <div className={"ws app-shell" + (menu ? " menu-open" : "")}>
      <a href="#workspace-main" className="skip-link">
        Skip to content
      </a>
      <aside className="sidebar" id="workspace-nav" aria-label="Workspace navigation">
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
                    onClick={() => setMenu(false)}
                    aria-current={section === path ? "page" : undefined}
                  >
                    <Icon size={16} aria-hidden="true" />
                    {title}
                    {path === "investigations" && cases.length > 0 && <span className="nav-count">{cases.length}</span>}
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
          <button
            type="button"
            className="logout-control"
            onClick={async () => {
              await fetch("/api/auth/logout", { method: "POST" });
              window.location.assign("/");
            }}
          >
            <LogOut size={15} aria-hidden="true" /> Sign out
          </button>
        </div>
      </aside>
      <button type="button" className="scrim" tabIndex={-1} aria-hidden="true" onClick={() => setMenu(false)} />
      <div className="workspace-body">
        <header className="topbar">
          <div className="breadcrumb">
            <button
              className="icon-button mobile-menu"
              aria-label={menu ? "Close navigation" : "Open navigation"}
              aria-expanded={menu}
              aria-controls="workspace-nav"
              onClick={() => setMenu(!menu)}
            >
              {menu ? <X size={18} aria-hidden="true" /> : <Menu size={18} aria-hidden="true" />}
            </button>
            <span className="crumb-root">Workspace</span>
            <span className="crumb-sep" aria-hidden="true">/</span>
            <strong>{current?.[1]}</strong>
          </div>
          <div className="topbar-right">
            {run && (
              <span className="run-chip" title={`Run ${run.id.slice(0, 8)} · ${run.dataset_name}`}>
                <i aria-hidden="true" />
                {run.source === "synthetic" ? "Synthetic sample" : "Uploaded data"} · run {run.id.slice(0, 8)}
              </span>
            )}
            {importInBar && <ImportControl ws={ws} className="small" />}
            <Link href="/" className="icon-button" aria-label="Marketing website">
              <ArrowUpRight size={17} aria-hidden="true" />
            </Link>
          </div>
        </header>
        <main tabIndex={-1} id="workspace-main" className="workspace-main">
          <div className="page-heading">
            <div>
              <h1>{titles[section][0]}</h1>
              <p>{titles[section][1]}</p>
            </div>
          </div>
          {busy && (
            <div className="notice" role="status">
              <Loader2 className="spin" size={16} aria-hidden="true" />
              <span className="notice-text">{busy}… {elapsed}s</span>
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
          {error && !expired && !caseHasFeedback && (
            <div className="notice error" role="alert">
              <span className="notice-text">{error}</span>
              <Button variant="ghost" size="sm" onClick={ws.retry}>
                Retry
              </Button>
            </div>
          )}
          {notice && !caseHasFeedback && (
            <div className="notice success" role="status">
              <Check size={16} aria-hidden="true" />
              <span className="notice-text">{notice}</span>
            </div>
          )}
          {pending && (
            <div className="notice pending-dataset" role="status">
              <Database size={16} aria-hidden="true" />
              <span className="notice-text">
                {pending.name} ({pending.row_count.toLocaleString("en-IN")} rows) is saved but not analysed. The figures below are for run {run!.id.slice(0, 8)}.
              </span>
              <Button size="sm" onClick={() => ws.analyzeDefaults(dataset)} disabled={!!busy}>
                Analyze with defaults
              </Button>
              <Link href="/app/laboratory" className="text-link">
                Choose settings in Experiments
              </Link>
            </div>
          )}
          <RunStrip ws={ws} compact={section === "transactions"} />
          {showFirstUse && <FirstUse ws={ws} />}
          {!loaded && section !== "transactions" && (
            <div className="page-skeleton" aria-hidden="true">
              <div className="stat-grid">
                {[0, 1, 2, 3].map((i) => (
                  <div className="stat" key={i}>
                    <span className="skeleton" />
                    <span className="skeleton tall" />
                  </div>
                ))}
              </div>
              <div className="panel">
                <span className="skeleton wide" />
                <span className="skeleton wide" />
                <span className="skeleton wide" />
              </div>
            </div>
          )}
          {children}
          <div className="workspace-footer">
            <span>FINSIGHT AI / LOCAL MVP</span>
            <span>Human review. Traceable decisions.</span>
          </div>
        </main>
      </div>
      {run && (
        <Sheet
          open={!!ws.selected && section !== "transactions"}
          onOpenChange={(open) => {
            if (!open) ws.setSelected(null);
          }}
          onOpenAutoFocus={() => {
            lastFocused.current = document.activeElement as HTMLElement;
          }}
          onCloseAutoFocus={(e) => {
            e.preventDefault();
            (lastFocused.current?.isConnected ? lastFocused.current : document.getElementById("workspace-main"))?.focus();
          }}
        >
          {ws.selected && (
            <EvidencePanel
              tx={ws.selected}
              run={run}
              earlier={ws.rows.filter((t) => t.account_id === ws.selected!.account_id && t.timestamp < ws.selected!.timestamp).length}
              flagFloor={ws.flagFloor}
              kase={ws.caseByTx.get(ws.selected.transaction_id)}
              busy={busy}
              error={error}
              Title={SheetTitle}
              Description={SheetDescription}
              onCreateCase={ws.createCase}
              onClose={() => ws.setSelected(null)}
            />
          )}
        </Sheet>
      )}
    </div>
  );
}
