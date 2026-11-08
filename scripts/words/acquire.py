#!/usr/bin/env python3
"""Fetch exactly pinned permitted sources into an external private workspace."""
import hashlib,json,pathlib,sys,urllib.request
ROOT=pathlib.Path(__file__).resolve().parents[2]

def external(path):
    p=pathlib.Path(path).resolve()
    if p==ROOT or ROOT in p.parents: raise ValueError('Private workspace must be outside app repository')
    return p

def verify_sources(directory):
    lock=json.loads((ROOT/'scripts/words/sources.lock.json').read_text())
    for source in lock['sources']:
        data=((ROOT/source['file']) if source['id']=='editorial' else (directory/source['file'])).read_bytes()
        if hashlib.sha256(data).hexdigest()!=source['sha256'] or len(data)!=source['bytes']: raise ValueError('Source hash mismatch: '+source['id'])
        if source['notice'] is None: continue
        notice=(ROOT/'scripts/words'/source['notice']).read_bytes()
        if hashlib.sha256(notice).hexdigest()!=source['noticeSha256']: raise ValueError('Notice hash mismatch')
    return lock

if __name__=='__main__':
    target=external(sys.argv[1]);target.mkdir(parents=True,exist_ok=True)
    lock=json.loads((ROOT/'scripts/words/sources.lock.json').read_text())
    for source in lock['sources']:
        if source['id']=='editorial': continue
        path=target/source['file']
        if not path.exists():
            if not source.get('url'): raise ValueError('Supply local canonical source at '+str(path))
            data=urllib.request.urlopen(source['url'],timeout=60).read()
            if hashlib.sha256(data).hexdigest()!=source['sha256']: raise ValueError('Downloaded hash mismatch')
            path.write_bytes(data)
    verify_sources(target)
    print(json.dumps({'passed':True,'sources':len(lock['sources'])}))
