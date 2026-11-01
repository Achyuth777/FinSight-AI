// Demo content for the landing page. Every value comes from the built-in synthetic sample
// (1,200 rows, Isolation Forest, 100 trees) as the workspace shows it. Nothing here is customer data.
export const demoRows = [
  { id: "TXN-10513", account: "ACC-035", at: "2026-10-03 20:16 UTC", merchant: "Northstar Retail", amount: "₹10,023.97", percentile: 100, tag: "flag" },
  { id: "TXN-11116", account: "ACC-073", at: "2026-10-07 04:40 UTC", merchant: "Northstar Retail", amount: "₹661.47", percentile: 100, tag: "flag" },
  { id: "TXN-10812", account: "ACC-026", at: "2026-10-05 12:08 UTC", merchant: "Metro Mobility", amount: "₹10,998.35", percentile: 99.9, tag: "flag" },
  { id: "TXN-10903", account: "ACC-002", at: "2026-10-06 00:16 UTC", merchant: "Metro Mobility", amount: "₹13,545.33", percentile: 99.9, tag: "flag" },
  { id: "TXN-10018", account: "ACC-038", at: "2026-10-01 02:16 UTC", merchant: "Atlas Travel", amount: "₹3,797.59", percentile: 99.8, tag: "flag" },
] as const;

// Feature deviations for TXN-10513, in IQR units from the training median (descriptive, not model attribution).
export const reasons = [
  { name: "velocity 1h", value: "14 in the hour", dev: "+6.0 IQR" },
  { name: "distance", value: "1,160 km", dev: "+3.1 IQR" },
  { name: "account age", value: "11 days", dev: "+2.9 IQR" },
] as const;

export const metrics = [
  { label: "ROC-AUC", value: "99.9%" },
  { label: "Average precision", value: "99.0%" },
  { label: "Precision", value: "93.8%" },
  { label: "Recall", value: "88.2%" },
] as const;

export const confusion = [
  { label: "True negatives", value: "342" },
  { label: "False positives", value: "1" },
  { label: "False negatives", value: "2" },
  { label: "True positives", value: "15" },
] as const;

export const searchResults = [
  { n: 1, id: "TXN-10513", detail: "ACC-035 · Northstar Retail", amount: "₹10,023.97", percentile: "100.0" },
  { n: 2, id: "TXN-11155", detail: "ACC-035 · Nexus Electronics", amount: "₹3,973.92", percentile: "73.7" },
  { n: 3, id: "TXN-10699", detail: "ACC-035 · Harbor Market", amount: "₹2,059.07", percentile: "61.5" },
] as const;

export const steps = [
  { title: "Detect unusual behavior", body: "An Isolation Forest ranks every row against the training window. The queue opens with the highest anomaly percentiles.", benefit: "Start with the rows most worth a look." },
  { title: "Inspect the context", body: "See which features sit far from the training median, in IQR units, beside the account's earlier transactions.", benefit: "Know why a row stands out before you act." },
  { title: "Connect the evidence", body: "Accounts that used the same device identifier are linked. A link means shared use. It does not prove fraud.", benefit: "See who else touched the same device." },
  { title: "Document the investigation", body: "Open an investigation, write notes and set a status: open, reviewing, cleared or escalated. Each change is stored with its UTC time.", benefit: "Leave a trail someone else can follow." },
] as const;

export const workspaceLinks = [
  { href: "/app/overview", label: "Overview" },
  { href: "/app/transactions", label: "Transactions" },
  { href: "/app/investigations", label: "Investigations" },
  { href: "/app/network", label: "Linked accounts" },
  { href: "/app/laboratory", label: "Experiments" },
  { href: "/app/monitoring", label: "Data checks" },
  { href: "/app/assistant", label: "Evidence search" },
] as const;
