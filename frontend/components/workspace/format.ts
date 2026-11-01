// Shared formatters. Amounts are INR; timestamps are shown in UTC.
export const money = (n: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
export const label = (s: string) => s.replaceAll("_", " ");
export const featureLabel = (s: string) =>
  ["amount", "account_age_days", "distance_km"].includes(s)
    ? "log1p " + label(s)
    : s === "hour"
      ? "UTC hour"
      : label(s);
export const pct = (n?: number) =>
  n == null ? "Unavailable" : (n * 100).toFixed(1) + "%";
// "2026-11-01 14:05 UTC" from an ISO timestamp; never relative.
export const utc = (iso: string) =>
  iso.slice(0, 10) + " " + iso.slice(11, 16) + " UTC";
