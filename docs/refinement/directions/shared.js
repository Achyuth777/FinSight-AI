/* Static preview content shared by both visual directions.
   Preview only: nothing here is read from, or written to, the FinSight API.
   Figures that exist in the real demo run (1,200 rows, 75 flagged, 962/181/57 split,
   run 97c47264, TXN-10513 on ACC-035 with velocity 1h at 6 IQR) are kept; every other row is
   sample content for layout, and the previews say so. Amounts are INR, times are UTC. */
const FS = {
  run: {
    dataset: "Synthetic payment sandbox",
    chip: "SYNTHETIC SAMPLE",
    period: "2026-10-01 to 2026-10-07",
    rows: 1200,
    analysed: "2026-11-01 07:54 UTC",
    runId: "97c47264",
    model: "Isolation Forest, 150 trees",
    flagged: 75,
    tiers: [
      { label: "Below 80th", from: 0, to: 80, n: 962 },
      { label: "80th to 95th", from: 80, to: 95, n: 181 },
      { label: "95th and above", from: 95, to: 100, n: 57 },
    ],
  },
  tx: [
    { id: "TXN-10513", acct: "ACC-035", merchant: "Nexus Electronics", amount: 84250.0, t: "2026-10-06 18:32", p: 99.4, state: "Flagged", selected: true },
    { id: "TXN-10018", acct: "ACC-038", merchant: "Atlas Travel", amount: 61900.5, t: "2026-10-01 02:24", p: 99.1, state: "In investigation" },
    { id: "TXN-10277", acct: "ACC-002", merchant: "Cloudline Digital", amount: 47320.0, t: "2026-10-03 20:56", p: 98.7, state: "Flagged" },
    { id: "TXN-10934", acct: "ACC-071", merchant: "Nexus Electronics", amount: 39999.0, t: "2026-10-07 04:08", p: 98.2, state: "Flagged" },
    { id: "TXN-10402", acct: "ACC-035", merchant: "Harbor Market", amount: 28410.75, t: "2026-10-05 11:44", p: 97.6, state: "Flagged" },
    { id: "TXN-10655", acct: "ACC-019", merchant: "Metro Mobility", amount: 22875.0, t: "2026-10-06 00:16", p: 96.9, state: "Flagged" },
    { id: "TXN-10121", acct: "ACC-064", merchant: "Northstar Retail", amount: 18460.25, t: "2026-10-02 15:12", p: 95.8, state: "Flagged" },
    { id: "TXN-10790", acct: "ACC-044", merchant: "Atlas Travel", amount: 15200.0, t: "2026-10-06 23:20", p: 94.6, state: "Flagged" },
  ],
  detail: {
    id: "TXN-10513",
    acct: "ACC-035",
    device: "DEV-0412",
    shared: ["ACC-038", "ACC-071"],
    merchant: "Nexus Electronics",
    amount: 84250.0,
    t: "2026-10-06 18:32 UTC",
    p: 99.4,
    deviations: [
      { f: "velocity 1h", v: "14 in the last hour", d: 6.0 },
      { f: "log1p amount", v: "₹84,250.00", d: 4.1 },
      { f: "distance km", v: "612 km", d: 2.2 },
      { f: "account age days", v: "19 days", d: 1.3 },
    ],
  },
};
FS.threshold = 94;

const inr = (n) => "₹" + n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const esc = (s) => String(s).replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]));

const FSR = {
  inr,
  /* Percentile ruler: FinSight's signature. A 0-100 track, the review threshold as one tick,
     the row's percentile as one mark. Percentile of the training scores, not a probability. */
  ruler(p, cls = "") {
    return `<span class="ruler ${cls}" role="img" aria-label="Anomaly percentile ${p.toFixed(1)}, review threshold ${FS.threshold}"><i class="ruler-th" style="left:${FS.threshold}%"></i><i class="ruler-fill" style="width:${p}%"></i></span>`;
  },
  stateTag(s) {
    const k = s === "Flagged" ? "flag" : s === "In investigation" ? "case" : "clear";
    return `<span class="tag tag-${k}">${esc(s)}</span>`;
  },
  rows() {
    return FS.tx
      .map(
        (r) => `<tr${r.selected ? ' class="is-selected" aria-selected="true"' : ""}>
      <td><button class="id" type="button">${r.id}</button><small>${r.acct} · ${r.t} UTC</small></td>
      <td>${esc(r.merchant)}</td>
      <td class="num">${inr(r.amount)}</td>
      <td class="pct"><span class="num">${r.p.toFixed(1)}</span>${FSR.ruler(r.p)}</td>
      <td>${FSR.stateTag(r.state)}</td></tr>`
      )
      .join("");
  },
  cards() {
    return FS.tx
      .map(
        (r) => `<li class="txcard${r.selected ? " is-selected" : ""}">
      <div class="txcard-top"><button class="id" type="button">${r.id}</button><span class="num amt">${inr(r.amount)}</span></div>
      <div class="txcard-mid">${esc(r.merchant)} · ${r.acct}</div>
      <div class="txcard-bot">${FSR.ruler(r.p)}<span class="num">${r.p.toFixed(1)}</span>${FSR.stateTag(r.state)}</div></li>`
      )
      .join("");
  },
  context() {
    const r = FS.run;
    return `<div class="ctx" role="group" aria-label="Analysis context">
      <span class="ctx-name">${r.dataset}<b>${r.chip}</b></span>
      <dl>
        <div><dt>Data period (UTC)</dt><dd>${r.period}</dd></div>
        <div><dt>Rows · currency</dt><dd>${r.rows.toLocaleString("en-IN")} · INR</dd></div>
        <div><dt>Analysed</dt><dd>${r.analysed}</dd></div>
        <div><dt>Run · model</dt><dd>${r.runId} · ${r.model}</dd></div>
      </dl>
      <a href="#" class="ctx-link">Change run</a></div>`;
  },
  tiers() {
    const r = FS.run;
    return `<div class="tiers"><div class="tier-bar" role="img" aria-label="Rows by anomaly percentile band">${r.tiers
      .map((t) => `<i class="tier tier-${t.from}" style="flex:${t.to - t.from}"></i>`)
      .join("")}</div><ul class="tier-list">${r.tiers
      .map((t) => `<li><i class="sw tier-${t.from}"></i><span>${t.label}</span><b class="num">${t.n.toLocaleString("en-IN")}</b></li>`)
      .join("")}</ul></div>`;
  },
  drawer() {
    const d = FS.detail;
    const max = 7;
    return `<div class="dr-head"><div><h2 id="dr-title">${d.id}</h2><p>${d.acct} · ${d.merchant} · ${d.t}</p></div><button class="x" type="button" aria-label="Close details">×</button></div>
    <div class="dr-score"><div><span class="lbl">Anomaly percentile</span><strong class="num">${d.p.toFixed(1)}</strong></div>${FSR.ruler(d.p, "ruler-lg")}
      <p>Percentile against training scores. It ranks how unusual this row is; it is not a fraud probability.</p></div>
    <div class="dr-sec"><h3>Feature deviations</h3>
      <p class="note">Distance from the training median, in IQR. Not SHAP.</p>
      <ul class="dev">${d.deviations
        .map((x) => `<li><span>${x.f}<small>${x.v}</small></span><span class="devbar"><i style="width:${Math.min(100, (x.d / max) * 100)}%"></i></span><b class="num">${x.d.toFixed(1)}</b></li>`)
        .join("")}</ul></div>
    <div class="dr-sec"><h3>Linked accounts</h3>
      <p>${d.device} is also used by ${d.shared.join(" and ")}. Shared device only; no other link is known.</p></div>
    <div class="dr-act"><button class="btn-primary" type="button">Create investigation</button><a class="btn-sec" href="#">Open linked accounts</a></div>`;
  },
};
