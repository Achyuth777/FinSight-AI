import numpy as np
import pytest
from execution.pipeline import demo_data,validate_csv,train,feature_matrix

def frame():return validate_csv(demo_data(300).to_csv(index=False).encode())
def test_deterministic_and_temporal():
    a=train(frame(),trees=50);b=train(frame(),trees=50)
    assert [t['anomaly_score'] for t in a['transactions']]==[t['anomaly_score'] for t in b['transactions']]
    assert a['train_count']==210 and a['test_count']==90
    assert all(0<=t['risk_score']<=100 for t in a['transactions'])
    assert a['metrics']['available']
    assert len(a['drift'])==5

def test_no_label_or_identifier_features():
    x=feature_matrix(frame())
    assert 'is_fraud' not in x and 'account_id' not in x
    assert np.isfinite(x).all().all()

@pytest.mark.parametrize('fault',['missing','duplicate','negative','infinite','bad_date','bad_label','empty_id','few'])
def test_reject_invalid(fault):
    f=demo_data(120)
    if fault=='missing':f=f.drop(columns='amount')
    if fault=='duplicate':f.loc[1,'transaction_id']=f.loc[0,'transaction_id']
    if fault=='negative':f.loc[0,'amount']=-1
    if fault=='infinite':f.loc[0,'amount']=float('inf')
    if fault=='bad_date':f.loc[0,'timestamp']='not-a-date'
    if fault=='bad_label':f.loc[0,'is_fraud']=2
    if fault=='empty_id':f.loc[0,'account_id']=' '
    if fault=='few':f=f.head(10)
    with pytest.raises(ValueError):validate_csv(f.to_csv(index=False).encode())

def test_unlabeled_evaluation_is_unavailable():
    r=train(frame().drop(columns='is_fraud'),trees=50)
    assert not r['metrics']['available']

def test_future_data_does_not_change_training_fit():
    f=frame();a=train(f,trees=50);f.loc[250:,'amount']=1e10;b=train(f,trees=50)
    assert [t['anomaly_score'] for t in a['transactions'][:210]]==[t['anomaly_score'] for t in b['transactions'][:210]]

def test_supervised_shap():
    r=train(frame(),trees=50,supervised=True)
    assert r['comparison']['metrics']['available']
    assert len(r['comparison']['shap_mean_abs'])==5
    assert not r['comparison']['calibrated']

def test_equal_timestamps_do_not_split():
    f=frame();f['timestamp']='2026-10-01T00:00:00Z'
    with pytest.raises(ValueError):train(f,trees=50)

def test_constant_feature_drift_is_not_reported_stable():
    f=frame();f['velocity_1h']=2
    r=train(f,trees=50)
    d=next(d for d in r['drift'] if d['feature']=='velocity_1h')
    assert d['psi'] is None and d['status']=='unavailable'

def test_duplicate_csv_column_headers_are_rejected_before_dataframe_parsing():
    csv_text = demo_data(120).to_csv(index=False)
    lines = csv_text.splitlines()
    headers = lines[0].split(',')
    headers[headers.index('amount')] = 'transaction_id'
    lines[0] = ','.join(headers)

    with pytest.raises(ValueError, match='Duplicate CSV column names'):
        validate_csv(('\n'.join(lines)).encode('utf-8'))
