import os
import tempfile
os.environ.setdefault('DATABASE_URL','sqlite:///'+os.path.join(tempfile.mkdtemp(),'test.db'))
from concurrent.futures import ThreadPoolExecutor
from fastapi.testclient import TestClient
from backend.main import app
from execution.pipeline import demo_data, validate_csv
import pytest
client=TestClient(app)

def _run():
    d=client.post('/api/datasets/demo').json()
    return client.post('/api/runs',json={'dataset_id':d['id'],'trees':50}).json()

def test_oversize_upload_rejected():
    big=b'x'*5_000_100
    assert client.post('/api/datasets/upload',files={'file':('big.csv',big)}).status_code==413

def test_whitespace_duplicate_ids_rejected():
    df=demo_data(120)
    df.loc[1,'transaction_id']=' '+str(df.loc[0,'transaction_id'])
    with pytest.raises(ValueError,match='Duplicate'):
        validate_csv(df.to_csv(index=False).encode())

def test_supervised_requires_labels():
    df=demo_data(120)
    raw=df.drop(columns=[c for c in ['is_fraud'] if c in df]).to_csv(index=False).encode()
    d=client.post('/api/datasets/upload',files={'file':('nolabels.csv',raw)}).json()
    assert client.post('/api/runs',json={'dataset_id':d['id'],'supervised':True}).status_code==422

def test_wrong_kind_and_missing_ids_404():
    r=_run()
    assert client.get('/api/cases/'+r['id']).status_code in (404,405)
    assert client.patch('/api/cases/'+r['id'],json={'note':'x'}).status_code==404
    assert client.post('/api/cases',json={'run_id':r['id'],'transaction_id':'nope'}).status_code==404
    assert client.post('/api/research',json={'run_id':'missing','query':'abc'}).status_code==404

def test_runs_list_omits_transactions():
    _run()
    assert all('transactions' not in x for x in client.get('/api/runs').json())

def test_research_reports_total_beyond_cap():
    r=_run()
    flagged=sum(1 for t in r['transactions'] if t['flagged'])
    out=client.post('/api/research',json={'run_id':r['id'],'query':'flagged'}).json()
    assert len(out['sources'])==min(6,flagged)
    if flagged: assert f'Found {flagged} ' in out['answer']

def test_untrusted_host_rejected():
    assert client.get('/api/health',headers={'host':'evil.example'}).status_code==400

def test_concurrent_notes_and_case_creation_are_not_lost():
    r=_run();tid=r['transactions'][0]['transaction_id']
    body={'run_id':r['id'],'transaction_id':tid}
    with ThreadPoolExecutor(8) as ex:
        ids={x.json()['id'] for x in ex.map(lambda _:client.post('/api/cases',json=body),range(8))}
    assert len(ids)==1
    cid=ids.pop()
    with ThreadPoolExecutor(8) as ex:
        list(ex.map(lambda i:client.patch('/api/cases/'+cid,json={'note':f'n{i}'}),range(8)))
    events=[c for c in client.get('/api/cases').json() if c['id']==cid][0]['events']
    assert sum(e['type']=='note' for e in events)==8

def test_dataset_reports_whether_labels_exist():
    labeled=client.post('/api/datasets/demo').json()
    assert labeled['labeled'] is True
    csv=demo_data(120).drop(columns=['is_fraud']).to_csv(index=False).encode()
    plain=client.post('/api/datasets/upload',files={'file':('plain.csv',csv)}).json()
    assert plain['labeled'] is False and 'rows' not in plain
    listed={d['id']:d['labeled'] for d in client.get('/api/datasets').json()}
    assert listed[labeled['id']] is True and listed[plain['id']] is False
