"""Deterministic validation, generation and ML. No network calls or LLM decisions."""
import io
import time
import numpy as np
import pandas as pd
from sklearn.ensemble import IsolationForest
from sklearn.metrics import average_precision_score, roc_auc_score, precision_score, recall_score, confusion_matrix

FEATURES = ['amount', 'hour', 'velocity_1h', 'account_age_days', 'distance_km']
REQUIRED = ['transaction_id', 'timestamp', 'account_id', 'device_id', 'merchant', 'amount', 'velocity_1h', 'account_age_days', 'distance_km']


def demo_data(n=1200):
    rng = np.random.default_rng(42)
    fraud = rng.random(n) < .07
    amounts = rng.lognormal(6.5, .8, n)
    velocity = rng.poisson(2, n)
    ages = rng.integers(15, 1600, n)
    distance = rng.exponential(16, n)
    amounts[fraud] *= rng.uniform(2, 12, fraud.sum())
    velocity[fraud] += rng.integers(4, 20, fraud.sum())
    ages[fraud] = rng.integers(1, 70, fraud.sum())
    distance[fraud] += rng.uniform(80, 1400, fraud.sum())
    accounts = rng.integers(1, 91, n)
    frame = pd.DataFrame({
        'transaction_id': [f'TXN-{i+10001}' for i in range(n)],
        'timestamp': pd.date_range('2026-10-01', periods=n, freq='8min', tz='UTC').astype(str),
        'account_id': [f'ACC-{i:03}' for i in accounts],
        'device_id': [f'DEV-{i%42:03}' for i in accounts],
        'merchant': rng.choice(['Northstar Retail', 'Metro Mobility', 'Cloudline Digital', 'Harbor Market', 'Atlas Travel', 'Nexus Electronics'], n),
        'amount': amounts.round(2), 'velocity_1h': velocity, 'account_age_days': ages,
        'distance_km': distance.round(2), 'is_fraud': fraud.astype(int)})
    return frame


def validate_csv(raw: bytes):
    if len(raw) > 5_000_000:
        raise ValueError('CSV exceeds 5 MB limit.')
    try:
        frame = pd.read_csv(io.BytesIO(raw), dtype={'transaction_id': str, 'account_id': str, 'device_id': str})
    except Exception as e:
        raise ValueError('Unable to parse UTF-8 CSV.') from e
    missing = sorted(set(REQUIRED) - set(frame.columns))
    if missing:
        raise ValueError('Missing columns: ' + ', '.join(missing))
    if not 100 <= len(frame) <= 20000:
        raise ValueError('Provide 100–20,000 transactions for a chronological train/test split.')
    if frame[REQUIRED].isna().any().any():
        raise ValueError('Required columns contain missing values.')
    if frame.transaction_id.duplicated().any():
        raise ValueError('Duplicate transaction_id values. Import rejected atomically.')
    for c in ['transaction_id', 'account_id', 'device_id', 'merchant']:
        frame[c] = frame[c].astype(str).str.strip()
        if frame[c].eq('').any() or frame[c].str.len().gt(160).any():
            raise ValueError(f'{c}: values must contain 1–160 characters.')
    for c in ['amount', 'velocity_1h', 'account_age_days', 'distance_km']:
        frame[c] = pd.to_numeric(frame[c], errors='coerce')
        if not np.isfinite(frame[c]).all() or (frame[c] < 0).any() or (frame[c] > 1e12).any():
            raise ValueError(f'{c}: finite numbers between 0 and 1e12 required.')
    ts = pd.to_datetime(frame.timestamp, utc=True, errors='coerce')
    if ts.isna().any():
        raise ValueError('timestamp must contain valid ISO dates.')
    frame['timestamp'] = ts.dt.strftime('%Y-%m-%dT%H:%M:%SZ')
    if 'is_fraud' in frame:
        if not frame.is_fraud.isin([0, 1]).all():
            raise ValueError('Optional is_fraud must be 0 or 1 for every row.')
    return frame[REQUIRED + (['is_fraud'] if 'is_fraud' in frame else [])].sort_values('timestamp', kind='stable').reset_index(drop=True)


def feature_matrix(frame):
    x = frame.copy()
    x['hour'] = pd.to_datetime(x.timestamp, utc=True).dt.hour
    x = x[FEATURES].astype(float)
    x['amount'] = np.log1p(x.amount)
    x['distance_km'] = np.log1p(x.distance_km)
    x['account_age_days'] = np.log1p(x.account_age_days)
    return x


def evaluate(y, score, predicted):
    if y is None or len(np.unique(y)) < 2:
        return {'available': False, 'reason': 'Held-out labels with both classes are required.'}
    return {'available': True, 'roc_auc': float(roc_auc_score(y, score)),
            'average_precision': float(average_precision_score(y, score)),
            'precision': float(precision_score(y, predicted, zero_division=0)),
            'recall': float(recall_score(y, predicted, zero_division=0)),
            'confusion_matrix': confusion_matrix(y, predicted, labels=[0,1]).tolist()}


def train(frame, contamination=.07, trees=150, supervised=False):
    started = time.perf_counter()
    frame = frame.sort_values('timestamp', kind='stable').reset_index(drop=True)
    x = feature_matrix(frame)
    split = int(len(frame)*.7)
    # Split only on distinct timestamps, never distribute equal-time rows across train/test.
    boundary = frame.timestamp.iloc[split]
    split = int((frame.timestamp < boundary).sum())
    if split < 50 or len(frame)-split < 20:
        raise ValueError('Need at least 50 earlier training rows and 20 later test rows with distinct timestamps.')
    model = IsolationForest(n_estimators=trees, contamination=contamination, random_state=42, n_jobs=1)
    model.fit(x.iloc[:split])
    tick = time.perf_counter()
    raw = -model.score_samples(x)
    inference_ms = (time.perf_counter()-tick)*1000
    reference = np.sort(raw[:split])
    percentile = np.searchsorted(reference, raw, side='right')/split*100
    predicted = model.predict(x) == -1
    threshold = float(-model.offset_)
    rows = frame.to_dict('records')
    median = x.iloc[:split].median()
    scale = (x.iloc[:split].quantile(.75)-x.iloc[:split].quantile(.25)).replace(0,1)
    for i, row in enumerate(rows):
        deviations = ((x.iloc[i]-median)/scale).abs().sort_values(ascending=False)
        row.update(anomaly_score=round(float(raw[i]),6), risk_score=round(float(percentile[i]),1), flagged=bool(predicted[i]),
                   split='train' if i<split else 'test',
                   reasons=[{'feature': k, 'deviation_iqr': round(float(v),2), 'value': float(x.iloc[i][k])} for k,v in deviations.head(3).items()])
    y = frame.is_fraud.iloc[split:].to_numpy() if 'is_fraud' in frame else None
    metrics = evaluate(y, raw[split:], predicted[split:])
    drift = []
    for c in FEATURES:
        edges = np.unique(np.quantile(x[c].iloc[:split], np.linspace(0,1,11)))
        if len(edges)<2:
            drift.append({'feature':c,'psi':None,'status':'unavailable','reason':'Constant training feature; quantile PSI is uninformative.'})
            continue
        edges[0], edges[-1] = -np.inf, np.inf
        if len(edges)<2: edges=np.array([-np.inf,np.inf])
        a = np.histogram(x[c].iloc[:split],edges)[0]/split
        b = np.histogram(x[c].iloc[split:],edges)[0]/(len(x)-split)
        a,b = np.clip(a,.0001,None),np.clip(b,.0001,None)
        psi = float(np.sum((b-a)*np.log(b/a)))
        drift.append({'feature':c, 'psi':round(psi,4), 'status':'review' if psi>.2 else 'stable'})
    comparison = None
    if supervised:
        if 'is_fraud' not in frame or frame.is_fraud.iloc[:split].nunique()<2:
            raise ValueError('Supervised experiment requires both label classes in training data.')
        from xgboost import XGBClassifier
        import shap
        classifier = XGBClassifier(n_estimators=80,max_depth=3,learning_rate=.08,random_state=42,n_jobs=1,eval_metric='logloss')
        classifier.fit(x.iloc[:split],frame.is_fraud.iloc[:split])
        probability = classifier.predict_proba(x.iloc[split:])[:,1]
        explanation = shap.TreeExplainer(classifier)(x.iloc[split:])
        comparison = {'name':'XGBoost', 'calibrated':False, 'metrics':evaluate(y,probability,probability>=.5),
                      'shap_mean_abs':[{'feature': c, 'value':float(v)} for c,v in zip(FEATURES,np.abs(explanation.values).mean(axis=0))],
                      'explanation':'Mean absolute SHAP on held-out rows; contributions are in raw model margin, not probability.'}
    return {'transactions':rows, 'metrics':metrics, 'comparison':comparison, 'drift':drift,
            'train_count':split,'test_count':len(frame)-split,'threshold':threshold,
            'contamination':contamination,'trees':trees,'inference_ms':round(inference_ms,2),
            'duration_ms':round((time.perf_counter()-started)*1000,2), 'feature_names':FEATURES,
            'explanation_method':'Robust feature deviations from training medians; descriptive context, not causal or SHAP attribution.'}
