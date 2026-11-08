#!/usr/bin/env python3
"""Check actual answer/variant membership against pinned source bytes at bake time."""
import json,pathlib,re,sys,tarfile
sys.dont_write_bytecode=True
sys.path.insert(0,str(pathlib.Path(__file__).resolve().parent))
from acquire import ROOT,external,verify_sources

def verify(directory,words,canonical_terms):
    directory=external(directory);verify_sources(directory);american=set();british=set()
    with tarfile.open(directory/'scowl-release.tar.gz') as t:
        for m in t.getmembers():
            if re.search(r'/final/(english|american|british|british_z)-(words|upper)\.(10|20|35|40|50|55|60|70)$',m.name):
                dest=british if '/final/british' in m.name else american
                dest.update(w.upper() for w in t.extractfile(m).read().decode('latin1').splitlines())
    pinned_terms=json.loads((directory/'canonical-vocabulary.json').read_text())['entries']
    assert canonical_terms==pinned_terms or not any(w['language']=='ch' for w in words),'Canonical terms must match the pinned source file'
    local={r['spelling'] for r in json.loads((ROOT/'content/words/supplement.draft.json').read_text())['entries']}
    for w in words:
        if w['language']=='ch':
            assert any(t['id']==w['canonicalId'] and t['review_status']=='source_backed' and t['recommended_teaching_term']==w['spelling'] for t in canonical_terms),'Invalid canonical spelling'
            continue
        assert w['spelling'] in (american if w['source']['id']=='scowl' else local),'Answer is not in its pinned American/editorial source'
        assert all(v in american|british for v in w['british']),'Unpinned British variant'
    return {'passed':True,'words':len(words),'implementation':'pinned-source-membership-v1'}
if __name__=='__main__':
    try:
        data=json.load(sys.stdin);print(json.dumps(verify(sys.argv[1],data['words'],data.get('canonicalTerms',[]))))
    except Exception as e:print(json.dumps({'passed':False,'error':str(e)}));sys.exit(1)
