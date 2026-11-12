import { describe, expect, it } from 'vitest';
import { readFileSync, mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
// Build-time JS deliberately has no path from the React Native dependency graph.
import { answerAllowed, cellsFor, digest, sha256, validateWord, validatePack, rankedWords, foldScan } from '../scripts/words/core.mjs';
import { scanGrid, scanScramble, scanBentPaths, scanLetterWheel, countOccurrences } from '../scripts/words/scan.mjs';
import { lintClue } from '../scripts/words/lint.mjs';
import { prepareBatch, validateReview, reconcile, requireShippingReview } from '../scripts/words/review.mjs';
import { independentlyVerify, bakeBank, checkSurfaces } from '../scripts/words/bake.mjs';
import { guardTree } from '../scripts/words/guard.mjs';
import { checkShippingTree } from '../scripts/words/shipping.mjs';
import {loadWordBank, legacyWordRescue} from '../content/words/registry';
import {WORDS} from '../src/games/words';
import { acceptsAnagram, acceptsLadderStep, acceptsWord, missingWordReply, wordHintText } from '../content/words/runtime';

const word = (spelling = 'REEF') => ({ schemaVersion:1,id:spelling.toLowerCase(),spelling,lemma:spelling,language:'en',sense:'A ridge of coral in the sea',readerLevel:'Little',knownBand:1,readBand:1,spellBand:2,clueBand:1,theme:'ocean',topic:'nature',guamFit:1,audio:null,source:JSON.parse(readFileSync('scripts/words/sources.lock.json','utf8')).sources.find((s: any)=>s.id==='scowl'),form:'lemma',properNoun:false,abbreviation:false,british:[],locale:'en-US' });
const clue = (i = 0) => ({schemaVersion:1,id:`cal-${i}`,wordId:'reef',answer:'REEF',meaning:'A ridge of coral in the sea',tier:'Little',text:`Coral grows here under the sea${i ? `, clue ${i}` : ''}.`,candidates:[`Coral grows here under the sea${i ? `, clue ${i}` : ''}.`,'A coral ridge under the waves.','A home for fish made of coral.'],provenance:{model:'fixture-author',date:'2026-11-08T00:00:00Z',promptVersion:'test-v1',promptSha256:'c'.repeat(64),webUsed:false,inputs:'answer,meaning,tier,tone'}});
const policy = {scan:['COLD'],core:['COLD'],exact:['COLD'],lemmas:['COLD']};
const options = {id:'TEST-ONLY-250',fixture:true,vocabularySha256:'d'.repeat(64),scanListSha256:'e'.repeat(64)};
function reviewed(packet: any, family: string, verdict = 'keep', model = `TEST-ONLY-${family}`) {
  const transcript=`TEST FIXTURE ONLY: synthetic ${family} ${model} transport; no content approval`;
  const result={schemaVersion:1,batchSha256:packet.batchSha256,packetSha256:digest(packet),slot:packet.slot,fixture:true,reviewer:{id:`fixture-${family}-${model}`,family,model},runId:`test-${family}-${model}`,startedAt:'2026-11-08T00:00:00Z',finishedAt:'2026-11-08T00:01:00Z',transcriptSha256:sha256(transcript),items:packet.items.map((c: any) => ({id:c.id,verdict,reason:'Synthetic fixture exercises transport only',...(verdict === 'revise'?{replacement:'Fixture replacement'}:{})}))};
  return validateReview(packet,result,sha256(transcript));
}

describe('word records and non-destructive content policy', () => {
  it('requires independent vocabulary bands and keeps Guam ranking separate from difficulty', () => {
    expect(validateWord(word())).toBeTruthy();
    expect(() => validateWord({...word(),spellBand:undefined})).toThrow('spellBand');
    expect(rankedWords([{...word('SLED'),guamFit:0},word('REEF')])[0].spelling).toBe('REEF');
  });
  it('passes all 87 family/faith/body/Guam probe words without substring blocking', () => {
    const data=JSON.parse(readFileSync('scripts/words/faith-probe.json','utf8'));
    const words=['faith','family','nature','guam','body'].flatMap(k => data[k].split(' '));
    expect(words).toHaveLength(87);
    for (const spelling of [...words,'MAMA','BUTTER','BUTTON','MUFFIN','SPOON']) expect(answerAllowed(word(spelling),policy)).toBe(true);
    expect(answerAllowed(word('COLD'),policy)).toBe(false);
    expect(answerAllowed({...word('COLDEST'),lemma:'COLD'},policy)).toBe(false);
  });
  it('applies the private sensitive-headword filter to CHamoru matching too', () => {
    // Neutral source-backed term used only as a synthetic policy restriction.
    const ch={...word(),language:'ch',spelling:'Chotda',lemma:'Chotda'};
    expect(answerAllowed(ch,{...policy,chamoruSensitive:['CHOTDA']})).toBe(false);
    expect(()=>answerAllowed(ch,policy)).toThrow('sensitive');
  });
  it('enforces spelling, child nouns/inflections, lengths and repeat/cap rules', () => {
    expect(() => validateWord({...word('GREY'),locale:'en-GB'})).toThrow('American');
    expect(() => validateWord({...word('REEFS'),form:'plural'})).toThrow('lemmas');
    expect(() => validateWord({...word('PARIS'),properNoun:true})).toThrow('proper noun');
    expect(validateWord({...word('GUAM'),properNoun:true})).toBeTruthy();
    expect(() => validateWord(word('TRADE WIND'))).toThrow('adult only');
    expect(validateWord({...word('TRADE WIND'),readerLevel:'Grown-up',wordLengths:[5,4]})).toBeTruthy();
    expect(() => validatePack([word(),{...word('REEFS'),lemma:'REEF'}])).toThrow('inflection');
    expect(() => validatePack([{...word('REEFS'),readerLevel:'Grown-up',form:'plural'}])).toThrow('10%');
    expect(() => validateWord({...word(),abbreviation:true})).toThrow('Abbreviations');
  });
  it('enforces approved spooky/hard sense policies without hiding normal faith', () => {
    expect(validateWord({...word('GHOST'),topic:'stories'})).toBeTruthy();
    expect(() => validateWord({...word('DEMON'),topic:'stories'})).toThrow('Strong');
    expect(validateWord({...word('DEMON'),readerLevel:'Strong',topic:'stories'})).toBeTruthy();
    expect(() => validateWord({...word('DEATH'),readerLevel:'Growing'})).toThrow('science/history');
    expect(validateWord({...word('DEATH'),readerLevel:'Growing',topic:'science'})).toBeTruthy();
    expect(validateWord(word('BIBLE'))).toBeTruthy();
    expect(validateWord({...word('GOD'),properNoun:true})).toBeTruthy();
  });
  it('keeps CHamoru exact, digraphs single-cell, and limited to source-backed uses', () => {
    expect(() => cellsFor('Åttilung')).toThrow('English');
    expect(cellsFor('Chotda','ch')).toEqual(['CH','O','T','D','A']);
    expect(cellsFor('Hunggan','ch')).toEqual(['H','U','NG','G','A','N']);
    const ch={...word(),spelling:'Chotda',language:'ch',canonicalId:'food.green_banana',uses:['word-search','matching'],fluentReaderChecked:false};
    const terms=[{id:'food.green_banana',review_status:'source_backed',recommended_teaching_term:'Chotda'}];
    expect(validateWord(ch,terms)).toBeTruthy();
    expect(()=>validateWord({...ch,spelling:'chotda'},terms)).toThrow('exactly');
    expect(()=>validateWord({...ch,uses:['crossword']},terms)).toThrow('limited');
    expect(()=>validateWord(ch,[{...terms[0],review_status:'needs_review'}])).toThrow('source-backed');
  });
});

describe('private eight-direction scan and independent verifier', () => {
  it('finds a scan term in every direction and agrees with the independent implementation', () => {
    for (const [dy,dx] of [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]]) {
      const cells=Array.from({length:7},()=>Array(7).fill('Q'));
      [...'COLD'].forEach((c,i)=>{cells[3+(i-1)*dy][3+(i-1)*dx]=c;});
      expect(scanGrid(cells,policy.scan).length).toBeGreaterThan(0);
      expect(()=>independentlyVerify([{id:'test',cells}],policy.scan)).toThrow('verification failed');
    }
  });
  it('folds only the scan, including starts/ends inside digraphs and glota', () => {
    const grid=[['Å','Ñ','A']];const original=structuredClone(grid);
    expect(scanGrid(grid,['ANA']).length).toBeGreaterThan(0);
    expect(()=>independentlyVerify([{id:'accent',cells:grid}],['ANA'])).toThrow('verification failed');
    expect(grid).toEqual(original);
    expect(scanGrid([['CH','A','T']],['HAT']).length).toBeGreaterThan(0);
    expect(scanGrid([['C',"'",'O','L','D']],['COLD']).length).toBeGreaterThan(0);
  });
  it('exempts only a verified listed answer path, not crossings or other filler', () => {
    const cells=[['C','O','L','D','Q','C','O','L','D']];
    const listed=[{wordId:'test',answer:'COLD',cells:[[0,0],[0,1],[0,2],[0,3]]}];
    expect(scanGrid(cells,policy.scan,listed)).toHaveLength(1);
    expect(()=>independentlyVerify([{id:'test',cells,listed}],policy.scan)).toThrow('verification failed');
    expect(()=>scanGrid(cells,policy.scan,[{...listed[0],answer:'WARM'}])).toThrow('spelling mismatch');
    const clean=[['C','O','L','D']];
    expect(scanGrid(clean,policy.scan,listed)).toEqual([]);
    expect(independentlyVerify([{id:'test',cells:clean,listed}],policy.scan).passed).toBe(true);
  });
  it('rejects unsafe letter wheels by letter counts', () => {
    expect(scanLetterWheel('DLOCQ',policy.core)).toEqual(['COLD']);
    expect(scanLetterWheel('COLQ',policy.core)).toEqual([]);
    expect(()=>checkSurfaces({words:[word('CORD')],surfaces:[{id:'wheel',kind:'wheel',wordIds:['cord'],letters:'CORDL'}],policy})).toThrow('wheel');
    expect(checkSurfaces({words:[word('REEF')],surfaces:[{id:'wheel',kind:'wheel',wordIds:['reef'],letters:'REEFQ'}],policy}).passed).toBe(true);
  });
  it('agrees with the independent checker on 100 mixed-cell fixtures', () => {
    let seed=123;
    const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed >>> 16;};
    const alphabet=['A','N','Å','Ñ','C','CH','H','T',"'",'#'],terms=['ANA','HAT','CAT','ANT','NAN'];
    const grids=Array.from({length:100},(_,i)=>({id:`TEST-ONLY-${i}`,cells:Array.from({length:5},()=>Array.from({length:5},()=>alphabet[random()%alphabet.length])),listed:[]}));
    for (let i=0;i<grids.length;i+=10) {
      grids[i].cells[0].splice(0,3,'C','A','T');
      (grids[i].listed as any[]).push({wordId:'cat',answer:'CAT',cells:[[0,0],[0,1],[0,2]]});
    }
    const cleanPath=(cells: number[][], grid: any)=>cells.filter(([r,c])=>foldScan(grid[r][c]).length).map(p=>p.join(',')).sort().join(';');
    const expected=new Set(grids.flatMap(g=>scanGrid(g.cells,terms,g.listed).map((hit: any)=>`${g.id}:${hit.term}:${cleanPath(hit.cells,g.cells)}`)));
    for (const term of terms) expect([...expected].some(k=>k.includes(`:${term}:`))).toBe(true);
    const python=spawnSync('python3',['-I','scripts/words/verify.py'],{input:JSON.stringify({grids,terms}),encoding:'utf8'});
    expect(python.error).toBeUndefined();
    const result=JSON.parse(python.stdout);
    const actual=new Set(result.hits.map((hit: any)=>`${hit.gridId}:${hit.term}:${cleanPath(hit.cells,grids.find(g=>g.id===hit.gridId)!.cells)}`));
    expect(actual).toEqual(expected);
  });
  it('checks unique physical locations, including palindromes and CH/NG', () => {
    expect(countOccurrences([['E','Y','E']],['E','Y','E'])).toBe(1);
    expect(countOccurrences([['C','A','T','C','A','T']],['C','A','T'])).toBe(2);
    expect(countOccurrences([['CH','O','T','D','A']],['CH','O','T','D','A'])).toBe(1);
  });
  it('rejects blocked shuffles forward/back and bent builder paths without reused cells', () => {
    expect(scanScramble('DLOC',policy.scan).length).toBeGreaterThan(0);
    expect(scanScramble('CDOL',policy.scan)).toEqual([]);
    expect(scanBentPaths([['C','Q','D'],['Q','O','L']],policy.core)).toEqual(['COLD']);
    expect(scanBentPaths([['A','B']],['ABA'])).toEqual([]);
  });
  it('validates each surface with the same answer list and independent scanned-surface receipt', () => {
    const words=[word('REEF')];
    const surface={id:'search',kind:'word-search',wordIds:['reef'],cells:[['R','E','E','F']],listed:[{wordId:'reef',answer:'REEF',cells:[[0,0],[0,1],[0,2],[0,3]]}]};
    expect(checkSurfaces({words,surfaces:[surface],policy}).grids).toBe(1);
    expect(()=>checkSurfaces({words,surfaces:[{...surface,cells:[['R','E','E','F','R','E','E','F']]}],policy})).toThrow('exactly once');
    expect(checkSurfaces({words,surfaces:[{id:'cross',kind:'crossword',wordIds:['reef'],cells:[['R','E','E','F']]}],policy}).passed).toBe(true);
    expect(()=>checkSurfaces({words,surfaces:[{id:'cross',kind:'crossword',wordIds:['reef'],cells:[['C','O','L','D']]}],policy})).toThrow('unreviewed run');
    expect(checkSurfaces({words,surfaces:[{id:'scramble',kind:'scramble',wordIds:['reef'],shuffle:'FERE'}],policy}).grids).toBe(1);
    expect(()=>checkSurfaces({words,surfaces:[{id:'ladder',kind:'ladder',wordIds:['reef'],}],policy:{...policy}})).not.toThrow(Error);
    expect(()=>checkSurfaces({words:[word('COD')],surfaces:[{id:'builder',kind:'builder',wordIds:['cod'],cells:[['C','Q','D'],['Q','O','L'],['R','Q','Q']]}],policy})).toThrow('builder');
  });
  it('keeps synthetic/inline approval claims out of shipping', () => {
    expect(()=>bakeBank({fixture:true,words:[],surfaces:[],policy,sourceDirectory:'unused-test-fixture'})).toThrow('fixtures');
    expect(()=>requireShippingReview({...word(),status:'approved'},undefined)).toThrow('review evidence');
  });
});

describe('closed device word helpers', () => {
  it('loads word data only through registered IDs and preserves the inherited game pack',()=>{
    for(const id of ['unknown','constructor','__proto__']) expect(()=>loadWordBank(id)).toThrow('Unknown admitted word bank');
    expect(WORDS).toBe(legacyWordRescue);
    expect(WORDS[0]).toEqual(['CAT','Animals','A small pet that purrs.']);
  });
  it('accepts reviewed British variants, arbitrary listed ladder steps and all listed anagrams', () => {
    expect(acceptsWord(' colour ',['COLOR','COLOUR'])).toBe(true);
    expect(acceptsWord(' trade wind ',['TRADE WIND'])).toBe(true);
    expect(acceptsWord('TRADE  WIND',['TRADE WIND'])).toBe(false);
    expect(acceptsLadderStep('COLD','CORD',['CORD'])).toBe(true);
    expect(acceptsLadderStep('COLD','WARM',['WARM'])).toBe(false);
    expect(acceptsAnagram('MEAT','TEAM',['TEAM','MEAT'])).toBe(true);
    expect(acceptsAnagram('TAME','TEAM',['TEAM','MEAT'])).toBe(false);
    expect(missingWordReply).toBe("That word isn't in this puzzle's list.");
  });
  it('has only closed, bounded hint templates', () => {
    expect(wordHintText({kind:'starts',letter:'S'})).toBe('Starts with S.');
    expect(wordHintText({kind:'length',length:4})).toBe('Has 4 letters.');
    expect(()=>wordHintText({kind:'starts',letter:'Free text'})).toThrow('Invalid closed word hint');
  });
});

describe('clue lint routes to review, including cultural and family context', () => {
  it('checks length, vocabulary, answer, homes, colonial framing, brands and pressure', () => {
    const text='REEF was discovered by your mom and dad. Hurry to LEGO!';
    const rules=lintClue({...clue(),text},[]).map((x: any)=>x.rule);
    for (const rule of ['answer-in-clue','vocabulary','one-home','colonial-framing','brand','pressure']) expect(rules).toContain(rule);
    expect(lintClue({...clue(),text:'word '.repeat(20)},['word']).some((x: any)=>x.rule==='length')).toBe(true);
  });
  it('checks vocabulary records against the selected clue tier', () => {
    const c={...clue(),text:'A messenger from God.'};
    const vocab=['A','FROM','GOD',{spelling:'MESSENGER',readBand:3}];
    expect(lintClue(c,vocab).some((f: any)=>f.rule==='vocabulary')).toBe(true);
    expect(lintClue({...c,tier:'Strong'},vocab)).toEqual([]);
  });
  it('does not mistake God or faith for profanity and uses vocabulary checks, not readability formulae', () => {
    expect(lintClue({...clue(),answer:'ANGEL',text:'A messenger from God.'},['A','messenger','from','God'])).toEqual([]);
  });
});

describe('blind review transport, reconciliation and no fabricated approvals', () => {
  it('prepares 250 genuine blind projections and an unapproved reconcile sheet', () => {
    const input=Array.from({length:250},(_,i)=>({...clue(i),approval:'injected-do-not-disclose'}));
    const prepared=prepareBatch(input,options);
    expect(prepared.packets[0].items).toHaveLength(250);
    expect(prepared.packets[0].items.map((x: any)=>x.id)).not.toEqual(prepared.packets[1].items.map((x: any)=>x.id));
    for (const packet of prepared.packets) {
      expect(JSON.stringify(packet)).not.toContain('injected-do-not-disclose');
      expect(Object.keys(packet.items[0]).sort()).toEqual(['answer','id','meaning','text','tier']);
    }
    expect(prepared.receipt.clueReviewIds).toEqual([]);
    expect(prepared.sheet.rows.every((r: any)=>r.leadDecision===null && r.reviewerA===null)).toBe(true);
  });
  it('runs fixture-only reviews and reconciliation end to end without shipping evidence', () => {
    const prepared=prepareBatch(Array.from({length:250},(_,i)=>clue(i)),options);
    const a=reviewed(prepared.packets[0],'openai'), b=reviewed(prepared.packets[1],'anthropic','call');
    const sheet=reconcile(prepared,a,b);
    expect(sheet.metrics).toMatchObject({count:250,disagreements:250,disagreementRate:1,reviewerSeconds:[60,60],leadSeconds:null});
    expect(sheet.rows.every((r: any)=>r.leadDecision===null)).toBe(true);
    expect(()=>requireShippingReview(clue(),{prepared,reviews:[a,b]})).toThrow('real review evidence');
  });
  it('rejects a packet that no longer projects the original batch content', () => {
    const prepared=prepareBatch([clue()],options);
    prepared.packets[0].items[0].text='Changed text that was never the selected clue.';
    const a=reviewed(prepared.packets[0],'openai'),b=reviewed(prepared.packets[1],'anthropic');
    expect(()=>reconcile(prepared,a,b)).toThrow('projection');
  });
  it('accepts two different models from one family (Leon, 13 Nov 2026) and rejects the same model twice', () => {
    const prepared=prepareBatch([clue()],options), [pa,pb]=prepared.packets;
    const a=reviewed(pa,'openai','keep','TEST-ONLY-model-1'), b=reviewed(pb,'openai','keep','TEST-ONLY-model-2');
    expect(()=>reconcile(prepared,a,b)).not.toThrow();
    expect(()=>reconcile(prepared,a,reviewed(pb,'openai','keep','TEST-ONLY-model-1'))).toThrow('independent');
  });
  it('fails partial, duplicate, stale, same-model, edited and transcript-free results', () => {
    const prepared=prepareBatch([clue()],options), [pa,pb]=prepared.packets;
    const a=reviewed(pa,'openai'), b=reviewed(pb,'anthropic');
    expect(()=>validateReview(pa,{...a,items:[]},a.transcriptSha256)).toThrow('Empty/duplicate IDs');
    expect(()=>validateReview(pa,{...a,items:[...a.items,...a.items]},a.transcriptSha256)).toThrow('Empty/duplicate IDs');
    expect(()=>validateReview(pa,{...a,packetSha256:'f'.repeat(64)},a.transcriptSha256)).toThrow('stale');
    expect(()=>validateReview(pa,a,'f'.repeat(64))).toThrow('transcript');
    const sameModel={...b,reviewer:{...b.reviewer,family:'openai',model:a.reviewer.model}};
    const {id:_id,elapsedSeconds:_elapsed,...raw}=sameModel;
    expect(()=>reconcile(prepared,a,{...raw,id:digest(raw),elapsedSeconds:60})).toThrow('independent');
    expect(()=>reconcile(prepared,a,{...b,items:[{...b.items[0],verdict:'reject'}]})).toThrow('integrity');
  });
});

describe('private data stays outside app and source exports', () => {
  it('rejects a newly staged word bank without detached evidence', () => {
    const dir=mkdtempSync(join(tmpdir(),'li-word-admission-'));
    try {
      mkdirSync(join(dir,'content/words/banks'),{recursive:true});
      writeFileSync(join(dir,'content/words/banks/unreviewed.json'),'{}');
      expect(()=>checkShippingTree(dir,undefined)).toThrow('manifest');
    } finally {rmSync(dir,{recursive:true,force:true});}
  });
  it('gates actual app dependencies and any shipped word bank in normal CI', () => {
    expect(checkShippingTree(process.cwd(),process.env.LITTLE_ISLAND_WORD_RECEIPTS).passed).toBe(true);
  });
  it('rejects scan data and hashes in bundles; harmless output passes', () => {
    const dir=mkdtempSync(join(tmpdir(),'li-word-guard-'));
    try {
      writeFileSync(join(dir,'app.js'),'const greeting = "Hello";');
      expect(guardTree(dir,policy,[],{sourceRoot:dir}).passed).toBe(true);
      writeFileSync(join(dir,'leak.json'),JSON.stringify(policy.scan));
      expect(()=>guardTree(dir,policy,[],{sourceRoot:dir})).toThrow('leaked');
      writeFileSync(join(dir,'leak.json'),digest([...policy.scan].sort()));
      expect(()=>guardTree(dir,policy,[],{sourceRoot:dir})).toThrow('leaked');
    } finally { rmSync(dir,{recursive:true,force:true}); }
  });
  it('refuses private CLI output inside the repository', () => {
    const result=spawnSync('node',['scripts/words/cli.mjs','prepare','not-read.json','not-read-policy.json','content/words/private','test'],{encoding:'utf8'});
    expect(result.status).toBe(1);expect(result.stderr).toContain('outside the app repository');
  });
});
