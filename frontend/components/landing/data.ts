// Demo content for the landing page. Every value comes from the built-in synthetic sample
// (1,200 rows, Isolation Forest, 100 trees) as the workspace shows it. Nothing here is customer data.

// The top of the queue, sorted by anomaly percentile (highest first), as the Transactions screen lists it.
export const queue = [
  { id: "TXN-10513", account: "ACC-035", merchant: "Northstar Retail", amount: "₹10,023.97", percentile: 100 },
  { id: "TXN-11116", account: "ACC-073", merchant: "Northstar Retail", amount: "₹661.47", percentile: 100 },
  { id: "TXN-10812", account: "ACC-026", merchant: "Metro Mobility", amount: "₹10,998.35", percentile: 99.9 },
  { id: "TXN-10903", account: "ACC-002", merchant: "Metro Mobility", amount: "₹13,545.33", percentile: 99.9 },
  { id: "TXN-10018", account: "ACC-038", merchant: "Atlas Travel", amount: "₹3,797.59", percentile: 99.8 },
  { id: "TXN-10741", account: "ACC-031", merchant: "Nexus Electronics", amount: "₹4,945.08", percentile: 99.6 },
  { id: "TXN-10150", account: "ACC-010", merchant: "Atlas Travel", amount: "₹8,851.86", percentile: 99.5 },
  { id: "TXN-10535", account: "ACC-040", merchant: "Atlas Travel", amount: "₹1,467.74", percentile: 99.4 },
] as const;

// Feature deviations for TXN-10513, in IQR units from the training median (descriptive, not model attribution).
export const reasons = [
  { name: "velocity 1h", value: "14 in the hour", dev: "+6.0 IQR", w: 100 },
  { name: "distance", value: "1,160 km", dev: "+3.1 IQR", w: 52 },
  { name: "account age", value: "11 days", dev: "+2.9 IQR", w: 48 },
] as const;

export const metrics = [
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

// Four stages of the product scene. `short` is the rail label, `body` the one-line caption.
export const steps = [
  { short: "Rank the queue", body: "An Isolation Forest ranks every row. The queue opens on the highest percentiles." },
  { short: "Inspect the context", body: "See which features sit far from the training median, in IQR units." },
  { short: "Connect the evidence", body: "Accounts that share a device are linked. A link is a lead, not proof of fraud." },
  { short: "Document the case", body: "Open an investigation, add notes, set a status. Each change is stored with its UTC time." },
] as const;

// Devices used by more than one account in the sample, with each account's transaction count.
export const sharedDevices = [
  { device: "DEV-035", accounts: [{ id: "ACC-035", n: 9 }, { id: "ACC-077", n: 9 }] },
  { device: "DEV-031", accounts: [{ id: "ACC-073", n: 16 }, { id: "ACC-031", n: 16 }] },
  { device: "DEV-002", accounts: [{ id: "ACC-002", n: 14 }, { id: "ACC-086", n: 18 }, { id: "ACC-044", n: 9 }] },
  { device: "DEV-001", accounts: [{ id: "ACC-085", n: 19 }, { id: "ACC-001", n: 16 }, { id: "ACC-043", n: 5 }] },
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
