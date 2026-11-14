import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import fixture from './fixtures/word-search/bank.json';
import { pictureBindings } from '../scripts/puzzles/words/picture-bindings.mjs';
import { createSearchPictures, type PictureBinding } from '../src/puzzles/words/pictures';
import { searchPictureEntries as adopted } from '../src/puzzles/words/pictures.generated';
import adoptedBanks from '../src/puzzles/words/packs.generated.json';

const entries: PictureBinding[] = pictureBindings(fixture.puzzles), assets = Object.fromEntries(entries.map(p=>[p.id,()=>1]));
const xmlFor = (id: string) => readFileSync(`content/pictures/svg/${id}.svg`,'utf8');
describe('admitted Word Search pictures',()=>{
  it('projects only pictured answers and leaves the unpublished runtime empty',()=>{
    const wanted = new Set(fixture.puzzles.filter(p=>p.list==='pictures').flatMap(p=>p.words.map(w=>w.spelling)));
    expect(new Set(entries.map(p=>p.spelling))).toEqual(wanted);expect(entries).toHaveLength(4);
    if(!adoptedBanks.length)expect(adopted).toEqual([]);
  });
  it('verifies real SVG bytes and rejects unknown or altered assets',async()=>{
    const p=entries[0], xml=xmlFor(p.id), good=createSearchPictures(entries,assets,{read:async()=>xml});
    expect(good.idFor(p.spelling.toLowerCase())).toBe(p.id);expect(await good.load(p.id)).toBe(xml);
    await expect(good.load('missing-picture')).rejects.toThrow('Unknown Word Search picture');
    const bad=createSearchPictures(entries,assets,{read:async()=>xml+' '});await expect(bad.load(p.id)).rejects.toThrow('admitted binding');
  });
  it('retries failed reads and bounds successful cached pictures',async()=>{
    let attempts=0;const [a,b]=entries;
    const retry=createSearchPictures([a],assets,{read:async()=>{if(++attempts===1)throw Error('read');return xmlFor(a.id);}});
    await expect(retry.load(a.id)).rejects.toThrow('read');await expect(retry.load(a.id)).resolves.toBe(xmlFor(a.id));expect(attempts).toBe(2);
    let reads=0;const smallAssets={[a.id]:()=>0,[b.id]:()=>1};
    const limited=createSearchPictures([a,b],smallAssets,{read:async asset=>{reads++;return xmlFor(asset()===0?a.id:b.id);}},1);
    await limited.load(a.id);await limited.load(a.id);await limited.load(b.id);await limited.load(a.id);expect(reads).toBe(3);
  });
});
