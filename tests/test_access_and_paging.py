import os
import tempfile
os.environ.setdefault('DATABASE_URL','sqlite:///'+os.path.join(tempfile.mkdtemp(),'access.db'))
from fastapi.testclient import TestClient
from backend.main import app

client=TestClient(app)
KEY='k'*32

def test_api_refuses_without_key_unless_dev_switch(monkeypatch):
    monkeypatch.delenv('FINSIGHT_API_KEY',raising=False)
    monkeypatch.delenv('FINSIGHT_INSECURE_DEV',raising=False)
    assert client.get('/api/datasets').status_code==503  # no key and no deliberate bypass
    assert client.get('/api/health').status_code==200      # health stays open
    monkeypatch.setenv('FINSIGHT_INSECURE_DEV','1')
    assert client.get('/api/datasets').status_code==200

def test_api_key_is_checked_when_configured(monkeypatch):
    monkeypatch.setenv('FINSIGHT_API_KEY',KEY)
    monkeypatch.delenv('FINSIGHT_INSECURE_DEV',raising=False)
    assert client.get('/api/datasets').status_code==401
    assert client.get('/api/datasets',headers={'x-finsight-api-key':'x'*32}).status_code==401
    assert client.get('/api/datasets',headers={'x-finsight-api-key':KEY}).status_code==200
    monkeypatch.setenv('FINSIGHT_API_KEY','short')
    assert client.get('/api/datasets',headers={'x-finsight-api-key':'short'}).status_code==503  # too-short key is a misconfiguration

def _run():
    d=client.post('/api/datasets/demo').json()
    return client.post('/api/runs',json={'dataset_id':d['id'],'trees':50}).json()

def test_run_summary_omits_transactions():
    r=_run()
    s=client.get('/api/runs/'+r['id'],params={'transactions':'false'}).json()
    assert 'transactions' not in s and s['transaction_count']==len(r['transactions'])
    assert s['flagged_count']==sum(1 for t in r['transactions'] if t['flagged'])

def test_transactions_page_matches_client_rules():
    r=_run();rows=r['transactions']
    page=client.get(f"/api/runs/{r['id']}/transactions",params={'limit':25}).json()
    assert page['total']==len(rows) and len(page['items'])==25
    scores=[t['risk_score'] for t in page['items']]
    assert scores==sorted(scores,reverse=True)
    nxt=client.get(f"/api/runs/{r['id']}/transactions",params={'limit':25,'offset':25}).json()
    assert {t['transaction_id'] for t in nxt['items']}.isdisjoint(t['transaction_id'] for t in page['items'])
    flagged=client.get(f"/api/runs/{r['id']}/transactions",params={'risk':'flagged','limit':200}).json()
    assert flagged['total']==sum(1 for t in rows if t['flagged']) and all(t['flagged'] for t in flagged['items'])
    assert flagged['flag_floor']==min(t['risk_score'] for t in rows if t['flagged'])
    big=client.get(f"/api/runs/{r['id']}/transactions",params={'sort':'amount','min_amount':5000,'limit':200}).json()
    assert all(t['amount']>=5000 for t in big['items'])
    amounts=[t['amount'] for t in big['items']];assert amounts==sorted(amounts,reverse=True)
    one=rows[3]
    hit=client.get(f"/api/runs/{r['id']}/transactions",params={'q':one['account_id'].lower()}).json()
    assert hit['total']>=1 and any(t['transaction_id']==one['transaction_id'] for t in hit['items'])
    held=client.get(f"/api/runs/{r['id']}/transactions",params={'split':'test','limit':200}).json()
    assert held['total']==sum(1 for t in rows if t['split']=='test')
    threshold=client.get(f"/api/runs/{r['id']}/transactions",params={'min_risk':80,'limit':200}).json()
    assert threshold['total']==sum(1 for t in rows if t['risk_score']>=80)
    assert all(t['risk_score']>=80 for t in threshold['items'])

def test_transactions_page_rejects_bad_parameters():
    r=_run()
    base=f"/api/runs/{r['id']}/transactions"
    assert client.get(base,params={'limit':0}).status_code==422
    assert client.get(base,params={'limit':500}).status_code==422
    assert client.get(base,params={'sort':'nope'}).status_code==422
    assert client.get(base,params={'min_amount':-1}).status_code==422
    assert client.get(base,params={'min_risk':-1}).status_code==422
    assert client.get(base,params={'min_risk':101}).status_code==422
    assert client.get('/api/runs/missing/transactions').status_code==404
