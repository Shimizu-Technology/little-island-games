import { describe, expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, rmSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { buildIndex, phonetic, search } from '../src/library/search';
import { visibleSaved } from '../src/library/availability';
import { legacyEnvelope, LEGACY_MIGRATION_PLAN } from '../src/library/legacy';
import { TOPICS } from '../src/explore/content';
import data from '../content/library/items.json';
import plan from '../content/library/collection-plan.json';
import generatedIndex from '../content/library/search-index.json';
function validate(mutator: (items: typeof data) => void, shipping = false) {
  const dir=mkdtempSync(join(tmpdir(),'little-library-test-')),path=join(dir,'items.json');
  const items=structuredClone(data);mutator(items);writeFileSync(path,JSON.stringify(items));
  try { return execFileSync(process.execPath,['scripts/library/validate.mjs','--file',path,...(shipping?['--shipping']:[])],{encoding:'utf8',stdio:'pipe'}); }
  finally {rmSync(dir,{recursive:true,force:true});}
}
describe('Library content admission',()=>{
  it('accepts explicit design drafts with all rights, review, transcript and pending-audio reasons',()=>expect(validate(()=>{})).toContain('4 items'));
  it('rejects missing image rights even on a draft',()=>expect(()=>validate(items=>{delete (items[0].image.rights as {credit?:string}).credit;})).toThrow());
  it('rejects absent review identity or date',()=>expect(()=>validate(items=>{items[0].review.reviewer='';})).toThrow());
  it('rejects a missing audio declaration rather than silently treating it as pending',()=>expect(()=>validate(items=>{delete (items[0].label as {audio?:unknown}).audio;})).toThrow());
  it('rejects shipping the design collection before review and recording',()=>expect(()=>validate(()=>{},true)).toThrow());
  it('rejects speech drift and broken authored links',()=>{
    expect(()=>validate(items=>{items[0].label.text='Unregistered text';})).toThrow();
    expect(()=>validate(items=>{items[0].links[0].target='missing';})).toThrow();
  });
  it('rejects missing layers and altered book images',()=>{
    expect(()=>validate(items=>{delete (items[0].layers as {deep?:unknown}).deep;})).toThrow();
    expect(()=>validate(items=>{items[3].pages![0].image.sha256='0'.repeat(64);})).toThrow();
  });
  it('plans 150 unique titles across eight named wonder collections',()=>{
    const titles=plan.collections.flatMap(c=>c.titles);expect(plan.collections).toHaveLength(8);expect(titles).toHaveLength(150);expect(new Set(titles).size).toBe(150);
  });
});
describe('Offline discovery',()=>{
  const index=buildIndex([{id:'dolphins',title:'Is a dolphin a fish?',category:'ocean',aliases:['dolfin'],tags:['mammal']},{id:'turtles',title:'Sea turtle',category:'ocean',aliases:[],tags:['reptile']},{id:'moon',title:'The Moon',category:'space',aliases:[],tags:['night']}]);
  const allowed=new Set(['dolphins','turtles','moon']);
  it('matches a child-authored alias and tolerates a missing letter',()=>{
    expect(search(index,'dolfin',allowed)[0].id).toBe('dolphins');expect(search(index,'dophin',allowed)[0].id).toBe('dolphins');
  });
  it('uses bounded phonetics without letting an empty vowel key match everything',()=>{
    expect(phonetic('dolfin')).toBe(phonetic('dolphin'));expect(search(index,'aaaa',allowed)).toEqual([]);
  });
  it('requires every query word, ranks exact words first and recovers with no invented result',()=>{
    expect(search(index,'sea turtle',allowed).map(i=>i.id)).toEqual(['turtles']);expect(search(index,'moon fish',allowed)).toEqual([]);expect(search(index,'zxqv',allowed)).toEqual([]);
  });
  it('filters permissions before ranking and respects pictured category filters',()=>{
    expect(search(index,'dolfin',new Set(['moon']))).toEqual([]);expect(search(index,'',allowed,'space').map(i=>i.id)).toEqual(['moon']);
  });
  it('uses a prebuilt index with the same matcher and an explicit dolphin alias',()=>expect(search(generatedIndex,'dolfin',new Set(generatedIndex.map(e=>e.id)))[0].id).toBe('dolphins'));
  it('hides shelf entries without deleting the original saved list',()=>{
    const saved=['dolphins','moon','busy-day'];expect(visibleSaved(saved,new Map([['dolphins','ocean'],['moon','space'],['busy-day','books']]),['ocean'])).toEqual(['dolphins']);expect(saved).toEqual(['dolphins','moon','busy-day']);
  });
});
describe('No-loss migration proposal',()=>{
  it('retains all fifty stable IDs and complete original payloads',()=>{
    expect(LEGACY_MIGRATION_PLAN).toHaveLength(50);expect(LEGACY_MIGRATION_PLAN.map(e=>e.original)).toEqual(TOPICS);expect(LEGACY_MIGRATION_PLAN.map(e=>e.legacyId)).toEqual(TOPICS.map(e=>e.id));
  });
  it('does not mutate sources or pretend the old deeper fact is a reviewed Deep layer',()=>{
    const source=structuredClone(TOPICS[0]),before=structuredClone(source),envelope=legacyEnvelope(source);envelope.original.related.push('changed-copy');expect(source).toEqual(before);expect(envelope.layers.deep).toBeNull();expect(envelope.needsReview).toBe(true);
  });
  it('keeps the production Explore entry and module outside this slice',()=>{
    expect(readFileSync('src/app/explore.tsx','utf8')).not.toContain('LibraryLab');
  });
});

describe('Staged narration boundary',()=>{
  it('keeps design registrations out of shipped voice receipts until explicitly included',()=>{
    const active=JSON.parse(execFileSync('python3',['scripts/generate-audio.py','--manifest'],{encoding:'utf8'}));
    const staged=JSON.parse(execFileSync('python3',['scripts/generate-audio.py','--manifest','--include-staged'],{encoding:'utf8'}));
    const library=JSON.parse(readFileSync('scripts/learn/library.json','utf8'));
    expect(active['library-label-turtle']).toBeUndefined();
    for(const [key,text] of Object.entries(library)){expect(staged[key]).toBe(text);expect(active[key]).toBeUndefined();}
  });
});
