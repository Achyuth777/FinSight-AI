"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { api, ApiError, type Case, type Dataset, type Run, type Tx } from "../types";

// Everything the workspace shares across its routes: the loaded run, datasets and cases, the one busy task,
// feedback, and the actions that call the API. Each route is its own page and remounts, so this hook loads once per route.
export function useWorkspace() {
  const router = useRouter();
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
    [landingRisk, setLandingRisk] = useState<string | undefined>();
  const lastTask = useRef<{ name: string; fn: () => Promise<void> } | null>(null);
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    if (!busy) return;
    setElapsed(0);
    const id = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [busy]);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const retry = () => (lastTask.current ? task(lastTask.current.name, lastTask.current.fn) : task("Reconnecting", refresh));

  async function loadRun(id: string) {
    await task("Loading experiment", async () => {
      const full = await api<Run>("/runs/" + id);
      setRun(full);
      setDataset(full.dataset_id);
      localStorage.setItem("finsight-run", id);
    });
  }
  async function experiment(id: string, opts: { contamination: number; trees: number; supervised: boolean }) {
    await task("Training models", async () => {
      const r = await api<Run>("/runs", {
        method: "POST",
        body: JSON.stringify({ dataset_id: id, ...opts }),
      });
      setRun(r);
      setDataset(id);
      localStorage.setItem("finsight-run", r.id);
      setRuns(await api<Run[]>("/runs"));
      setNotice("Experiment complete. Review held-out metrics in Experiments.");
    });
  }
  function analysed(r: Run) {
    const flaggedCount = r.transactions.filter((x) => x.flagged).length;
    const message = `Analysed ${r.dataset_name}: ${r.transactions.length.toLocaleString("en-IN")} rows, ${flaggedCount.toLocaleString("en-IN")} flagged for review.`;
    setNotice(message);
    setLandingRisk("flagged");
    // Each section is its own route and remounts, so carry the landing state across the navigation.
    try {
      sessionStorage.setItem("finsight-landing", JSON.stringify({ notice: message, risk: "flagged" }));
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
        body: JSON.stringify({ dataset_id: d.id, contamination: 0.07, trees: 150 }),
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
      const d = await api<Dataset>("/datasets/upload", { method: "POST", body: form });
      setDatasets(await api<Dataset[]>("/datasets"));
      setDataset(d.id);
      setNotice("CSV validated and saved. Analyze it with default settings, or tune it in Experiments.");
    });
  }
  async function createCase(tx: Tx) {
    if (!run) return;
    await task("Opening investigation", async () => {
      await api<Case>("/cases", {
        method: "POST",
        body: JSON.stringify({ run_id: run.id, transaction_id: tx.transaction_id }),
      });
      setCases(await api<Case[]>("/cases"));
    });
  }
  // Saves a note, or a status change, on one investigation. Resolves true when the API accepted it.
  async function updateCase(c: Case, change: { status?: string; note?: string }) {
    let saved = false;
    await task("Saving investigation", async () => {
      await api("/cases/" + c.id, {
        method: "PATCH",
        body: JSON.stringify({ status: change.status, note: change.status ? "" : change.note || "" }),
      });
      setCases(await api<Case[]>("/cases"));
      setNotice("Investigation updated.");
      saved = true;
    });
    return saved;
  }

  const rows = useMemo(() => run?.transactions || [], [run]);
  const flagged = useMemo(() => rows.filter((t) => t.flagged), [rows]);
  const high = useMemo(() => [...rows].sort((a, b) => b.risk_score - a.risk_score), [rows]);
  const flagFloor = flagged.length ? Math.min(...flagged.map((t) => t.risk_score)) : undefined;
  const caseByTx = useMemo(() => {
    const m = new Map<string, Case>();
    if (run) for (const c of cases) if (c.run_id === run.id) m.set(c.transaction_id, c);
    return m;
  }, [cases, run]);

  return {
    router, run, runs, datasets, dataset, setDataset, cases, busy, elapsed, error, expired, notice, loaded, selected, setSelected,
    landingRisk, rows, flagged, high, flagFloor, caseByTx,
    task, retry, loadRun, experiment, analyzeDefaults, demo, upload, createCase, updateCase,
  };
}
export type Ws = ReturnType<typeof useWorkspace>;
