"""Live loopback HTTP smoke test; isolated temporary database, no external requests."""
import os,sys,json,time,tempfile,subprocess
from pathlib import Path
import httpx

def main():
    with tempfile.TemporaryDirectory() as temp:
        env={**os.environ,'DATABASE_URL':'sqlite:///'+str(Path(temp)/'smoke.db')}
        proc=subprocess.Popen([sys.executable,'-m','uvicorn','backend.main:app','--host','127.0.0.1','--port','8012'],env=env,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
        try:
            c=httpx.Client(base_url='http://127.0.0.1:8012',timeout=60,trust_env=False)
            for attempt in range(40):
                try:
                    if c.get('/api/health').status_code==200:break
                except httpx.ConnectError:time.sleep(.25)
            else:raise RuntimeError('API did not start')
            d=c.post('/api/datasets/demo').json()
            response=c.post('/api/runs',json={'dataset_id':d['id'],'trees':100,'supervised':True});response.raise_for_status();r=response.json()
            t=max(r['transactions'],key=lambda x:x['anomaly_score'])
            response=c.post('/api/cases',json={'run_id':r['id'],'transaction_id':t['transaction_id']});response.raise_for_status();case=response.json()
            response=c.patch('/api/cases/'+case['id'],json={'status':'reviewing','note':'Verified source evidence in live HTTP smoke test.'});response.raise_for_status()
            assert any(x['id']==case['id'] and x['status']=='reviewing' for x in c.get('/api/cases').json())
            q=c.post('/api/research',json={'run_id':r['id'],'query':t['transaction_id']}).json()
            assert q['sources'][0]['transaction_id']==t['transaction_id']
            report={'transport':'live HTTP over loopback','health':c.get('/api/health').json(),'rows':len(r['transactions']),'train_count':r['train_count'],'test_count':r['test_count'],'isolation_forest_metrics':r['metrics'],'xgboost_metrics':r['comparison']['metrics'],'shap_features':len(r['comparison']['shap_mean_abs']),'case_persistence':True,'citation_verified':True,'note':'Synthetic data only; these metrics do not measure production performance.'}
            Path('docs/smoke-results.json').write_text(json.dumps(report,indent=2))
            print(json.dumps(report,indent=2))
        finally:
            proc.terminate();proc.wait(timeout=10)
if __name__=='__main__':main()
