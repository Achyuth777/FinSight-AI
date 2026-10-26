export type Tx = {
  transaction_id: string;
  timestamp: string;
  account_id: string;
  device_id: string;
  merchant: string;
  amount: number;
  velocity_1h: number;
  account_age_days: number;
  distance_km: number;
  risk_score: number;
  anomaly_score: number;
  flagged: boolean;
  split: string;
  reasons: { feature: string; value: number; deviation_iqr: number }[];
};
export type Metrics = {
  available: boolean;
  reason?: string;
  roc_auc?: number;
  average_precision?: number;
  precision?: number;
  recall?: number;
  confusion_matrix?: number[][];
};
export type Run = {
  id: string;
  dataset_id: string;
  dataset_name: string;
  source: string;
  created_at: string;
  transactions: Tx[];
  metrics: Metrics;
  comparison: null | {
    name: string;
    calibrated: boolean;
    metrics: Metrics;
    shap_mean_abs: { feature: string; value: number }[];
    explanation: string;
  };
  drift: { feature: string; psi: number | null; status: string }[];
  train_count: number;
  test_count: number;
  contamination: number;
  trees: number;
  threshold: number;
  inference_ms: number;
  duration_ms: number;
  feature_names: string[];
};
export type Dataset = {
  id: string;
  name: string;
  source: string;
  row_count: number;
};
export type Case = {
  id: string;
  run_id: string;
  transaction_id: string;
  source: string;
  transaction: Tx;
  status: string;
  created_at: string;
  events: { at: string; type: string; text: string }[];
};
export async function api<T>(path: string, options?: RequestInit): Promise<T> {
  const r = await fetch("/api" + path, {
    ...options,
    headers:
      options?.body instanceof FormData
        ? undefined
        : { "Content-Type": "application/json", ...options?.headers },
  });
  if (!r.ok) {
    const b = await r.json().catch(() => ({ detail: "Backend unavailable" }));
    throw new Error(
      typeof b.detail === "string" ? b.detail : JSON.stringify(b.detail),
    );
  }
  return r.json();
}
