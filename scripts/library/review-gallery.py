import pathlib,json,html,base64,sys,subprocess
R=pathlib.Path.cwd(); A=pathlib.Path(sys.argv[1]); A.mkdir(parents=True,exist_ok=True)
E=html.escape
css='''body{margin:0;font:17px/1.55 system-ui,sans-serif;color:#254e4b;background:#fcfaf4}main{max-width:1120px;margin:auto;padding:24px}h1{font-size:34px;line-height:1.15}h2{font-size:26px;line-height:1.2}p{max-width:75ch}small,.quiet{color:#516c65}section{margin:24px 0}.cards{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:16px}.card{background:#fff9e6;border:1px solid #d7dfd0;border-radius:22px;overflow:hidden;text-align:left;padding:10px;cursor:pointer;font:inherit;color:inherit;display:flex;flex-direction:column}.card img{width:100%;height:185px;object-fit:contain;flex-shrink:0}.card strong{font-size:16px;line-height:1.3;margin:8px}.card small{margin:0 8px 6px}button:focus-visible,a:focus-visible{outline:3px solid #276d85;outline-offset:4px}.layers{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:18px}.layer{padding:20px;background:white;border:1px solid #d7dfd0;border-radius:20px}.layer h3{margin:0}.layer p{margin-bottom:0}.sample-title{display:flex;align-items:center;gap:18px}.sample-title img{width:120px}.notes{padding:20px;background:#e7efdf;border-radius:16px}.meta{font:13px ui-monospace,monospace;word-break:break-word}.book img{height:200px;width:100%;object-fit:contain}.books{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:20px}.book{padding:16px;border-radius:18px;background:#e7dfce}dialog{max-width:780px;width:calc(100% - 52px);max-height:85%;overflow:auto;padding:24px;border:2px solid #254e4b;border-radius:22px;background:#fcfaf4;color:#254e4b}dialog::backdrop{background:#173f3b99}.toolbar{display:flex;gap:12px;flex-wrap:wrap}.toolbar button{font:inherit;padding:12px;border:1px solid #254e4b;border-radius:16px;background:white;color:inherit}.toolbar [aria-pressed=true]{background:#254e4b;color:white}.sent{border:0;background:none;text-align:left;display:inline;font:inherit;padding:0;margin:0;color:inherit;cursor:pointer}.sent.selected{background:#f0d397}.close{float:right;font:inherit;padding:10px}#read-copy{font-size:20px}#read-art{width:160px;float:right;margin:0 0 12px 20px}a{color:#276d85}@media(max-width:700px){main{padding:16px}.cards{grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.card img{height:160px}.layers{grid-template-columns:1fr}.books{grid-template-columns:repeat(2,minmax(0,1fr))}#read-art{float:none}}'''
def datauri(p):
 b=p.read_bytes();mime='image/svg+xml' if p.suffix=='.svg' else 'image/jpeg';return 'data:'+mime+';base64,'+base64.b64encode(b).decode()
def image(i):
 if i.get('_originalImage'):
  b=subprocess.check_output(['git','show','d0c181e:'+i['image']['path']]);mime='image/svg+xml' if i['image']['path'].endswith('.svg') else 'image/jpeg';return 'data:'+mime+';base64,'+base64.b64encode(b).decode()
 p=R/i['image']['path']
 if p.suffix=='.tsx':
  id='turtles' if i['id']=='turtle-breath' else i['id'];p=A/'legacy-art'/f'{id}.svg'
 return datauri(p)
def card(i):return '<button class="card" data-id="'+i['id']+'"><img alt="'+E(i['image']['alt'])+'" src="'+image(i)+'"><strong>'+E(i['title'])+'</strong><small>'+E(i['id'])+'</small></button>'
def sample(i):
 return '<section class="sample"><div class="sample-title"><img alt="'+E(i['image']['alt'])+'" src="'+image(i)+'"><div><small>THREE LAYERS · FAMILY REVIEW PENDING</small><h2>'+E(i['title'])+'</h2></div></div><div class="layers">'+''.join('<div class="layer"><h3>'+{'tell':'▱ Tell me','more':'▱▱ More','deep':'▱▱▱ Deep'}[l]+'</h3><p>'+E(' '.join(s['text'] for s in i['layers'][l]))+'</p></div>' for l in ['tell','more','deep'])+'</div><p class="quiet">'+E(' '.join(i['sensitiveNotes']))+'</p></section>'
items=json.loads((R/'content/library/items.json').read_text());topics=[i for i in items if i['type']=='topic'];cats=json.loads((R/'content/library/categories.json').read_text());bycat={c['id']:[i for i in topics if i['category']==c['id']] for c in cats if c['id']!='books'}
if len(topics)!=90:raise ValueError('Gallery expects combined 90-wonder collection')
# Every topic is available in the interactive gallery. One per category is also laid out in all three depths without opening a dialog.
js='''const items=DATA;const dialog=document.querySelector('dialog');let current=null;let layer='tell';function showLayer(next){layer=next;document.querySelectorAll('[data-layer]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.layer===layer)));const pane=document.querySelector('#read-copy');pane.replaceChildren();current.layers[layer].forEach(s=>{const b=document.createElement('button');b.className='sent';b.textContent=s.text+' ';b.onclick=()=>{pane.querySelectorAll('.sent').forEach(e=>e.classList.remove('selected'));b.classList.add('selected');document.querySelector('#audio-note').textContent='Sentence selected. Warm recording pending; exact transcript registered.'};pane.append(b)});document.querySelector('#audio-note').textContent='Review gallery: text selection only. Warm recordings pending.'}document.querySelectorAll('[data-id]').forEach(b=>b.onclick=()=>{current=items.find(i=>i.id===b.dataset.id);document.querySelector('#read-title').textContent=current.title;document.querySelector('#read-art').src=b.querySelector('img').src;document.querySelector('#read-art').alt=current.image.alt;document.querySelector('#sources').replaceChildren();current.sources.forEach(s=>{const p=document.createElement('p');p.textContent=s.title+' — '+s.url;document.querySelector('#sources').append(p)});showLayer('tell');dialog.showModal()});document.querySelectorAll('[data-layer]').forEach(b=>b.onclick=()=>showLayer(b.dataset.layer));document.querySelector('#close').onclick=()=>dialog.close();console.log(JSON.stringify({wonders:items.length,cards:document.querySelectorAll('.card').length,threeLayerExamples:document.querySelectorAll('.sample').length,brokenImages:[...document.images].filter(i=>i.complete&&!i.naturalWidth).length,horizontalOverflow:document.documentElement.scrollWidth>innerWidth}));'''.replace('DATA',json.dumps([dict(id=i['id'],title=i['title'],image=dict(alt=i['image']['alt']),layers={l:[dict(text=s['text']) for s in a] for l,a in i['layers'].items()},sources=i['sources']) for i in topics],ensure_ascii=False).replace('</','<\\/'))
dialog='<dialog><button class="close" id="close">Close</button><h2 id="read-title"></h2><img id="read-art" alt=""><div class="toolbar" aria-label="Reading layers"><button data-layer="tell">▱ Tell me</button><button data-layer="more">▱▱ More</button><button data-layer="deep">▱▱▱ Deep</button></div><p id="read-copy"></p><p id="audio-note" class="quiet"></p><details><summary>Primary sources</summary><div id="sources" class="meta"></div></details></dialog>'
def doc(body,script=''):return '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Island Library independent review gallery</title><style>'+css+'</style></head><body><main>'+body+'</main>'+dialog+'<script>'+script+'</script></body></html>'
nav='<nav>'+ ' · '.join('<a href="#'+c['id']+'">'+E(c['title'])+'</a>' for c in cats if c['id']!='books')+'</nav>'
body='<h1>Island Library · Content gallery</h1><p>90 wonders · 3 exhibit scripts · 8 Book Dash editions. Independent factual and editorial review is recorded per item. Family/cultural judgment, pronunciation and recordings remain pending. Choose a card, change its layer and select a sentence to inspect replay text. This gallery does not play audio.</p>'+nav
for c in cats:
 a=bycat.get(c['id'],[])
 if c['id']=='books':continue
 b='<section id="'+c['id']+'"><h2>'+E(c['title'])+' · '+str(len(a))+'</h2><div class="cards">'+''.join(card(i) for i in a)+'</div></section>'
 if a:b+=sample(a[0])
 else:b+='<p>No topic in this 3.1 content batch. This category is reserved for later content.</p>'
 (A/(c['id']+'.html')).write_text(doc(b,js));body+=b
body+='<section><h2>Eight complete English books</h2><div class="books">'
for i in items:
 if i['type']=='book':body+='<article class="book"><img src="'+image(i)+'" alt="'+E(i['image']['alt'])+'"><h3>'+E(i['title'])+'</h3><p>'+str(len(i['pages']))+' reading pages</p><small>'+E(i['edition']['isbn'])+' · CC BY 4.0</small></article>'
body+='</div></section>'
for id,c in json.loads((R/'content/library/exhibits.json').read_text()).items():
 body+='<section class="notes"><h2>'+E(next(i['title'] for i in items if i['id']==id))+'</h2>'
 for s in c['steps']:body+='<p><strong>'+E(s['label']['text'])+': </strong>'+E(' '.join(x['text'] for x in s['narration']))+'</p>'
 body+='<p><strong>Model limits: </strong>'+E(c['limits']['text'])+'</p></section>'
(A/'gallery.html').write_text(doc(body,js));(A/'gallery-counts.json').write_text(json.dumps({'wonders':len(topics),'categories':{k:len(v) for k,v in bycat.items()},'examples':{k:v[0]['id'] for k,v in bycat.items() if v}},indent=2));print('Gallery generated',len(topics),'wonders')

# Independent review comparisons; each schema category gets its own example.
original=json.loads(subprocess.check_output(['git','show','d0c181e:content/library/items.json']))
old={i['id']:dict(i,_originalImage=True) for i in original}
chosen=['turtle-breath','family-walk','bats','distant-stars','lightning','breathing','pulley','seagrass']
compare='<h1>Before and after</h1><p>Eight examples cover all eight schema categories. Original author copy is preserved at d0c181e. These are reading and art comparisons, not a family approval.</p>'
for id in chosen:
 i=next(i for i in items if i['id']==id);b=old[id]
 compare+='<section><h2>'+E(i['category']+' · '+i['title'])+'</h2>'
 for name,record in [('Before',b),('After',i)]:
  compare+='<h3>'+name+'</h3>'+sample(record)
 compare+='</section>'
(A/'before-after.html').write_text(doc(compare))
md='# Before and after: eight categories\n\nEight examples cover all eight schema categories; six would omit two. Exact original and revised copy follows.\n'
for id in chosen:
 i=next(i for i in items if i['id']==id)
 md+='\n## '+i['category']+' · '+i['title']+'\n'
 for name,record in [('Before',old[id]),('After',i)]:
  md+='\n### '+name+'\n'
  for layer in ['tell','more','deep']:md+='\n**'+layer+'**: '+' '.join(s['text'] for s in record['layers'][layer])+'\n'
(A/'BEFORE-AFTER.md').write_text(md)
# Every book, page and exact transcript; separate from the quick family packet.
bookbody='<h1>Book review reader</h1><p>Complete local pages and exact registered reading text. Book art retains its creators’ attribution. Family and pronunciation review remain pending.</p>'
for i in items:
 if i['type']!='book':continue
 bookbody+='<section id="'+i['id']+'"><h2>'+E(i['title'])+'</h2><p>'+E(i['edition']['rights']['credit'])+'</p><p>'+E(i['edition']['rights']['changes'])+'</p>'
 for n,p in enumerate(i['pages']):
  bookbody+='<details><summary>Page '+str(n)+'</summary><img style="width:100%;max-width:800px" src="'+datauri(R/p['image']['path'])+'" alt="'+E(p['image']['alt'])+'"><p>'+E(' '.join(s['text'] for s in p['sentences']))+'</p></details>'
 bookbody+='</section>'
(A/'books.html').write_text(doc(bookbody))
