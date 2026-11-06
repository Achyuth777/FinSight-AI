import os
import uuid
import json
import hmac
import logging
import threading
from datetime import datetime, timezone
from typing import Literal
from fastapi import FastAPI, HTTPException, UploadFile, File, Request, Query
from fastapi.responses import Response, JSONResponse
from starlette.middleware.gzip import GZipMiddleware
from starlette.middleware.trustedhost import TrustedHostMiddleware
from pydantic import BaseModel, Field
from sqlalchemy import create_engine, String, Text, select
from sqlalchemy.exc import IntegrityError
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
# Keyless access is a deliberate local-development choice (FINSIGHT_INSECURE_DEV=1), never the default.
def insecure_dev(): return os.getenv('FINSIGHT_INSECURE_DEV','').lower() in ('1','true','yes')
_dev=insecure_dev()
app = FastAPI(title='FinSight AI',version='0.1.1',description='Single-analyst research environment; private API access required unless FINSIGHT_INSECURE_DEV is set.',docs_url='/docs' if _dev else None,redoc_url='/redoc' if _dev else None,openapi_url='/openapi.json' if _dev else None)
# The run payload is large JSON; compressing it is the cheapest cut in transfer size.
app.add_middleware(GZipMiddleware,minimum_size=1000)

@app.middleware('http')
async def private_api(request: Request, call_next):
    if not request.url.path.startswith('/api/') or request.url.path == '/api/health':
        return await call_next(request)
    expected = os.getenv('FINSIGHT_API_KEY', '')
    # Without a key the API refuses to serve unless keyless local development was switched on explicitly.
    if not expected and insecure_dev():
        return await call_next(request)
    if len(expected) < 32:
        return JSONResponse({'detail': 'Backend access is not configured'}, status_code=503)
    supplied = request.headers.get('x-finsight-api-key', '')
    if not supplied or not hmac.compare_digest(supplied, expected):
        return JSONResponse({'detail': 'Unauthorized'}, status_code=401)
    return await call_next(request)


# DNS-rebinding guard. Keyless local development defaults to loopback hosts ("testserver" is the TestClient host); a
# keyed deployment's public hostname is unknown here, so the guard applies there only if ALLOWED_HOSTS is set.
_hosts = os.getenv('ALLOWED_HOSTS') or ('localhost,127.0.0.1,[::1],testserver' if _dev else None)
if _hosts: app.add_middleware(TrustedHostMiddleware, allowed_hosts=[h.strip() for h in _hosts.split(',')])
log = logging.getLogger('finsight')
# Case writes are read-modify-write; this serialises them within the single local process.
case_lock = threading.Lock()
MAX_UPLOAD_BYTES = 5_000_000

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
def public_dataset(d):
    rows=d.get('rows') or []
    return {**{k:v for k,v in d.items() if k!='rows'},'labeled':bool(rows) and 'is_fraud' in rows[0]}
@app.get('/api/datasets')
def datasets(): return [public_dataset(d) for d in records('dataset')]
@app.post('/api/datasets/demo')
def demo():
    prior=[d for d in records('dataset') if d.get('source')=='synthetic']
    if prior: return public_dataset(prior[0])
    f=validate_csv(demo_data().to_csv(index=False).encode())
    d=save('dataset',{'name':'Synthetic payment sandbox','source':'synthetic','currency':'INR','created_at':now(),'row_count':len(f),'rows':f.to_dict('records')})
    return public_dataset(d)
@app.post('/api/datasets/upload')
async def upload(request:Request,file:UploadFile=File(...)):
    declared=request.headers.get('content-length')
    if declared and declared.isdigit() and int(declared)>MAX_UPLOAD_BYTES+100_000: raise HTTPException(413,'File exceeds the 5 MB limit.')
    raw=await file.read(MAX_UPLOAD_BYTES+1)
    if len(raw)>MAX_UPLOAD_BYTES: raise HTTPException(413,'File exceeds the 5 MB limit.')
    try: f=validate_csv(raw)
    except ValueError as e: raise HTTPException(422,str(e))
    d=save('dataset',{'name':(file.filename or 'upload.csv')[:160],'source':'uploaded','currency':'INR','created_at':now(),'row_count':len(f),'rows':f.to_dict('records')})
    return public_dataset(d)
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
    except Exception:
        log.exception('Model training failed')
        raise HTTPException(500,'Model training failed; see server logs.')
    return save('run',{'dataset_id':body.dataset_id,'dataset_name':dataset['name'],'source':dataset['source'],'created_at':now(),**result})
@app.get('/api/runs')
def runs(): return [{k:v for k,v in d.items() if k not in ['transactions']} for d in records('run')]
@app.get('/api/runs/{id}')
def read_run(id:str,transactions:bool=True):
    run=get(id,'run')
    if transactions: return run
    rows=run.get('transactions',[])
    return {**{k:v for k,v in run.items() if k!='transactions'},'transaction_count':len(rows),'flagged_count':sum(1 for t in rows if t.get('flagged'))}
@app.get('/api/runs/{id}/transactions')
def run_transactions(id:str,limit:int=Query(25,ge=1,le=200),offset:int=Query(0,ge=0),sort:Literal['risk','amount','recent']='risk',q:str=Query('',max_length=100),risk:Literal['all','flagged','high']='all',min_amount:float|None=Query(None,ge=0),min_risk:float|None=Query(None,ge=0,le=100),split:Literal['all','train','test']='all'):
    """One page of a run's transactions, filtered and sorted on the server (same rules as the Transactions screen)."""
    rows=get(id,'run').get('transactions',[])
    flagged=[t['risk_score'] for t in rows if t.get('flagged')]
    needle=q.strip().lower()
    keep=[t for t in rows if
        (not needle or needle in ' '.join(str(t.get(k,'')) for k in ('transaction_id','account_id','merchant','device_id')).lower()) and
        (risk=='all' or (t.get('flagged') if risk=='flagged' else t['risk_score']>=95)) and
        (min_amount is None or t['amount']>=min_amount) and
        (min_risk is None or t['risk_score']>=min_risk) and
        (split=='all' or t.get('split')==split)]
    key={'risk':lambda t:t['risk_score'],'amount':lambda t:t['amount'],'recent':lambda t:t['timestamp']}[sort]
    keep.sort(key=key,reverse=True)  # stable, so ties keep run order
    return {'total':len(keep),'limit':limit,'offset':offset,'flag_floor':min(flagged) if flagged else None,'items':keep[offset:offset+limit]}
class CaseCreate(BaseModel):
    run_id:str
    transaction_id:str
@app.post('/api/cases')
def create_case(body:CaseCreate):
    run=get(body.run_id,'run')
    tx=next((t for t in run['transactions'] if t['transaction_id']==body.transaction_id),None)
    if not tx: raise HTTPException(404,'Transaction not found in this run')
    # Deterministic id makes (run, transaction) unique via the primary key, even under concurrent creates.
    cid=str(uuid.uuid5(uuid.NAMESPACE_URL,f'finsight-case:{body.run_id}:{body.transaction_id}'))
    legacy=next((c for c in records('case') if c['run_id']==body.run_id and c['transaction_id']==body.transaction_id),None)
    if legacy:return legacy
    try:
        return save('case',{'run_id':body.run_id,'transaction_id':body.transaction_id,'source':run['source'],'transaction':tx,'status':'open','created_at':now(),'events':[{'at':now(),'type':'created','text':'Investigation opened; anomaly is not evidence of confirmed fraud.'}]},cid)
    except IntegrityError:
        return get(cid,'case')
@app.get('/api/cases')
def cases():return records('case')
class CaseUpdate(BaseModel):
    status:Literal['open','reviewing','cleared','escalated']|None=None
    note:str=Field('',max_length=4000)
@app.patch('/api/cases/{id}')
def update_case(id:str,body:CaseUpdate):
    with case_lock:
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
    words=body.query.lower().split()
    # Ignore 1–2 character tokens (they match nearly everything) unless nothing else is left.
    terms=[w for w in words if len(w)>=3] or words
    tx=run['transactions']
    keywords={'risk','flagged','high','anomaly'}
    ids=[w for w in terms if w not in keywords]
    matched=[t for t in tx if any(term in f"{t['transaction_id']} {t['account_id']} {t['device_id']} {t['merchant']}".lower() for term in ids)]
    if keywords & set(terms):
        # Keywords narrow to flagged rows; any id/account/device/merchant terms still apply on top.
        matched=[t for t in (matched if ids else tx) if t['flagged']]
    total=len(matched)
    matched=sorted(matched,key=lambda t:t['risk_score'],reverse=True)[:6]
    return {'mode':'deterministic-evidence-retrieval','answer': f"Found {total} matching evidence records (maximum 6 shown). Scores express anomaly rank, not fraud probability. Analyst review is required." if matched else 'No matching evidence. Search an account, device, merchant or “flagged”.',
            'sources':[{'citation':f'[{i+1}]','run_id':run['id'],'transaction_id':t['transaction_id'],'text':f"{t['account_id']} · {t['merchant']} · INR {t['amount']:,.2f} · anomaly percentile {t['risk_score']} · {t['timestamp']}"} for i,t in enumerate(matched)]}
