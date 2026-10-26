import os
import tempfile
os.environ['DATABASE_URL']='sqlite:///'+tempfile.mktemp(suffix='.db')
from fastapi.testclient import TestClient
from backend.main import app
from execution.pipeline import demo_data
client=TestClient(app)

def test_full_investigation_workflow():
    assert client.get('/api/health').status_code==200
    d=client.post('/api/datasets/demo').json()
    assert client.post('/api/datasets/demo').json()['id']==d['id']
    r=client.post('/api/runs',json={'dataset_id':d['id'],'trees':50})
    assert r.status_code==200
    r=r.json();tx=r['transactions'][0]
    c=client.post('/api/cases',json={'run_id':r['id'],'transaction_id':tx['transaction_id']}).json()
    assert client.post('/api/cases',json={'run_id':r['id'],'transaction_id':tx['transaction_id']}).json()['id']==c['id']
    updated=client.patch('/api/cases/'+c['id'],json={'note':'Checked source evidence','status':'reviewing'}).json()
    assert len(updated['events'])==3 and updated['status']=='reviewing'
    assert client.get('/api/cases').json()[0]['events'][-1]['text']=='Checked source evidence'
    assert client.get('/api/runs/'+r['id']).json()['id']==r['id']
    assert client.post('/api/research',json={'run_id':r['id'],'query':tx['transaction_id']}).json()['sources'][0]['transaction_id']==tx['transaction_id']
    assert client.patch('/api/cases/'+c['id'],json={'status':'fraud'}).status_code==422
    assert client.get('/api/runs/missing').status_code==404

def test_import_atomic_validation():
    before=len(client.get('/api/datasets').json())
    assert client.post('/api/datasets/upload',files={'file':('bad.csv',b'a,b\n1,2')}).status_code==422
    assert len(client.get('/api/datasets').json())==before
    raw=demo_data(120).to_csv(index=False).encode()
    res=client.post('/api/datasets/upload',files={'file':('valid.csv',raw)})
    assert res.status_code==200 and res.json()['source']=='uploaded'
    assert client.post('/api/runs',json={'dataset_id':res.json()['id'],'contamination':.9}).status_code==422
