"""Build a decision-only packet from exact canonical child-facing text. Does not approve content."""
import json,pathlib,re,sys
items=json.load(open('content/library/items.json'));by={i['id']:i for i in items};out=pathlib.Path(sys.argv[1]);out.mkdir(parents=True,exist_ok=True)
def passages(i):
 return [(layer,t) for layer in ['tell','more','deep'] for s in i['layers'][layer] for t in re.split(r'(?<=[.!?])\s+',s['text']) if t]
def quote(i,group):
 ps=passages(i)
 if i['id'] in ['guam','guam-made','guam-rail','limestone','limestone-forest','native-trees','village','family-walk','continents','maps','directions','constellation']:
  return [(l,t) for l,t in ps if l=='more']
 if group=='Body':return [(l,t) for l,t in ps if l=='tell']
 patterns={
 'Place, culture and belonging':r'Guam|CHamoru|continents|convention|family|families|village|constellation|Denali|map|north',
 'Animals, food and living things':r'eaten|prey|predator|eggs|milk|sting|waste|poop|safe|grown.up|watch|distance|leave|touch',
 'Weather, water and safe exploring':r'grown.up|safe|never|stay|indoors|building|danger|storm|warning|forecast|safety|shelter',
 'Models and making':r'grown.up|safe|paper|draw|model|moving|heavy|pinch|eyes|Sun',
 }
 hits=[(l,t) for l,t in ps if re.search(patterns.get(group,''),t,re.I)]
 # Preserve full sentences, never ellipsize or replace the exact reviewed words.
 short=[p for p in hits if len(p[1].split())<=38]
 return (short or hits)[:1]
def group(i):
 n=' '.join(i['sensitiveNotes']).lower()
 if i['category']=='body' or i['id']=='astronaut-home':return 'Body'
 if any(t in n for t in ['culture','cultural','local island','local ecology','local geology','local restoration']):return 'Place, culture and belonging'
 if i['category'] in ['animals','ocean','plants']:return 'Animals, food and living things'
 if i['category']=='weather' or i['id'] in ['drinking-water','night-view','telescope','sun','distant-stars','comet','shadow']:return 'Weather, water and safe exploring'
 return 'Models and making'
lines=['# Leon: Library family and cultural decisions','', 'Aim: about 20 minutes. Mark **Yes** or **Change** beside each item; a change can be one word or a short concern. No approval has been recorded. These are exact decision passages, not summaries of what a child will hear. The [full gallery](gallery.html) has every layer, and [the book reader](books.html) has every page.','', 'Science/source checks are handled in the review report. Your judgment here is family comfort, local identity, inclusion, tone and whether these stories belong on your children’s shelf. These excerpts do not replace a later family-device read/listen test.','']
records=[]
for g in ['Place, culture and belonging','Body','Animals, food and living things','Weather, water and safe exploring','Models and making']:
 subset=[i for i in items if i['type']=='topic' and i['sensitiveNotes'] and group(i)==g]
 if not subset:continue
 lines+=['## '+g,'']
 if g=='Place, culture and belonging':lines+=['Do the place names, family wording and local framing feel right? `Familia` is dictionary-backed; please judge its use and pronunciation. No claim of traditional star navigation is made.','']
 elif g=='Body':lines+=['Are these body explanations comfortable and inclusive for your family? No child is asked to prove strength, breath control or a sensory ability.','']
 elif g=='Animals, food and living things':lines+=['Are the feeding, life-cycle and wildlife passages calm enough? All pictures remain non-graphic.','']
 elif g=='Weather, water and safe exploring':lines+=['Are the hazard descriptions and one short safety note calm and useful? The app supplies no live warnings.','']
 else:lines+=['Are the model and activity boundaries clear enough for your children?','']
 for i in subset:
  chosen=quote(i,g)
  if not chosen:continue
  text=' '.join(t for l,t in chosen);layers='/'.join(dict.fromkeys(l for l,t in chosen));lines+=['- **'+i['title']+'** (`'+i['id']+'`, '+layers+'): “'+text+'” **Yes / Change:** ____']
  records.append({'id':i['id'],'layers':layers,'exactText':text})
 lines+=['']
lines+=['## Three exhibits','', 'Yes means the feeding/weather/night framing is suitable; it does not approve an untested engine.','']
ex=json.load(open('content/library/exhibits.json'))
for id,key in [('reef-food-web','predator'),('water-journey','grow'),('night-sky','limits')]:
 st=next(s for s in ex[id]['steps'] if s['key']==key);text=' '.join(s['text'] for s in st['narration']);lines+=['- **'+by[id]['title']+'**: “'+text+'” **Yes / Change:** ____'];records.append({'id':id,'exactText':text})
lines+=['','## Eight books','', 'Fiction keeps its published voice; a story event is not an activity instruction. The biography’s four corrected pages are labeled as a Library adaptation and retain the original manuscript. Choose Yes to include, or Change to discuss a passage or leave the book off the shelf.','']
bookselections={'busy-day':[7,10],'sleepy-mr-sloth':[4,8],'a-tiny-seed':[4,12],'a-fish-and-a-gift':[6],'a-beautiful-day':[9],'a-house-for-mouse':[8],'little-ants-big-plan':[3],'the-best-thing-ever':[4,7]}
concerns={'busy-day':'Multilingual greetings and toy shopping.','sleepy-mr-sloth':'Animal fantasy, accidental biting and snake contact.','a-tiny-seed':'Kenyan biography, child tool use in the original text, poverty and death; corrected school account below.','a-fish-and-a-gift':'South African family terms, fishing, storm-turtle story, shark net/siren and angry conflict.','a-beautiful-day':'River jumping and handstand scenes.','a-house-for-mouse':'Underwater dream and a fireplace picture.','little-ants-big-plan':'Teasing, parental anger and taking food; fantasy ant behavior.','the-best-thing-ever':'uGogo, housing, found roadside objects and a matchbox picture.'}
for id,ns in bookselections.items():
 i=by[id];lines+=['- **'+i['title']+'** — '+concerns[id]]
 # The turtle passage is long; quote its central dialogue, still an exact substring.
 if id=='a-fish-and-a-gift':
  text=' '.join(s['text'] for s in i['pages'][6]['sentences']);text=text[text.index('Papa said:'):] if 'Papa said:' in text else text[text.index('Papa said,'):]
  lines+=['  - Page 6: “'+text+'”']
  records.append({'id':id,'page':6,'exactText':text})
 else:
  for n in ns:
   text=' '.join(s['text'] for s in i['pages'][n]['sentences']);lines+=['  - Page '+str(n)+': “'+text+'”'];records.append({'id':id,'page':n,'exactText':text})
 lines+=['  - **Yes / Change:** ____']
lines+=['', 'All family/cultural flags remain pending until you answer. Pronunciation and generated narration also need review before shipping.']
(out/'LEON-REVIEW.md').write_text('\n'.join(lines)+'\n');(out/'family-packet-exact-text.json').write_text(json.dumps(records,ensure_ascii=False,indent=2)+'\n');print('Decision entries:',len({r['id'] for r in records}),'Words:',len(' '.join(lines).split()))
