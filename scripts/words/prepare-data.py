#!/usr/bin/env python3
"""Make fresh SCOWL/OEWN queues, never approvals. No restricted age/frequency data.
Usage: python3 scripts/words/prepare-data.py <private-sources> <new-private-output> <HafaGPT/api>
Requires pinned public sources plus private scan-sources.private.json downloaded by the lead.
"""
import collections,gzip,hashlib,json,pathlib,re,sys,tarfile,unicodedata,xml.etree.ElementTree as ET
sys.dont_write_bytecode=True
sys.path.insert(0,str(pathlib.Path(__file__).resolve().parent))
from acquire import ROOT,external,verify_sources

def sha(data):return hashlib.sha256(data).hexdigest()
def dump(path,value):path.write_text(json.dumps(value,ensure_ascii=False,indent=2)+'\n')
def fold(s):return ''.join(c for c in unicodedata.normalize('NFD',s) if not unicodedata.combining(c)).upper()
def scan_words(words):return {fold(w) for w in words if re.fullmatch('[A-Z]{3,40}',fold(w))}
def components(words):
    words=set(words); patterns=collections.defaultdict(list)
    for word in words:
        for i in range(len(word)):patterns[word[:i]+'?'+word[i+1:]].append(word)
    unseen=set(words);groups=[]
    while unseen:
        start=min(unseen);unseen.remove(start);queue=[start];group=[]
        while queue:
            word=queue.pop();group.append(word)
            for i in range(len(word)):
                for neighbor in patterns[word[:i]+'?'+word[i+1:]]:
                    if neighbor in unseen:unseen.remove(neighbor);queue.append(neighbor)
        groups.append(sorted(group))
    return sorted(groups,key=lambda g:(-len(g),g[0]))

def prepare(src,out,hafa):
    src=external(src);out=external(out);hafa=pathlib.Path(hafa)
    if out.exists():raise ValueError('Refusing to overwrite queue evidence')
    lock=verify_sources(src);sources={s['id']:s for s in lock['sources']}
    levels={};british=set();core=set();broad=set()
    with tarfile.open(src/'scowl-release.tar.gz') as archive:
        for member in archive.getmembers():
            name=member.name
            if re.search(r'/final/(english|american)-words\.(10|20|35|40|50|55|60|70)$',name):
                level=int(name.rsplit('.',1)[1])
                for word in archive.extractfile(member).read().decode('latin1').splitlines():
                    if re.fullmatch('[a-z]{3,15}',word):levels[word.upper()]=min(level,levels.get(word.upper(),999))
            if re.search(r'/final/british(?:_z)?-words\.(10|20|35|40|50|55|60|70)$',name):
                british|=scan_words(archive.extractfile(member).read().decode('latin1').splitlines())
            if re.search(r'/misc/(profane|offensive)\.[123]$',name):
                words=scan_words(archive.extractfile(member).read().decode('latin1').splitlines());broad|=words
                if name.endswith('/profane.1') or '/offensive.' in name:core|=words
    scan_sources=json.loads((src/'scan-sources.private.json').read_text())
    for source in scan_sources:
        data=(src/source['file']).read_bytes()
        if sha(data)!=source['sha256']:raise ValueError('Private scan source hash mismatch')
        text=data.decode()
        if source['file'].endswith('.json'):words=json.loads(text)
        elif source['file'].endswith('.js'):words=re.findall(r"^\s*'?([a-zA-Z -]+)'?:\s*\d",text,re.M)
        else:words=text.splitlines()
        broad|=scan_words(words)
    # Keep original dictionary data private. No CHamoru text is generated or corrected.
    sensitive=set();pattern=re.compile(r'\b(vulgar|obscene|taboo|profan\w*|penis|vagina|genital\w*|testicle\w*|copulat\w*|sexual intercourse|fornicat\w*|prostitut\w*|buttocks|anus|feces|excrement|curse word)\b',re.I)
    dictionary_hashes={}
    for name,key in [('chamorro_english_dictionary_TOD.json','df'),('chamoru_info_dictionary.json',None),('revised_and_updated_chamorro_dictionary.json','Definition')]:
        data=(hafa/'dictionary_data'/name).read_bytes();dictionary_hashes[name]=sha(data)
        for head,record in json.loads(data).items():
            definition=record if isinstance(record,str) else record.get(key,'')
            if pattern.search(definition or ''):sensitive|=scan_words([head.replace("'",'').replace('’','').replace('-','')])
    broad|=sensitive
    canonical_path=hafa/'language_content/canonical_vocabulary.json';canonical=json.loads(canonical_path.read_text())['entries']
    if sha(canonical_path.read_bytes())!=sources['hafagpt-canonical']['sha256']:raise ValueError('Local HafaGPT source changed; explicit source upgrade required')
    # Only permitted OEWN senses and form links; no age norms, frequency tables or existing clue lists.
    entries=collections.defaultdict(list);synsets={};forms={}
    for _,el in ET.iterparse(gzip.open(src/'oewn-2024.xml.gz'),events=('end',)):
        if el.tag=='LexicalEntry':
            lemma=el.find('Lemma');word=lemma.get('writtenForm');pos=lemma.get('partOfSpeech')
            if re.fullmatch('[a-z]{3,15}',word):
                for sense in el.findall('Sense'):entries[word.upper()].append((sense.get('synset'),pos))
                for form in el.findall('Form'):
                    text=form.get('writtenForm','').upper()
                    if re.fullmatch('[A-Z]{3,15}',text):forms.setdefault(text,word.upper())
            el.clear()
        elif el.tag=='Synset':
            definition=el.find('Definition');synsets[el.get('id')]={'topic':el.get('lexfile','other'),'meaning':definition.text if definition is not None else ''};el.clear()
    enable=set((src/'enable.txt').read_text().upper().splitlines());pronunciations=collections.defaultdict(int)
    for line in (src/'cmudict.dict').read_text().splitlines():
        if line:pronunciations[re.sub(r'\(\d+\)$','',line.split()[0]).upper()]+=1
    supplements=json.loads((ROOT/'content/words/supplement.draft.json').read_text())['entries'];by_word={r['spelling']:r for r in supplements}
    def lemma_for(w):
        if w in entries:return w
        if w in forms:return forms[w]
        for ending,replacement in [('IES','Y'),('ES',''),('S',''),('ING',''),('ED','')]:
            if w.endswith(ending) and w[:-len(ending)]+replacement in entries:return w[:-len(ending)]+replacement
        return w
    def guessed_band(w):return 1 if len(w)<=6 and levels.get(w,35)<=35 else 2 if len(w)<=8 and levels.get(w,50)<=50 else 3 if len(w)<=10 else 4
    def record(w):
        band=guessed_band(w);supp=by_word.get(w);senses=entries.get(w,[]);sense=synsets.get(senses[0][0],{}) if senses else {};lemma=lemma_for(w)
        topic=supp['theme'] if supp else sense.get('topic','unclassified').replace('noun.','').replace('verb.','')
        source=sources['scowl'] if w in levels else sources['editorial']
        return dict(schemaVersion=1,id='en-'+w.lower(),spelling=w,lemma=lemma,language='en',sense=sense.get('meaning') or f'{w.lower()} in the {topic} context (needs a chosen sense)',readerLevel=['Little','Growing','Strong','Grown-up'][band-1],knownBand=band,readBand=band,spellBand=min(4,band+(len(w)>4)),clueBand=band,theme=topic,topic=topic,guamFit=supp['guamFit'] if supp else .2,audio=None,source={k:source[k] for k in ['id','revision','sha256']},form='lemma' if lemma==w else 'inflection',properNoun=w in ['GUAM','PACIFIC','GOD','JESUS','MARY','JOSEPH','ADVENT','EASTER','CHRISTMAS','PENTECOST'],abbreviation=False,british=[],locale='en-US',triage={'provisionalBands':True,'enable':w in enable,'pronunciations':pronunciations[w],'senseCount':len(senses),'lemmaUncertain':w not in entries and w not in forms,'sourceLevel':levels.get(w),'reviewRequired':True})
    # Never copy the research tiers: their age gates used noncommercial Kuperman data.
    candidates=[w for w,level in levels.items() if level<=60 and len(w)<=10 and w not in core and lemma_for(w)==w]
    candidates.sort(key=lambda w:(levels[w],len(w),w))
    candidates=candidates[:12421]
    tier_words=[record(w) for w in candidates]
    local=[record(r['spelling']) for r in supplements]
    all_records={r['id']:r for r in tier_words+local}
    # A finite, once-only review queue. Add reviewer-confirmed rejects to the private scan.
    census=sorted(w for w in enable if 3<=len(w)<=5)
    ladders=[w for w in levels if 3<=len(w)<=5 and w in enable and w not in core and lemma_for(w)==w]
    groups=components(ladders);ladder_words=[w for group in groups for w in group][:2500]
    theme_queue=sorted(all_records.values(),key=lambda r:(-r['guamFit'],r['triage']['sourceLevel'] or 35,len(r['spelling']),r['spelling']))[:2500]
    theme_seeds=json.loads((ROOT/'scripts/words/theme-seeds.json').read_text())
    theme_packs=[]
    for t in theme_seeds:
        chosen=[r['id'] for r in theme_queue if r['spelling'] in t['seeds'] or r['topic'] in t['topics']]
        theme_packs.append({'id':t['id'],'name':t['name'],'wordIds':chosen[:60],'needsSemanticReview':True})
    out.mkdir(parents=True)
    policy={'schemaVersion':1,'scan':sorted(broad),'core':sorted(core),'chamoruSensitive':sorted(sensitive),'exact':sorted(core),'lemmas':sorted({lemma_for(w) for w in core}),'rejectedCounts':{},'sources':scan_sources,'dictionaryHashes':dictionary_hashes,'limits':['Broad union is not proof against unlisted words','Wiktionary vulgar/offensive/slur snapshot is private scanning only; census still needs actual read','CHamoru definition search is not a fluent-reader check']}
    dump(out/'safety-policy.private.json',policy)
    for name,data in [('tiers.queue',{'words':tier_words}),('local.queue',{'words':local}),('themes.queue',{'words':theme_queue,'packs':theme_packs}),('ladder.queue',{'words':[record(w) for w in ladder_words]}),('census.queue',{'words':[{'id':'census-'+w.lower(),'spelling':w,'machineFlag':w in broad} for w in census]})]:
        dump(out/(name+'.json'),{'schemaVersion':1,'fixture':False,'reviewState':'awaiting-actual-review','basis':'SCOWL levels/length + OEWN lemma candidates; bands are guesses, no age/frequency norms',**data})
    little=[w for w in ladders if levels[w]<=35 and len(w)==4]
    summary={'schemaVersion':1,'sourcesVerified':True,'tierCandidates':len(tier_words),'localCandidates':len(local),'themeCandidates':len(theme_queue),'themePacks':len(theme_packs),'themeAssignedDistinct':len({id for p in theme_packs for id in p['wordIds']}),'ladderCandidates':len(ladder_words),'censusCandidates':len(census),'scanTerms':len(broad),'coreTerms':len(core),'chamoruSensitive':len(sensitive),'largestFourLetterLittleCandidateComponent':len(components(little)[0]),'approvedRecords':0,'reviewedRecords':0,'canonicalSourceSha256':sha(canonical_path.read_bytes()),'queueSha256':{p.name:sha(p.read_bytes()) for p in out.glob('*.queue.json')}}
    dump(out/'queue-receipt.private.json',summary);print(json.dumps(summary))

if __name__=='__main__':prepare(*sys.argv[1:4])
