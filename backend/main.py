import os
import uuid
import json
import hmac
from datetime import datetime, timezone
from typing import Literal
from fastapi import FastAPI, HTTPException, UploadFile, File, Request
from fastapi.responses import Response, JSONResponse
from pydantic import BaseModel, Field
from sqlalchemy import create_engine, String, Text, select
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, Session
import pandas as pd
from execution.pipeline import demo_data, validate_csv, train

class Base(DeclarativeBase): pass
class Record(Base):
    __tablename__ = 'records'
    id: Mapped[str] = mapped_column(String(40), primary_key=True)
    kind: Mapped[str] = mapped_column(String(20), index=True)
    created: Mapped[str] = mapped_column(String(40))
    payload: Mapped[str] = mapped_column(Text)

url = os.getenv('DATABASE_URL','sqlite:///./finsight.db')
engine = create_engine(url, connect_args={'check_same_thread': False} if url.startswith('sqlite') else {}, pool_pre_ping=True)
Base.metadata.create_all(engine)
app = FastAPI(title='FinSight AI',version='0.1.1',description='Single-analyst research environment; private API access required on Render.',docs_url=None if os.getenv('RENDER') == 'true' else '/docs',redoc_url=None if os.getenv('RENDER') == 'true' else '/redoc',openapi_url=None if os.getenv('RENDER') == 'true' else '/openapi.json')

@app.middleware('http')
async def private_api(request: Request, call_next):
    if not request.url.path.startswith('/api/') or request.url.path == '/api/health':
        return await call_next(request)
    expected = os.getenv('FINSIGHT_API_KEY', '')
    # Never serve protected API operations without a key on Render.
    if not expected and os.getenv('RENDER') != 'true':
        return await call_next(request)  # Local developer quick-start only.
    if len(expected) < 32:
        return JSONResponse({'detail': 'Backend access is not configured'}, status_code=503)
    supplied = request.headers.get('x-finsight-api-key', '')
    if not supplied or not hmac.compare_digest(supplied, expected):
        return JSONResponse({'detail': 'Unauthorized'}, status_code=401)
    return await call_next(request)


def now(): return datetime.now(timezone.utc).isoformat()
def save(kind, data, id=None):
    id = id or str(uuid.uuid4())
    with Session(engine) as s:
        row = s.get(Record,id)
        if row: row.payload=json.dumps(data)
        else: s.add(Record(id=id,kind=kind,created=now(),payload=json.dumps(data)))
        s.commit()
    return {'id':id,**data}
def get(id,kind):
    with Session(engine) as s:
        r=s.get(Record,id)
        if not r or r.kind!=kind: raise HTTPException(404,'Record not found')
        return {'id':r.id,**json.loads(r.payload)}
def records(kind):
    with Session(engine) as s:
        return [{'id':r.id,**json.loads(r.payload)} for r in s.scalars(select(Record).where(Record.kind==kind).order_by(Record.created.desc()))]

@app.get('/api/health')
def health(): return {'status':'ok','mode':'local-single-analyst','database':'postgresql' if url.startswith('postgres') else 'sqlite'}
@app.get('/api/template')
def template(): return Response(demo_data(120).to_csv(index=False),media_type='text/csv',headers={'Content-Disposition':'attachment; filename=synthetic-template.csv'})
@app.get('/api/datasets')
def datasets(): return [{k:v for k,v in d.items() if k!='rows'} for d in records('dataset')]
@app.post('/api/datasets/demo')
def demo():
    prior=[d for d in records('dataset') if d.get('source')=='synthetic']
    if prior: return {k:v for k,v in prior[0].items() if k!='rows'}
    f=validate_csv(demo_data().to_csv(index=False).encode())
    d=save('dataset',{'name':'Synthetic payment sandbox','source':'synthetic','currency':'INR','created_at':now(),'row_count':len(f),'rows':f.to_dict('records')})
    return {k:v for k,v in d.items() if k!='rows'}
@app.post('/api/datasets/upload')
async def upload(file:UploadFile=File(...)):
    raw=await file.read(5_000_001)
    try: f=validate_csv(raw)
    except ValueError as e: raise HTTPException(422,str(e))
    d=save('dataset',{'name':(file.filename or 'upload.csv')[:160],'source':'uploaded','currency':'INR','created_at':now(),'row_count':len(f),'rows':f.to_dict('records')})
    return {k:v for k,v in d.items() if k!='rows'}
class Experiment(BaseModel):
    dataset_id:str
    contamination:float=Field(.07,ge=.01,le=.2)
    trees:int=Field(150,ge=50,le=300)
    supervised:bool=False
@app.post('/api/runs')
def run(body:Experiment):
    dataset=get(body.dataset_id,'dataset')
    try: result=train(pd.DataFrame(dataset['rows']),body.contamination,body.trees,body.supervised)
    except ValueError as e: raise HTTPException(422,str(e))
    return save('run',{'dataset_id':body.dataset_id,'dataset_name':dataset['name'],'source':dataset['source'],'created_at':now(),**result})
@app.get('/api/runs')
def runs(): return [{k:v for k,v in d.items() if k not in ['transactions']} for d in records('run')]
@app.get('/api/runs/{id}')
def read_run(id:str): return get(id,'run')
class CaseCreate(BaseModel):
    run_id:str
    transaction_id:str
@app.post('/api/cases')
def create_case(body:CaseCreate):
    run=get(body.run_id,'run')
    tx=next((t for t in run['transactions'] if t['transaction_id']==body.transaction_id),None)
    if not tx: raise HTTPException(404,'Transaction not found in this run')
    existing=next((c for c in records('case') if c['run_id']==body.run_id and c['transaction_id']==body.transaction_id),None)
    if existing:return existing
    return save('case',{'run_id':body.run_id,'transaction_id':body.transaction_id,'source':run['source'],'transaction':tx,'status':'open','created_at':now(),'events':[{'at':now(),'type':'created','text':'Investigation opened; anomaly is not evidence of confirmed fraud.'}]})
@app.get('/api/cases')
def cases():return records('case')
class CaseUpdate(BaseModel):
    status:Literal['open','reviewing','cleared','escalated']|None=None
    note:str=Field('',max_length=4000)
@app.patch('/api/cases/{id}')
def update_case(id:str,body:CaseUpdate):
    c=get(id,'case')
    if body.status and body.status!=c['status']:
        c['events'].append({'at':now(),'type':'decision','text':f"Status: {c['status']} → {body.status}"})
        c['status']=body.status
    if body.note.strip():c['events'].append({'at':now(),'type':'note','text':body.note.strip()})
    c.pop('id')
    return save('case',c,id)
class Query(BaseModel):
    run_id:str
    query:str=Field(min_length=2,max_length=300)
@app.post('/api/research')
def research(body:Query):
    run=get(body.run_id,'run')
    terms=body.query.lower().split()
    tx=run['transactions']
    matched=[t for t in tx if any(term in f"{t['transaction_id']} {t['account_id']} {t['device_id']} {t['merchant']}".lower() for term in terms)]
    if any(w in terms for w in ['risk','flagged','high','anomaly']):matched=[t for t in tx if t['flagged']]
    matched=sorted(matched,key=lambda t:t['risk_score'],reverse=True)[:6]
    return {'mode':'deterministic-evidence-retrieval','answer': f"Found {len(matched)} matching evidence records (maximum 6 shown). Scores express anomaly rank, not fraud probability. Analyst review is required." if matched else 'No matching evidence. Search an account, device, merchant or “flagged”.',
            'sources':[{'citation':f'[{i+1}]','run_id':run['id'],'transaction_id':t['transaction_id'],'text':f"{t['account_id']} · {t['merchant']} · INR {t['amount']:,.2f} · anomaly percentile {t['risk_score']} · {t['timestamp']}"} for i,t in enumerate(matched)]}
